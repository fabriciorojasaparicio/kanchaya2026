#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d20df8b58f1f4fb9829c3607c3f8344c52355a8e419468827e780935110434d9/contract';
import endContract from '../../snapshots/d20df8b58f1f4fb9829c3607c3f8344c52355a8e419468827e780935110434d9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fc16ce6037dc2f62b4d9ff13847475eb37585fc7c0d2a065dfabec7caf2f0e01/contract';
import startContract from '../../snapshots/fc16ce6037dc2f62b4d9ff13847475eb37585fc7c0d2a065dfabec7caf2f0e01/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'court',
        column: col('hourlyPriceCentimos', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
