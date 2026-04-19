/**
 * Config repository — string key/value store for operator-visible runtime state.
 *
 * Public interface: {@link ConfigRepository}, {@link createConfigRepository}.
 * Bounded context: persistence layer. Used for state that must survive
 * restart but isn't operator YAML (e.g., recycle sweeper cursor, runtime
 * feature flags).
 */

import type { Database, Statement } from 'better-sqlite3';

export interface ConfigRepository {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function createConfigRepository(db: Database): ConfigRepository {
  const selectByKey: Statement = db.prepare(`SELECT value FROM config WHERE key = ?`);
  const upsert: Statement = db.prepare(`
    INSERT INTO config (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  return {
    get(key) {
      const row = selectByKey.get(key) as { value: string } | undefined;
      return row ? row.value : null;
    },
    set(key, value) {
      upsert.run(key, value);
    },
  };
}
