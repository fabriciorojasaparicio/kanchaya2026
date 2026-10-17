#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/169bb8f644ee6c7c6c675d574c5ce44f6a68f7c784505b5ae0d6edb354c31df1/contract';
import endContract from '../../snapshots/169bb8f644ee6c7c6c675d574c5ce44f6a68f7c784505b5ae0d6edb354c31df1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f57b914438db9f6bcc36475d485def756a39c7f6a5469d13758cecd9003b18ae/contract';
import startContract from '../../snapshots/f57b914438db9f6bcc36475d485def756a39c7f6a5469d13758cecd9003b18ae/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, raw, contract } = postgres<End>({ contractJson: endContract });
const legacyTagId = '00000000-0000-4000-8000-000000000001';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'sportsCenterTag',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        columns: [
          col('assignedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('centerId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tagId', 'text', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [primaryKey(['centerId', 'tagId'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'court',
        column: col('publicationStatus', 'text', {
          notNull: true,
          default: lit('DRAFT'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'court',
        constraint: 'court_publicationStatus_check_a79125dd',
        expression: "\"publicationStatus\" IN ('DRAFT', 'PUBLISHED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'sportsCenterTag',
        constraint: 'sportsCenterTag_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        index: 'sportsCenterTagOnCenter_centerId_idx_57ced294',
        columns: ['centerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        index: 'sportsCenterTagOnCenter_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        foreignKey: {
          name: 'sportsCenterTagOnCenter_centerId_fkey',
          columns: ['centerId'],
          references: {
            schema: 'public',
            table: 'sportsCenter',
            columns: ['id'],
          },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        foreignKey: {
          name: 'sportsCenterTagOnCenter_tagId_fkey',
          columns: ['tagId'],
          references: {
            schema: 'public',
            table: 'sportsCenterTag',
            columns: ['id'],
          },
        },
      }),
      this.dataTransform(contract, 'preserve-existing-court-listings', {
        check: () =>
          raw.sql`SELECT "id" FROM "public"."court"
            WHERE "status" = 'ENABLED' AND "publicationStatus" <> 'PUBLISHED'
            LIMIT 1`
            .returnsRow({ id: db.public.court.columns.id })
            .build(),
        run: () =>
          raw.sql`UPDATE "public"."court"
            SET "publicationStatus" = 'PUBLISHED'
            WHERE "status" = 'ENABLED' AND "publicationStatus" <> 'PUBLISHED'`
            .affectedCount()
            .build(),
      }),
      this.dataTransform(contract, 'create-legacy-center-tag', {
        check: () =>
          raw.sql`SELECT "id" FROM "public"."sportsCenterTag"
            WHERE "id" = ${legacyTagId} LIMIT 1`
            .returnsRow({ id: db.public.sportsCenterTag.columns.id })
            .build(),
        run: () =>
          raw.sql`INSERT INTO "public"."sportsCenterTag"
            ("id", "name", "isActive", "createdAt", "updatedAt")
            VALUES (${legacyTagId}, 'Centro deportivo', TRUE, NOW(), NOW())
            ON CONFLICT ("name") DO NOTHING`
            .affectedCount()
            .build(),
      }),
      this.dataTransform(contract, 'assign-legacy-center-tag', {
        check: () =>
          raw.sql`SELECT center."id"
            FROM "public"."sportsCenter" center
            WHERE EXISTS (
              SELECT 1 FROM "public"."court" court
              WHERE court."centerId" = center."id"
                AND court."status" = 'ENABLED'
                AND court."publicationStatus" = 'PUBLISHED'
            )
            AND NOT EXISTS (
              SELECT 1 FROM "public"."sportsCenterTagOnCenter" assignment
              WHERE assignment."centerId" = center."id"
                AND assignment."tagId" = ${legacyTagId}
            )
            LIMIT 1`
            .returnsRow({ id: db.public.sportsCenter.columns.id })
            .build(),
        run: () =>
          raw.sql`INSERT INTO "public"."sportsCenterTagOnCenter"
            ("centerId", "tagId", "assignedAt")
            SELECT center."id", ${legacyTagId}, NOW()
            FROM "public"."sportsCenter" center
            WHERE EXISTS (
              SELECT 1 FROM "public"."court" court
              WHERE court."centerId" = center."id"
                AND court."status" = 'ENABLED'
                AND court."publicationStatus" = 'PUBLISHED'
            )
            ON CONFLICT ("centerId", "tagId") DO NOTHING`
            .affectedCount()
            .build(),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
