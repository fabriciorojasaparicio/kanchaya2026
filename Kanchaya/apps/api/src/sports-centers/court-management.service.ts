import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CourtStatus } from './court-status';
import { SaveCourtDto } from './save-court.dto';
import { DailyOpeningHoursDto } from './update-center-opening-hours.dto';

export interface DailyOpeningHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface ManagedCenterRow extends QueryResultRow {
  id: string;
  name: string;
  openingHours: DailyOpeningHours[] | null;
  tags: ManagedCenterTag[];
  courts: ManagedCourt[];
}

export interface ManagedCourt {
  id: string;
  name: string;
  status: CourtStatus;
  publicationStatus: 'DRAFT' | 'PUBLISHED';
  hourlyPriceCentimos: number | null;
  characteristics: CourtCharacteristic[];
}

export interface ManagedCenterTag extends QueryResultRow {
  id: string;
  name: string;
  isActive: boolean;
}

export interface CourtCharacteristic extends QueryResultRow {
  id: string;
  name: string;
  isActive: boolean;
}

export function validateOpeningHours(hours: DailyOpeningHoursDto[]) {
  const seenDays = new Set<number>();
  for (const entry of hours) {
    if (
      !Number.isInteger(entry.dayOfWeek) ||
      entry.dayOfWeek < 1 ||
      entry.dayOfWeek > 7 ||
      seenDays.has(entry.dayOfWeek)
    ) {
      throw new BadRequestException(
        'Cada día de la semana debe aparecer una sola vez.',
      );
    }
    seenDays.add(entry.dayOfWeek);

    const openMinutes = parseWholeHour(entry.opensAt);
    const closeMinutes = parseWholeHour(entry.closesAt, true);
    if (
      openMinutes === null ||
      closeMinutes === null ||
      closeMinutes - openMinutes < 60
    ) {
      throw new BadRequestException(
        'La hora de cierre debe ser al menos una hora después de la apertura y dentro del mismo día.',
      );
    }
  }
}

function parseWholeHour(value: string, allowEndOfDay = false): number | null {
  if (allowEndOfDay && value === '24:00') return 24 * 60;
  const match = /^(?:([01]\d|2[0-3])):00$/.exec(value);
  return match ? Number(match[1]) * 60 : null;
}

export function hasValidPublishedHours(
  value: unknown,
): value is DailyOpeningHours[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const seenDays = new Set<number>();
  return value.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const hours = entry as Partial<DailyOpeningHours>;
    const dayOfWeek = hours.dayOfWeek;
    if (
      typeof dayOfWeek !== 'number' ||
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 1 ||
      dayOfWeek > 7 ||
      seenDays.has(dayOfWeek) ||
      typeof hours.opensAt !== 'string' ||
      typeof hours.closesAt !== 'string'
    ) {
      return false;
    }
    seenDays.add(dayOfWeek);
    const open = parseWholeHour(hours.opensAt);
    const close = parseWholeHour(hours.closesAt, true);
    return open !== null && close !== null && close - open >= 60;
  });
}

@Injectable()
export class CourtManagementService {
  constructor(private readonly database: DatabaseService) {}

  async listManagedCenters(userId: string) {
    const result = await this.database.query<ManagedCenterRow>(
      `SELECT center."id", center."name", center."openingHours",
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', court."id",
                    'name', court."name",
                    'status', court."status"::text,
                    'publicationStatus', court."publicationStatus"::text,
                    'hourlyPriceCentimos', court."hourlyPriceCentimos",
                    'characteristics', COALESCE((
                      SELECT json_agg(json_build_object(
                        'id', characteristic."id",
                        'name', characteristic."name",
                        'isActive', characteristic."isActive"
                      ) ORDER BY characteristic."name")
                      FROM "courtCharacteristicOnCourt" assignment
                      JOIN "courtCharacteristic" characteristic
                        ON characteristic."id" = assignment."characteristicId"
                      WHERE assignment."courtId" = court."id"
                    ), '[]'::json)
                  ) ORDER BY court."name"
                ) FILTER (WHERE court."id" IS NOT NULL),
                '[]'::json
              ) AS "courts"
              ,COALESCE((
                SELECT json_agg(json_build_object(
                  'id', tag."id",
                  'name', tag."name",
                  'isActive', tag."isActive"
                ) ORDER BY tag."name")
                FROM "sportsCenterTagOnCenter" assignment
                JOIN "sportsCenterTag" tag ON tag."id" = assignment."tagId"
                WHERE assignment."centerId" = center."id"
              ), '[]'::json) AS "tags"
       FROM "centerManager" manager
       JOIN "sportsCenter" center ON center."id" = manager."centerId"
       LEFT JOIN "court" court ON court."centerId" = center."id"
       WHERE manager."userId" = $1 AND manager."revokedAt" IS NULL
       GROUP BY center."id", center."name"
       ORDER BY center."name"`,
      [userId],
    );

    return { centers: result.rows };
  }

