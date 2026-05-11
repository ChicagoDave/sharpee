#!/usr/bin/env node
/**
 * @module @sharpee/zifmia/storage/migrate-cli
 * @purpose CLI entry point for `zifmia-migrate`. Operators run this as a
 *   one-shot admin step against a Postgres deployment (`docker compose
 *   run zifmia migrate`). For SQLite it's a no-op since the server
 *   auto-migrates on startup, but the same command is safe to run.
 * @owner Zifmia server (tools/zifmia/storage).
 */

import { migrate } from './migrate';
import { resolveAdapterFromEnv } from './resolve';

async function main(): Promise<void> {
  const adapter = resolveAdapterFromEnv(process.env);
  try {
    await migrate({ adapter });
    const desc = adapter.describe();
    process.stdout.write(
      `zifmia-migrate: ${desc.kind} (driver ${desc.driverVersion}) migrated\n`
    );
  } finally {
    await adapter.close();
  }
}

main().catch((err) => {
  process.stderr.write(`zifmia-migrate failed: ${(err as Error).message}\n`);
  process.exit(1);
});
