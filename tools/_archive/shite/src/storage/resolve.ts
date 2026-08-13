/**
 * @module @sharpee/zifmia/storage/resolve
 * @purpose Build the configured `StorageAdapter` from environment variables.
 *   Centralizes the "SQLite default, Postgres when ZIFMIA_DB_URL is set"
 *   selection logic per ADR-175 §Decision 7.
 * @owner Zifmia server (tools/zifmia/storage).
 */

import type { StorageAdapter } from './adapter';
import { PostgresAdapter } from './postgres/postgres-adapter';
import { SqliteAdapter } from './sqlite/sqlite-adapter';

/**
 * Pick the adapter based on env. Postgres if `ZIFMIA_DB_URL` is set;
 * SQLite otherwise (path from `ZIFMIA_SQLITE_PATH`, default
 * `./data/zifmia.db`).
 */
export function resolveAdapterFromEnv(
  env: NodeJS.ProcessEnv
): StorageAdapter {
  const pgUrl = env.ZIFMIA_DB_URL;
  if (pgUrl && pgUrl.length > 0) {
    return new PostgresAdapter({ url: pgUrl });
  }
  const filename = env.ZIFMIA_SQLITE_PATH ?? './data/zifmia.db';
  return new SqliteAdapter({ filename });
}