  async updateCenterOpeningHours(
    userId: string,
    centerId: string,
    hours: DailyOpeningHoursDto[],
  ) {
    validateOpeningHours(hours);
    const result = await this.database.transaction(async (client) => {
      const center = await client.query(
        `SELECT center."id" FROM "sportsCenter" center
         WHERE center."id" = $2 AND EXISTS (
           SELECT 1 FROM "centerManager" manager
           WHERE manager."centerId" = center."id"
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )
         FOR UPDATE`,
        [userId, centerId],
      );
      if (!center.rowCount) {
        throw new NotFoundException(
          'No encontramos ese centro deportivo entre tus asignaciones activas.',
        );
      }
      if (hours.length === 0) {
        const publishedCourts = await client.query(
          `SELECT 1 FROM "court"
           WHERE "centerId" = $1 AND "publicationStatus"::text = 'PUBLISHED'
           LIMIT 1`,
          [centerId],
        );
        if (publishedCourts.rowCount) {
          throw new ConflictException(
            'Mantén al menos un día abierto mientras haya canchas publicadas.',
          );
        }
      }
      const updated = await client.query<{
        openingHours: DailyOpeningHours[];
      }>(
        `UPDATE "sportsCenter" center
         SET "openingHours" = $3::json, "updatedAt" = NOW()
         WHERE center."id" = $2
           AND EXISTS (
             SELECT 1 FROM "centerManager" manager
             WHERE manager."centerId" = center."id"
               AND manager."userId" = $1 AND manager."revokedAt" IS NULL
           )
         RETURNING center."openingHours"`,
        [userId, centerId, JSON.stringify(hours)],
      );
      if (!updated.rowCount) {
        throw new NotFoundException(
          'No encontramos ese centro deportivo entre tus asignaciones activas.',
        );
      }
      await client.query(
        `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
         VALUES ($1, $2, 'CENTER_OPENING_HOURS_UPDATED', 'SPORTS_CENTER', $3, $4::json, NOW())`,
        [randomUUID(), userId, centerId, JSON.stringify({ hours })],
      );
      return updated.rows[0];
    });
    return result;
  }

  async updateCenterTags(userId: string, centerId: string, tagIds: string[]) {
    if (tagIds.length > 10) {
      throw new BadRequestException('Un centro puede usar hasta 10 etiquetas.');
    }
    return this.database.transaction(async (client) => {
      const center = await client.query(
        `SELECT center."id" FROM "sportsCenter" center
             WHERE center."id" = $2 AND EXISTS (
               SELECT 1 FROM "centerManager" manager
               WHERE manager."centerId" = center."id"
                 AND manager."userId" = $1 AND manager."revokedAt" IS NULL
             )
             FOR UPDATE`,
        [userId, centerId],
      );
      if (!center.rowCount) {
        throw new NotFoundException(
          'No encontramos ese centro deportivo entre tus asignaciones activas.',
        );
      }
      const publishedCourts = await client.query(
        `SELECT 1 FROM "court"
             WHERE "centerId" = $1 AND "publicationStatus"::text = 'PUBLISHED'
             LIMIT 1`,
        [centerId],
      );
      if (publishedCourts.rowCount && tagIds.length === 0) {
        throw new ConflictException(
          'Mantén al menos una etiqueta mientras haya canchas publicadas.',
        );
      }
      await this.validateCenterTags(client, tagIds, centerId);
      await this.replaceCenterTags(client, centerId, tagIds);
      await client.query(
        `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
             VALUES ($1, $2, 'CENTER_TAGS_UPDATED', 'SPORTS_CENTER', $3, $4::json, NOW())`,
        [randomUUID(), userId, centerId, JSON.stringify({ tagIds })],
      );
      return { centerId, tagIds };
    });
  }

