/**
 * @module @sharpee/zifmia/storage/migrate
 * @purpose Single entry point that applies schema migrations to whichever
 *   adapter is configured. The SQLite startup path calls this
 *   automatically; the Postgres operator invokes the matching
 *   `zifmia-migrate` CLI as a documented admin step.
 * @owner Zifmia server (tools/zifmia/storage).
 */

import type { StorageAdapter } from './adapter';

export interface MigrateOptions {
  /** Adapter to migrate. */
  adapter: StorageAdapter;
}

/**
 * Apply pending schema migrations. Idempotent — every DDL statement in
 * the underlying schema is `IF NOT EXISTS`. Returns once the adapter
 * reports success.
 */
export async function migrate(options: MigrateOptions): Promise<void> {
  await options.adapter.migrate();
}
