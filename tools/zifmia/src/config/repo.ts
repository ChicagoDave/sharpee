/**
 * Config repository — operator-scoped key/value store per ADR-177 §6.
 *
 * Public interface: {@link ConfigRepository}, {@link createConfigRepository},
 * {@link CONFIG_KEYS}, {@link DEFAULT_CONFIG}.
 * Owner: zifmia server, config domain.
 *
 * Used for recording_notice (§8), grace_ms (Phase 4 default override),
 * recycle_ms, and similar operator-tunable knobs. The default values
 * are seeded on first boot via `seedDefaults()`; subsequent boots
 * leave existing values alone so operator edits via the CLI tool
 * stick.
 */

import type { ZifmiaDatabase } from '../db/connect.js';
import { DEFAULT_RECORDING_NOTICE } from '../rooms/state-routes.js';

export const CONFIG_KEYS = {
  RECORDING_NOTICE: 'recording_notice'
} as const;

export const DEFAULT_CONFIG: Readonly<Record<string, string>> = Object.freeze({
  [CONFIG_KEYS.RECORDING_NOTICE]: DEFAULT_RECORDING_NOTICE
});

export interface ConfigRepository {
  get(key: string): string | undefined;
  /** Get with a fallback default; useful for read paths that must always succeed. */
  getOr(key: string, fallback: string): string;
  set(key: string, value: string): void;
  /** Insert defaults for any missing key. Idempotent; no UPDATE on existing keys. */
  seedDefaults(defaults?: Readonly<Record<string, string>>): void;
}

export function createConfigRepository(db: ZifmiaDatabase): ConfigRepository {
  const getStmt = db.prepare<[string], { value: string }>(
    `SELECT value FROM config WHERE key = ?`
  );
  const upsertStmt = db.prepare<[string, string]>(
    `INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`
  );
  const insertIfMissingStmt = db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`
  );

  return {
    get(key) {
      return getStmt.get(key)?.value;
    },
    getOr(key, fallback) {
      return getStmt.get(key)?.value ?? fallback;
    },
    set(key, value) {
      upsertStmt.run(key, value);
    },
    seedDefaults(defaults = DEFAULT_CONFIG) {
      for (const [k, v] of Object.entries(defaults)) {
        insertIfMissingStmt.run(k, v);
      }
    }
  };
}