  async publishCourt(userId: string, centerId: string, courtId: string) {
    return this.database.transaction(async (client) => {
      const result = await client.query<{
        name: string;
        status: string;
        hourlyPriceCentimos: number | null;
        centerName: string;
        openingHours: unknown;
        photoCount: number;
        tagCount: number;
      }>(
        `SELECT court."name", court."status"::text AS "status",
                    court."hourlyPriceCentimos", center."name" AS "centerName",
                    center."openingHours",
                    (SELECT COUNT(*)::int FROM "courtPhoto" photo
                     WHERE photo."courtId" = court."id" AND photo."status" = 'PUBLISHED') AS "photoCount",
                    (SELECT COUNT(*)::int
                     FROM "sportsCenterTagOnCenter" assignment
                     JOIN "sportsCenterTag" tag ON tag."id" = assignment."tagId"
                     WHERE assignment."centerId" = center."id" AND tag."isActive" = TRUE) AS "tagCount"
             FROM "court" court
             JOIN "sportsCenter" center ON center."id" = court."centerId"
             WHERE court."id" = $3 AND court."centerId" = $2
               AND EXISTS (
                 SELECT 1 FROM "centerManager" manager
                 WHERE manager."centerId" = center."id"
                   AND manager."userId" = $1 AND manager."revokedAt" IS NULL
               )
             FOR UPDATE OF center, court`,
        [userId, centerId, courtId],
      );
      const listing = result.rows[0];
      if (!listing) {
        throw new NotFoundException(
          'No encontramos esa cancha en este centro.',
        );
      }
      const missing: string[] = [];
      if (!listing.centerName.trim())
        missing.push('El centro necesita un nombre.');
      if (!listing.name.trim()) missing.push('La cancha necesita un nombre.');
      if (listing.status !== 'ENABLED')
        missing.push('La cancha debe estar habilitada.');
      if (Number(listing.photoCount) < 1)
        missing.push('Añade al menos una foto publicada.');
      if (
        listing.hourlyPriceCentimos === null ||
        listing.hourlyPriceCentimos <= 0
      ) {
        missing.push('Registra un precio por hora mayor que cero.');
      }
      if (!hasValidPublishedHours(listing.openingHours)) {
        missing.push('Configura al menos un día con horario válido.');
      }
      if (Number(listing.tagCount) < 1) {
        missing.push('Asigna al menos una etiqueta disponible al centro.');
      }
      if (missing.length) {
        throw new BadRequestException({
          message: 'Completa los requisitos antes de publicar esta cancha.',
          requirements: missing,
        });
      }

      await client.query(
        `UPDATE "court" SET "publicationStatus" = 'PUBLISHED', "updatedAt" = NOW()
             WHERE "id" = $1`,
        [courtId],
      );
      await this.writePublicationAudit(
        client,
        userId,
        courtId,
        'COURT_PUBLISHED',
      );
      return { courtId, publicationStatus: 'PUBLISHED' as const };
    });
  }

  async withdrawCourt(userId: string, centerId: string, courtId: string) {
    return this.database.transaction(async (client) => {
      const result = await client.query(
        `UPDATE "court" court
             SET "publicationStatus" = 'DRAFT', "updatedAt" = NOW()
             WHERE court."id" = $3 AND court."centerId" = $2
               AND court."publicationStatus"::text = 'PUBLISHED'
               AND EXISTS (
                 SELECT 1 FROM "centerManager" manager
                 WHERE manager."centerId" = court."centerId"
                   AND manager."userId" = $1 AND manager."revokedAt" IS NULL
               )
             RETURNING court."id"`,
        [userId, centerId, courtId],
      );
      if (!result.rowCount) {
        throw new NotFoundException(
          'No encontramos una ficha publicada de esa cancha en este centro.',
        );
      }
      await this.writePublicationAudit(
        client,
        userId,
        courtId,
        'COURT_WITHDRAWN',
      );
      return { courtId, publicationStatus: 'DRAFT' as const };
    });
  }

  async createCourt(userId: string, centerId: string, input: SaveCourtDto) {
    const courtId = randomUUID();
    await this.database.transaction(async (client) => {
      await this.validateCharacteristics(client, input.characteristicIds, null);
      const inserted = await client.query(
        `INSERT INTO "court" ("id", "centerId", "name", "status", "createdAt", "updatedAt")
         SELECT $3, center."id", $4, $5, NOW(), NOW()
         FROM "sportsCenter" center
         WHERE center."id" = $2
           AND EXISTS (
             SELECT 1 FROM "centerManager" manager
             WHERE manager."centerId" = center."id"
               AND manager."userId" = $1 AND manager."revokedAt" IS NULL
           )`,
        [userId, centerId, courtId, input.name, input.status],
      );
      if (!inserted.rowCount)
        throw new ForbiddenException(
          'No tienes acceso a este centro deportivo.',
        );

      await this.replaceCharacteristics(
        client,
        courtId,
        input.characteristicIds,
      );
      await this.writeCourtAudit(
        client,
        userId,
        'COURT_CREATED',
        courtId,
        input,
      );
    });

    return this.getCourt(userId, centerId, courtId);
  }

