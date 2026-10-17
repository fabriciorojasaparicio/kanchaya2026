import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  PublicCourtDetail,
  SportsCenterCourt,
  SportsCenterListResponse,
} from './sports-center.types';

interface SportsCenterRow extends QueryResultRow {
  id: string;
  name: string;
  courtCount: number;
  tags: { id: string; name: string }[];
  courts: SportsCenterCourt[];
}

@Injectable()
export class SportsCentersService {
  private readonly featuredOrder: Map<string, number>;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService,
  ) {
    this.featuredOrder = new Map(
      (config.get<string>('FEATURED_SPORTS_CENTER_IDS') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id, index) => [id, index]),
    );
  }

  async list(): Promise<SportsCenterListResponse> {
    const result = await this.database.query<SportsCenterRow>(`
      SELECT center."id", center."name",
             COUNT(court."id")::int AS "courtCount",
             COALESCE((
               SELECT json_agg(json_build_object(
                 'id', tag."id",
                 'name', tag."name"
               ) ORDER BY tag."name")
               FROM "sportsCenterTagOnCenter" assignment
               JOIN "sportsCenterTag" tag ON tag."id" = assignment."tagId"
               WHERE assignment."centerId" = center."id"
                 AND tag."isActive" = TRUE
             ), '[]'::json) AS "tags",
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', court."id",
                   'name', court."name",
                   'hourlyPriceCentimos', court."hourlyPriceCentimos",
                   'openingHours', center."openingHours",
                   'characteristics', COALESCE((
                     SELECT json_agg(characteristic."name" ORDER BY characteristic."name")
                     FROM "courtCharacteristicOnCourt" assignment
                     JOIN "courtCharacteristic" characteristic
                       ON characteristic."id" = assignment."characteristicId"
                     WHERE assignment."courtId" = court."id"
                       AND characteristic."isActive" = TRUE
                   ), '[]'::json)
                 )
                 ORDER BY court."name"
               ) FILTER (WHERE court."id" IS NOT NULL),
               '[]'::json
             ) AS "courts"
      FROM "sportsCenter" center
      LEFT JOIN "court" court
        ON court."centerId" = center."id"
       AND court."status"::text = 'ENABLED'
       AND court."publicationStatus"::text = 'PUBLISHED'
      GROUP BY center."id", center."name"
    `);

    const centers = result.rows
      .map((center) => ({
        id: center.id,
        name: center.name,
        courtCount: Number(center.courtCount),
        courts: center.courts ?? [],
        tags: center.tags ?? [],
        isFeatured: this.featuredOrder.has(center.id),
      }))
      .sort((left, right) => {
        const leftRank = this.featuredOrder.get(left.id);
        const rightRank = this.featuredOrder.get(right.id);
        if (leftRank !== undefined || rightRank !== undefined) {
          if (leftRank === undefined) return 1;
          if (rightRank === undefined) return -1;
          if (leftRank !== rightRank) return leftRank - rightRank;
        }

        return (
          right.courtCount - left.courtCount ||
          left.name.localeCompare(right.name, 'es')
        );
      });

    return { centers };
  }

  async getPublicCourt(
    centerId: string,
    courtId: string,
  ): Promise<PublicCourtDetail> {
    const result = await this.database.query<{
      centerId: string;
      centerName: string;
      court: SportsCenterCourt;
      tags: { id: string; name: string }[];
    }>(
      `SELECT center."id" AS "centerId", center."name" AS "centerName",
              json_build_object(
                'id', court."id",
                'name', court."name",
                'hourlyPriceCentimos', court."hourlyPriceCentimos",
                'openingHours', center."openingHours",
                'characteristics', COALESCE((
                  SELECT json_agg(characteristic."name" ORDER BY characteristic."name")
                  FROM "courtCharacteristicOnCourt" assignment
                  JOIN "courtCharacteristic" characteristic
                    ON characteristic."id" = assignment."characteristicId"
                  WHERE assignment."courtId" = court."id"
                    AND characteristic."isActive" = TRUE
                ), '[]'::json)
              ) AS "court",
              COALESCE((
                SELECT json_agg(json_build_object('id', tag."id", 'name', tag."name") ORDER BY tag."name")
                FROM "sportsCenterTagOnCenter" assignment
                JOIN "sportsCenterTag" tag ON tag."id" = assignment."tagId"
                WHERE assignment."centerId" = center."id" AND tag."isActive" = TRUE
              ), '[]'::json) AS "tags"
       FROM "court" court
       JOIN "sportsCenter" center ON center."id" = court."centerId"
       WHERE center."id" = $1 AND court."id" = $2
         AND court."status"::text = 'ENABLED'
         AND court."publicationStatus"::text = 'PUBLISHED'`,
      [centerId, courtId],
    );
    const listing = result.rows[0];
    if (!listing) {
      throw new NotFoundException('No encontramos esa ficha publicada.');
    }
    return {
      center: {
        id: listing.centerId,
        name: listing.centerName,
        tags: listing.tags,
      },
      court: listing.court,
    };
  }
}
