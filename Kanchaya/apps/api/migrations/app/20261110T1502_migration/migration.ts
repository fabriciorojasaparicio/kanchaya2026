#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/169bb8f644ee6c7c6c675d574c5ce44f6a68f7c784505b5ae0d6edb354c31df1/contract';
import endContract from '../../snapshots/169bb8f644ee6c7c6c675d574c5ce44f6a68f7c784505b5ae0d6edb354c31df1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/1eb113af7417ec8d708c6bb1abcad5f6b71c66bb1870afcf841373bb10e2162f/contract';
import startContract from '../../snapshots/1eb113af7417ec8d708c6bb1abcad5f6b71c66bb1870afcf841373bb10e2162f/contract.json' with { type: 'json' };
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
      this.createTable({
        schema: 'public',
        table: 'sportsCenterTag',
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
        table: 'sportsCenterTagOnCenter',
        columns: [
          col('assignedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('centerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['centerId', 'tagId'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'court',
        column: col('hourlyPriceCentimos', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
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
      this.addColumn({
        schema: 'public',
        table: 'court',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ENABLED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sportsCenter',
        column: col('openingHours', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'court',
        constraint: 'court_publicationStatus_check_a79125dd',
        expression: "\"publicationStatus\" IN ('DRAFT', 'PUBLISHED')",
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
      this.addUnique({
        schema: 'public',
        table: 'courtPhoto',
        constraint: 'courtPhoto_storageKey_key',
        columns: ['storageKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sportsCenterTag',
        constraint: 'sportsCenterTag_name_key',
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
      this.addForeignKey({
        schema: 'public',
        table: 'courtPhoto',
        foreignKey: {
          name: 'courtPhoto_courtId_fkey',
          columns: ['courtId'],
          references: { schema: 'public', table: 'court', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        foreignKey: {
          name: 'sportsCenterTagOnCenter_centerId_fkey',
          columns: ['centerId'],
          references: { schema: 'public', table: 'sportsCenter', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sportsCenterTagOnCenter',
        foreignKey: {
          name: 'sportsCenterTagOnCenter_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'sportsCenterTag', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