  async updateCourt(
    userId: string,
    centerId: string,
    courtId: string,
    input: SaveCourtDto,
  ) {
    await this.database.transaction(async (client) => {
      await this.validateCharacteristics(
        client,
        input.characteristicIds,
        courtId,
      );
      const updated = await client.query(
        `UPDATE "court" court
         SET "name" = $4, "status" = $5, "updatedAt" = NOW()
         WHERE court."id" = $3 AND court."centerId" = $2
           AND EXISTS (
             SELECT 1 FROM "centerManager" manager
             WHERE manager."centerId" = court."centerId"
               AND manager."userId" = $1 AND manager."revokedAt" IS NULL
           )`,
        [userId, centerId, courtId, input.name, input.status],
      );
      if (!updated.rowCount)
        throw new NotFoundException(
          'No encontramos esa cancha en este centro.',
        );

      await this.replaceCharacteristics(
        client,
        courtId,
        input.characteristicIds,
      );
      await this.writeCourtAudit(
        client,
        userId,
        'COURT_UPDATED',
        courtId,
        input,
      );
    });

    return this.getCourt(userId, centerId, courtId);
  }

  async updateCourtPrice(
    userId: string,
    centerId: string,
    courtId: string,
    hourlyPriceCentimos: number,
  ) {
    const result = await this.database.transaction(async (client) => {
      const updated = await client.query<{ hourlyPriceCentimos: number }>(
        `UPDATE "court" court
         SET "hourlyPriceCentimos" = $4, "updatedAt" = NOW()
         WHERE court."id" = $3 AND court."centerId" = $2
           AND EXISTS (
             SELECT 1 FROM "centerManager" manager
             WHERE manager."centerId" = court."centerId"
               AND manager."userId" = $1 AND manager."revokedAt" IS NULL
           )
         RETURNING court."hourlyPriceCentimos"`,
        [userId, centerId, courtId, hourlyPriceCentimos],
      );
      if (!updated.rowCount) {
        throw new NotFoundException(
          'No encontramos esa cancha en este centro.',
        );
      }

      await client.query(
        `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
         VALUES ($1, $2, 'COURT_PRICE_UPDATED', 'COURT', $3, $4::json, NOW())`,
        [
          randomUUID(),
          userId,
          courtId,
          JSON.stringify({ hourlyPriceCentimos }),
        ],
      );
      return updated.rows[0];
    });
    return result;
  }

  async listCharacteristics() {
    const result = await this.database.query<CourtCharacteristic>(
      `SELECT "id", "name", "isActive" FROM "courtCharacteristic" ORDER BY "name"`,
    );
    return { characteristics: result.rows };
  }

  async listSportsCenterTags() {
    const result = await this.database.query<ManagedCenterTag>(
      `SELECT "id", "name", "isActive" FROM "sportsCenterTag" ORDER BY "name"`,
    );
    return { tags: result.rows };
  }

  async createSportsCenterTag(userId: string, name: string) {
    const id = randomUUID();
    return this.database.transaction(async (client) => {
      const result = await client.query<ManagedCenterTag>(
        `INSERT INTO "sportsCenterTag" ("id", "name", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, TRUE, NOW(), NOW())
         ON CONFLICT ("name") DO NOTHING
         RETURNING "id", "name", "isActive"`,
        [id, name],
      );
      if (!result.rowCount) {
        throw new ConflictException('Ya existe una etiqueta con ese nombre.');
      }
      await this.writeCenterTagAudit(
        client,
        userId,
        'SPORTS_CENTER_TAG_CREATED',
        id,
      );
      return result.rows[0];
    });
  }

