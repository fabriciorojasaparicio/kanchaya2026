#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1eb113af7417ec8d708c6bb1abcad5f6b71c66bb1870afcf841373bb10e2162f/contract';
import startContract from '../../snapshots/1eb113af7417ec8d708c6bb1abcad5f6b71c66bb1870afcf841373bb10e2162f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/3b4f8dfd956a96cb9fc77b98e5dbc72b66811fbf5762470c57b89e0778b2613e/contract';
import endContract from '../../snapshots/3b4f8dfd956a96cb9fc77b98e5dbc72b66811fbf5762470c57b89e0778b2613e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'courtCharacteristic',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'courtCharacteristicOnCourt',
        columns: [
          col('assignedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('characteristicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('courtId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['courtId', 'characteristicId'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'court',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ENABLED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'court',
        constraint: 'court_status_check_63d6ad0b',
        expression: "\"status\" IN ('ENABLED', 'DISABLED', 'MAINTENANCE')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'courtCharacteristic',
        constraint: 'courtCharacteristic_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'court',
        index: 'court_centerId_status_idx_8f6033a8',
        columns: ['centerId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courtCharacteristicOnCourt',
        index: 'courtCharacteristicOnCourt_characteristicId_idx_dc313dbb',
        columns: ['characteristicId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courtCharacteristicOnCourt',
        index: 'courtCharacteristicOnCourt_courtId_idx_50c15a04',
        columns: ['courtId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'courtCharacteristicOnCourt',
        foreignKey: {
          name: 'courtCharacteristicOnCourt_courtId_fkey',
          columns: ['courtId'],
          references: { schema: 'public', table: 'court', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'courtCharacteristicOnCourt',
        foreignKey: {
          name: 'courtCharacteristicOnCourt_characteristicId_fkey',
          columns: ['characteristicId'],
          references: { schema: 'public', table: 'courtCharacteristic', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
