import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { DatabaseService } from '../database/database.service';
import {
  COURT_PHOTO_TYPES,
  MAX_COURT_PHOTO_BYTES,
  MAX_COURT_PHOTOS,
  type CreateCourtPhotoUploadDto,
} from './create-court-photo-upload.dto';
import { CourtPhotoStorageService } from './court-photo-storage.service';

interface CourtPhotoRow extends QueryResultRow {
  id: string;
  courtId: string;
  storageKey: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
}

const extensions: Record<(typeof COURT_PHOTO_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class CourtPhotosService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: CourtPhotoStorageService,
  ) {}

  async createUploadUrl(
    userId: string,
    centerId: string,
    courtId: string,
    input: CreateCourtPhotoUploadDto,
  ) {
    if (
      !COURT_PHOTO_TYPES.includes(input.contentType) ||
      input.byteSize <= 0 ||
      input.byteSize > MAX_COURT_PHOTO_BYTES
    ) {
      throw new BadRequestException(
        'Usa una foto JPG, PNG o WebP de hasta 5 MB.',
      );
    }

    await this.assertManagedCourt(userId, centerId, courtId);
    await this.cleanupExpiredPending(userId, centerId, courtId);

    const id = randomUUID();
    const storageKey = `courts/${courtId}/${id}.${extensions[input.contentType]}`;
    const uploadForm = await this.storage.createUploadForm(
      storageKey,
      input.contentType,
      input.byteSize,
    );

    await this.database.transaction(async (client) => {
      const court = await client.query(
        `SELECT court."id"
         FROM "court" court
         JOIN "centerManager" manager ON manager."centerId" = court."centerId"
         WHERE court."id" = $3 AND court."centerId" = $2
           AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         FOR UPDATE OF court`,
        [userId, centerId, courtId],
      );
      if (!court.rowCount) {
        throw new ForbiddenException('No tienes acceso a esta cancha.');
      }

      const count = await client.query(
        `SELECT COUNT(*)::int AS "count"
         FROM "courtPhoto"
         WHERE "courtId" = $1
           AND ("status" = 'PUBLISHED'
             OR ("status" = 'PENDING' AND "createdAt" >= NOW() - INTERVAL '15 minutes'))`,
        [courtId],
      );
      if (Number(count.rows[0].count) >= MAX_COURT_PHOTOS) {
        throw new BadRequestException('Una cancha puede tener hasta 8 fotos.');
      }

      await client.query(
        `INSERT INTO "courtPhoto"
           ("id", "courtId", "storageKey", "contentType", "byteSize", "status", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())`,
        [id, courtId, storageKey, input.contentType, input.byteSize],
      );
    });

    return { id, ...uploadForm };
  }

  async completeUpload(
    userId: string,
    centerId: string,
    courtId: string,
    photoId: string,
  ) {
    const photo = await this.findManagedPhoto(
      userId,
      centerId,
      courtId,
      photoId,
      'PENDING',
    );
    const uploaded = await this.storage.verifyUpload(photo.storageKey);
    if (
      uploaded.byteSize !== photo.byteSize ||
      uploaded.contentType !== photo.contentType ||
      !this.hasValidSignature(uploaded.signature, photo.contentType)
    ) {
      await this.storage.delete(photo.storageKey);
      await this.database.query(
        `DELETE FROM "courtPhoto" photo
         WHERE photo."id" = $4 AND photo."courtId" = $3
           AND photo."status" = 'PENDING'
           AND EXISTS (
             SELECT 1 FROM "court" court
             JOIN "centerManager" manager ON manager."centerId" = court."centerId"
             WHERE court."id" = photo."courtId" AND court."centerId" = $2
               AND manager."userId" = $1 AND manager."revokedAt" IS NULL
           )`,
        [userId, centerId, courtId, photoId],
      );
      throw new BadRequestException(
        'El archivo no coincide con el formato o tamaño declarado. Vuelve a seleccionarlo.',
      );
    }

    const result = await this.database.query(
      `UPDATE "courtPhoto" photo
       SET "status" = 'PUBLISHED'
       WHERE photo."id" = $4 AND photo."courtId" = $3
         AND photo."status" = 'PENDING'
         AND EXISTS (
           SELECT 1 FROM "court" court
           JOIN "centerManager" manager ON manager."centerId" = court."centerId"
           WHERE court."id" = photo."courtId" AND court."centerId" = $2
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )
       RETURNING photo."id", photo."courtId", photo."storageKey",
                 photo."contentType", photo."byteSize", photo."createdAt"`,
      [userId, centerId, courtId, photoId],
    );
    if (!result.rowCount)
      throw new NotFoundException('No encontramos esa foto pendiente.');
    return this.toResponse(result.rows[0] as CourtPhotoRow);
  }

  async listManaged(userId: string, centerId: string, courtId: string) {
    await this.assertManagedCourt(userId, centerId, courtId);
    const result = await this.database.query<CourtPhotoRow>(
      `SELECT photo."id", photo."courtId", photo."storageKey",
              photo."contentType", photo."byteSize", photo."createdAt"
       FROM "courtPhoto" photo
       WHERE photo."courtId" = $1 AND photo."status" = 'PUBLISHED'
       ORDER BY photo."createdAt"`,
      [courtId],
    );
    return { photos: result.rows.map((photo) => this.toResponse(photo)) };
  }

  async listPublic(centerId: string, courtId: string) {
    const result = await this.database.query<CourtPhotoRow>(
      `SELECT photo."id", photo."courtId", photo."storageKey",
              photo."contentType", photo."byteSize", photo."createdAt"
       FROM "courtPhoto" photo
       JOIN "court" court ON court."id" = photo."courtId"
       WHERE court."id" = $2 AND court."centerId" = $1
         AND court."status"::text = 'ENABLED'
         AND court."publicationStatus"::text = 'PUBLISHED'
         AND photo."status" = 'PUBLISHED'
       ORDER BY photo."createdAt"`,
      [centerId, courtId],
    );
    return { photos: result.rows.map((photo) => this.toResponse(photo)) };
  }

  async delete(
    userId: string,
    centerId: string,
    courtId: string,
    photoId: string,
  ) {
    const photo = await this.findManagedPhoto(
      userId,
      centerId,
      courtId,
      photoId,
    );
    await this.storage.delete(photo.storageKey);
    const result = await this.database.query(
      `DELETE FROM "courtPhoto" photo
       WHERE photo."id" = $4 AND photo."courtId" = $3
         AND EXISTS (
           SELECT 1 FROM "court" court
           JOIN "centerManager" manager ON manager."centerId" = court."centerId"
           WHERE court."id" = photo."courtId" AND court."centerId" = $2
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )`,
      [userId, centerId, courtId, photoId],
    );
    if (!result.rowCount)
      throw new NotFoundException('No encontramos esa foto en esta cancha.');
    return { deleted: true };
  }

  private async findManagedPhoto(
    userId: string,
    centerId: string,
    courtId: string,
    photoId: string,
    status?: 'PENDING',
  ): Promise<CourtPhotoRow> {
    const result = await this.database.query<CourtPhotoRow>(
      `SELECT photo."id", photo."courtId", photo."storageKey",
              photo."contentType", photo."byteSize", photo."createdAt"
       FROM "courtPhoto" photo
       JOIN "court" court ON court."id" = photo."courtId"
       WHERE photo."id" = $4 AND photo."courtId" = $3
         AND court."centerId" = $2
         AND ($5::text IS NULL OR photo."status" = $5)
         AND EXISTS (
           SELECT 1 FROM "centerManager" manager
           WHERE manager."centerId" = court."centerId"
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )`,
      [userId, centerId, courtId, photoId, status ?? null],
    );
    const photo = result.rows[0];
    if (!photo)
      throw new NotFoundException('No encontramos esa foto en esta cancha.');
    return photo;
  }

  private async assertManagedCourt(
    userId: string,
    centerId: string,
    courtId: string,
  ) {
    const result = await this.database.query(
      `SELECT 1
       FROM "court" court
       JOIN "centerManager" manager ON manager."centerId" = court."centerId"
       WHERE court."id" = $3 AND court."centerId" = $2
         AND manager."userId" = $1 AND manager."revokedAt" IS NULL
       LIMIT 1`,
      [userId, centerId, courtId],
    );
    if (!result.rowCount)
      throw new NotFoundException('No encontramos esa cancha en este centro.');
  }

  private async cleanupExpiredPending(
    userId: string,
    centerId: string,
    courtId: string,
  ) {
    const result = await this.database.query<CourtPhotoRow>(
      `DELETE FROM "courtPhoto" photo
       USING "court" court
       WHERE photo."courtId" = court."id" AND court."id" = $3
         AND court."centerId" = $2 AND photo."status" = 'PENDING'
         AND photo."createdAt" < NOW() - INTERVAL '15 minutes'
         AND EXISTS (
           SELECT 1 FROM "centerManager" manager
           WHERE manager."centerId" = court."centerId"
             AND manager."userId" = $1 AND manager."revokedAt" IS NULL
         )
       RETURNING photo."id", photo."courtId", photo."storageKey",
                 photo."contentType", photo."byteSize", photo."createdAt"`,
      [userId, centerId, courtId],
    );
    for (const stalePhoto of result.rows)
      await this.storage.delete(stalePhoto.storageKey);
  }

  private hasValidSignature(signature: Buffer, contentType: string): boolean {
    if (contentType === 'image/jpeg') {
      return (
        signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      );
    }
    if (contentType === 'image/png') {
      return signature
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    return (
      contentType === 'image/webp' &&
      signature.toString('ascii', 0, 4) === 'RIFF' &&
      signature.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  private toResponse(photo: CourtPhotoRow) {
    return {
      id: photo.id,
      url: this.storage.publicUrl(photo.storageKey),
      contentType: photo.contentType,
      byteSize: photo.byteSize,
      createdAt: photo.createdAt,
    };
  }
}