  async updateSportsCenterTag(
    userId: string,
    id: string,
    name: string,
    isActive: boolean,
  ) {
    return this.database.transaction(async (client) => {
      if (!isActive) {
        const inPublishedCenter = await client.query(
          `SELECT 1 FROM "sportsCenterTagOnCenter" assignment
           JOIN "court" court ON court."centerId" = assignment."centerId"
           WHERE assignment."tagId" = $1
             AND court."publicationStatus"::text = 'PUBLISHED'
           LIMIT 1`,
          [id],
        );
        if (inPublishedCenter.rowCount) {
          throw new ConflictException(
            'No puedes archivar una etiqueta asignada a un centro con canchas publicadas.',
          );
        }
      }
      const result = await client.query<ManagedCenterTag>(
        `UPDATE "sportsCenterTag"
         SET "name" = $2, "isActive" = $3, "updatedAt" = NOW()
         WHERE "id" = $1 AND NOT EXISTS (
           SELECT 1 FROM "sportsCenterTag" duplicate
           WHERE duplicate."name" = $2 AND duplicate."id" <> $1
         )
         RETURNING "id", "name", "isActive"`,
        [id, name, isActive],
      );
      if (!result.rowCount) {
        const existing = await client.query(
          `SELECT 1 FROM "sportsCenterTag" WHERE "id" = $1 LIMIT 1`,
          [id],
        );
        if (!existing.rowCount) {
          throw new NotFoundException('No encontramos esa etiqueta.');
        }
        throw new ConflictException('Ya existe una etiqueta con ese nombre.');
      }
      await this.writeCenterTagAudit(
        client,
        userId,
        'SPORTS_CENTER_TAG_UPDATED',
        id,
      );
      return result.rows[0];
    });
  }

  async createCharacteristic(userId: string, name: string) {
    const id = randomUUID();
    return this.database.transaction(async (client) => {
      const result = await client.query<CourtCharacteristic>(
        `INSERT INTO "courtCharacteristic" ("id", "name", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, TRUE, NOW(), NOW())
         ON CONFLICT ("name") DO NOTHING
         RETURNING "id", "name", "isActive"`,
        [id, name],
      );
      if (!result.rowCount)
        throw new ConflictException(
          'Ya existe una característica con ese nombre.',
        );
      await this.writeCharacteristicAudit(
        client,
        userId,
        'COURT_CHARACTERISTIC_CREATED',
        id,
        ['name'],
      );
      return result.rows[0];
    });
  }

  async updateCharacteristic(
    userId: string,
    id: string,
    name: string,
    isActive: boolean,
  ) {
    return this.database.transaction(async (client) => {
      const result = await client.query<CourtCharacteristic>(
        `UPDATE "courtCharacteristic"
         SET "name" = $2, "isActive" = $3, "updatedAt" = NOW()
         WHERE "id" = $1 AND NOT EXISTS (
           SELECT 1 FROM "courtCharacteristic" duplicate
           WHERE duplicate."name" = $2 AND duplicate."id" <> $1
         )
         RETURNING "id", "name", "isActive"`,
        [id, name, isActive],
      );
      if (!result.rowCount) {
        const existing = await client.query(
          `SELECT 1 FROM "courtCharacteristic" WHERE "id" = $1 LIMIT 1`,
          [id],
        );
        if (!existing.rowCount)
          throw new NotFoundException('No encontramos esa característica.');
        throw new ConflictException(
          'Ya existe una característica con ese nombre.',
        );
      }
      await this.writeCharacteristicAudit(
        client,
        userId,
        'COURT_CHARACTERISTIC_UPDATED',
        id,
        ['name', 'isActive'],
      );
      return result.rows[0];
    });
  }

  private async getCourt(userId: string, centerId: string, courtId: string) {
    const result = await this.database.query<ManagedCenterRow>(
      `SELECT center."id", center."name",
              json_build_array(json_build_object(
                'id', court."id",
                'name', court."name",
                'status', court."status"::text,
                'publicationStatus', court."publicationStatus"::text,
                'hourlyPriceCentimos', court."hourlyPriceCentimos",
                'characteristics', COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', characteristic."id",
                    'name', characteristic."name",
                    'isActive', characteristic."isActive"
                  ) ORDER BY characteristic."name")
                  FROM "courtCharacteristicOnCourt" assignment
                  JOIN "courtCharacteristic" characteristic
                    ON characteristic."id" = assignment."characteristicId"
                  WHERE assignment."courtId" = court."id"
                ), '[]'::json)
              )) AS "courts"
       FROM "court" court
       JOIN "sportsCenter" center ON center."id" = court."centerId"
       WHERE court."id" = $3 AND center."id" = $2
         AND EXISTS (
           SELECT 1 FROM "centerManager" manager
           WHERE manager."centerId" = center."id"
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )`,
      [userId, centerId, courtId],
    );
    const record = result.rows[0];
    const court = record?.courts[0];
    if (!record || !court)
      throw new NotFoundException('No encontramos esa cancha en este centro.');
    return { centerId: record.id, court };
  }

