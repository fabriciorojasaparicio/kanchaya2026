#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3b4f8dfd956a96cb9fc77b98e5dbc72b66811fbf5762470c57b89e0778b2613e/contract';
import startContract from '../../snapshots/3b4f8dfd956a96cb9fc77b98e5dbc72b66811fbf5762470c57b89e0778b2613e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fc16ce6037dc2f62b4d9ff13847475eb37585fc7c0d2a065dfabec7caf2f0e01/contract';
import endContract from '../../snapshots/fc16ce6037dc2f62b4d9ff13847475eb37585fc7c0d2a065dfabec7caf2f0e01/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'courtPhoto',
        columns: [
          col('byteSize', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('courtId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storageKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'courtPhoto_status_check_eb00dcf8',
            "\"status\" IN ('PENDING', 'PUBLISHED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'courtPhoto',
        constraint: 'courtPhoto_storageKey_key',
        columns: ['storageKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courtPhoto',
        index: 'courtPhoto_courtId_idx_50c15a04',
        columns: ['courtId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courtPhoto',
        index: 'courtPhoto_courtId_status_idx_d3d75f6e',
        columns: ['courtId', 'status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'courtPhoto',
        foreignKey: {
          name: 'courtPhoto_courtId_fkey',
          columns: ['courtId'],
          references: { schema: 'public', table: 'court', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
