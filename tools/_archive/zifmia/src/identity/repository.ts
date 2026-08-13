/**
 * Identity repository — the only writer to the `identities` table.
 *
 * Public interface: {@link IdentityRepository}, {@link createIdentityRepository}.
 * Owner: zifmia server, single-process. SQLite is the canonical store.
 *
 * Contract per ADR-177 §5 (and ADR-161 amended):
 *   - Identity row is `(id, handle, is_admin, created_at)`.
 *   - Handle is the entire credential — no tokens, no hashes.
 *   - Uniqueness is case-insensitive (handled by the schema's COLLATE
 *     NOCASE unique index); display case is preserved as typed.
 *   - Erase is hard-delete; FK CASCADE removes participant rows in
 *     later phases. Erase is idempotent on unknown handles.
 */

import { randomUUID } from 'node:crypto';
import type { ZifmiaDatabase } from '../db/connect.js';
import type { Identity, IdentityError } from './types.js';
import { validateHandle } from './validation.js';

export type CreateIdentityResult =
  | { ok: true; identity: Identity }
  | { ok: false; error: Extract<IdentityError, 'invalid_handle' | 'handle_taken'> };

export type EraseIdentityResult =
  | { ok: true; erased: boolean };

export interface IdentityRepository {
  /**
   * Insert a new identity for `rawHandle`. Returns the inserted row on
   * success, or a structured error on validation failure or
   * case-insensitive collision.
   */
  createIdentity(rawHandle: unknown): CreateIdentityResult;

  /**
   * Hard-delete the identity matching `rawHandle` (case-insensitive).
   * Returns `{ ok: true, erased: false }` when no row matched. CASCADE
   * removes participant rows in later phases.
   */
  eraseIdentity(rawHandle: unknown): EraseIdentityResult;

  /**
   * Look up an identity by handle (case-insensitive). Returns
   * `undefined` when not found. Read-only; no side effects.
   */
  getByHandle(rawHandle: unknown): Identity | undefined;
}

export interface RepositoryOptions {
  /** Wall-clock injection (test fixtures pin time). */
  now?: () => number;
  /** UUID-factory injection (test fixtures pin ids). */
  idFactory?: () => string;
}

interface IdentityRow {
  id: string;
  handle: string;
  is_admin: number;
  created_at: number;
}

function rowToIdentity(row: IdentityRow): Identity {
  return {
    id: row.id,
    handle: row.handle,
    is_admin: row.is_admin === 1,
    created_at: row.created_at
  };
}

/**
 * Construct an IdentityRepository bound to a database handle.
 *
 * @param db Open zifmia database (schema v1 already applied).
 * @param options Test-fixture injections for clock and id generator.
 */
export function createIdentityRepository(
  db: ZifmiaDatabase,
  options: RepositoryOptions = {}
): IdentityRepository {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;

  const insertStmt = db.prepare<
    [string, string, number, number]
  >(`INSERT INTO identities (id, handle, is_admin, created_at) VALUES (?, ?, ?, ?)`);

  const selectByHandleStmt = db.prepare<[string], IdentityRow>(
    `SELECT id, handle, is_admin, created_at FROM identities WHERE handle = ? COLLATE NOCASE`
  );

  const deleteByHandleStmt = db.prepare<[string]>(
    `DELETE FROM identities WHERE handle = ? COLLATE NOCASE`
  );

  return {
    createIdentity(rawHandle) {
      const v = validateHandle(rawHandle);
      if (!v.ok) return { ok: false, error: 'invalid_handle' };

      const existing = selectByHandleStmt.get(v.value);
      if (existing) return { ok: false, error: 'handle_taken' };

      const id = idFactory();
      const createdAt = now();
      try {
        insertStmt.run(id, v.value, 0, createdAt);
      } catch (err) {
        // Concurrent insert that lost the uniqueness race. The COLLATE
        // NOCASE unique index makes this an idempotent re-check.
        if (err instanceof Error && /UNIQUE/i.test(err.message)) {
          return { ok: false, error: 'handle_taken' };
        }
        throw err;
      }

      return {
        ok: true,
        identity: {
          id,
          handle: v.value,
          is_admin: false,
          created_at: createdAt
        }
      };
    },

    eraseIdentity(rawHandle) {
      const v = validateHandle(rawHandle);
      // Invalid handles cannot match any row; treat as idempotent
      // "nothing to erase". Surfaces as HTTP 200 with `erased: false`.
      if (!v.ok) return { ok: true, erased: false };

      const result = deleteByHandleStmt.run(v.value);
      return { ok: true, erased: result.changes > 0 };
    },

    getByHandle(rawHandle) {
      const v = validateHandle(rawHandle);
      if (!v.ok) return undefined;
      const row = selectByHandleStmt.get(v.value);
      return row ? rowToIdentity(row) : undefined;
    }
  };
}