  private async validateCharacteristics(
    client: PoolClient,
    ids: string[],
    courtId: string | null,
  ) {
    if (ids.length === 0) return;
    const result = await client.query(
      `SELECT characteristic."id"
       FROM "courtCharacteristic" characteristic
       WHERE characteristic."id" = ANY($1::text[])
         AND (
           characteristic."isActive" = TRUE
           OR ($2::text IS NOT NULL AND EXISTS (
             SELECT 1 FROM "courtCharacteristicOnCourt" assignment
             WHERE assignment."courtId" = $2
               AND assignment."characteristicId" = characteristic."id"
           ))
         )`,
      [ids, courtId],
    );
    if (result.rowCount !== ids.length) {
      throw new ConflictException(
        'Una característica ya no está disponible. Actualiza la selección e inténtalo de nuevo.',
      );
    }
  }

  private async validateCenterTags(
    client: PoolClient,
    ids: string[],
    centerId: string,
  ) {
    if (ids.length === 0) return;
    const result = await client.query(
      `SELECT tag."id" FROM "sportsCenterTag" tag
       WHERE tag."id" = ANY($1::text[])
         AND (
           tag."isActive" = TRUE
           OR EXISTS (
             SELECT 1 FROM "sportsCenterTagOnCenter" assignment
             WHERE assignment."centerId" = $2
               AND assignment."tagId" = tag."id"
           )
         )`,
      [ids, centerId],
    );
    if (result.rowCount !== ids.length) {
      throw new ConflictException(
        'Una etiqueta ya no está disponible. Actualiza la selección e inténtalo de nuevo.',
      );
    }
  }

  private async replaceCenterTags(
    client: PoolClient,
    centerId: string,
    ids: string[],
  ) {
    await client.query(
      `DELETE FROM "sportsCenterTagOnCenter" WHERE "centerId" = $1`,
      [centerId],
    );
    if (!ids.length) return;
    await client.query(
      `INSERT INTO "sportsCenterTagOnCenter" ("centerId", "tagId", "assignedAt")
       SELECT $1, selected."id", NOW() FROM UNNEST($2::text[]) AS selected("id")`,
      [centerId, ids],
    );
  }

  private async replaceCharacteristics(
    client: PoolClient,
    courtId: string,
    ids: string[],
  ) {
    await client.query(
      `DELETE FROM "courtCharacteristicOnCourt" WHERE "courtId" = $1`,
      [courtId],
    );
    if (ids.length === 0) return;
    await client.query(
      `INSERT INTO "courtCharacteristicOnCourt" ("courtId", "characteristicId", "assignedAt")
       SELECT $1, selected."id", NOW() FROM UNNEST($2::text[]) AS selected("id")`,
      [courtId, ids],
    );
  }

  private async writeCourtAudit(
    client: PoolClient,
    userId: string,
    action: string,
    courtId: string,
    input: SaveCourtDto,
  ) {
    await client.query(
      `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, $2, $3, 'COURT', $4, $5::json, NOW())`,
      [
        randomUUID(),
        userId,
        action,
        courtId,
        JSON.stringify({
          status: input.status,
          characteristicIds: input.characteristicIds,
        }),
      ],
    );
  }

  private async writeCharacteristicAudit(
    client: PoolClient,
    userId: string,
    action: string,
    id: string,
    fields: string[],
  ) {
    await client.query(
      `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, $2, $3, 'COURT_CHARACTERISTIC', $4, $5::json, NOW())`,
      [randomUUID(), userId, action, id, JSON.stringify({ fields })],
    );
  }

  private async writePublicationAudit(
    client: PoolClient,
    userId: string,
    courtId: string,
    action: 'COURT_PUBLISHED' | 'COURT_WITHDRAWN',
  ) {
    await client.query(
      `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, $2, $3, 'COURT', $4, '{}'::json, NOW())`,
      [randomUUID(), userId, action, courtId],
    );
  }

  private async writeCenterTagAudit(
    client: PoolClient,
    userId: string,
    action: 'SPORTS_CENTER_TAG_CREATED' | 'SPORTS_CENTER_TAG_UPDATED',
    tagId: string,
  ) {
    await client.query(
      `INSERT INTO "auditLog" ("id", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, $2, $3, 'SPORTS_CENTER_TAG', $4, '{}'::json, NOW())`,
      [randomUUID(), userId, action, tagId],
    );
  }
}
