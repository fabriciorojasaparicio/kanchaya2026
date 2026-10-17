#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d20df8b58f1f4fb9829c3607c3f8344c52355a8e419468827e780935110434d9/contract';
import startContract from '../../snapshots/d20df8b58f1f4fb9829c3607c3f8344c52355a8e419468827e780935110434d9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f57b914438db9f6bcc36475d485def756a39c7f6a5469d13758cecd9003b18ae/contract';
import endContract from '../../snapshots/f57b914438db9f6bcc36475d485def756a39c7f6a5469d13758cecd9003b18ae/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'sportsCenter',
        column: col('openingHours', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
