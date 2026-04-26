/**
 * Identities repository — persistent user identity per ADR-161.
 *
 * Public interface: {@link IdentitiesRepository}, {@link createIdentitiesRepository}.
 * Bounded context: persistence layer.
 *
 * The `identities` table is a stable interface for admin tooling. New
 * columns may be added; existing columns must not be renamed or have
 * semantics shifted without updating admin tooling in the same change.
 *
 * The `passcode_hash` is never returned through the domain `Identity`
 * shape — the HashService layer performs verification by reading the hash
 * via `findHashByHandle` and comparing against the plaintext supplied by
 * the client. `findHashByHandle` is the only auth surface that exposes
 * the hash, by design.
 *
 * Erase is hard-delete (no `deleted_at` soft-delete column). Calling
 * `delete(id)` removes the row outright; the freed Handle is reclaimable
 * by another user (AC-7). Dependent participants will fail their FK on
 * subsequent reads — Phase C ships the cascading WS-disconnect + room
 * successor logic that handles erase mid-session.
 */

import type { Database, Statement } from 'better-sqlite3';
import { generateId } from '../identity/id-generator.js';
import type { Identity } from './types.js';

export interface IdentitiesRepository {
  /**
   * Insert a new identity, generating the `Id` server-side using the
   * Crockford generator with retry on UNIQUE-on-id collision (budget 3,
   * statistically near-impossible to exhaust given 1.1T combinations).
   *
   * Throws if `handle` collides case-insensitively with an existing row
   * (UNIQUE index on `LOWER(handle)`); the error message contains
   * `UNIQUE` so the route can map it to a 409 response. Caller supplies
   * the hash; the repository never sees plaintext.
   */
  create(input: { handle: string; passcode_hash: string }): Identity;

  /**
   * Insert a new identity with a caller-supplied `id`. Used by the
   * upload route (Phase C) for the new-registration case where the
   * uploaded CSV's Id is recorded as-is. Throws on UNIQUE failure for
   * either column; the route distinguishes `id_mismatch` vs
   * `handle_taken` based on which row pre-existed.
   */
  createWithId(input: { id: string; handle: string; passcode_hash: string }): Identity;

  /**
   * Look up an identity by handle (case-insensitive). Returns null for
   * unknown handles.
   */
  findByHandle(handle: string): Identity | null;

  /** Look up an identity by its primary key. Returns null for unknown ids. */
  findById(id: string): Identity | null;

  /**
   * Read the persisted passcode_hash for verification. Returns null if
   * the handle is unknown. The only auth surface that exposes the hash —
   * domain reads must use `findByHandle` / `findById` and never receive
   * the hash.
   */
  findHashByHandle(handle: string): { id: string; passcode_hash: string } | null;

  /**
   * Mark `last_seen_at` to the current time. Called on successful resolve
   * (warm reconnect or upload accept) so the admin can see which
   * identities are dormant.
   */
  touchLastSeen(id: string): void;

  /**
   * Hard-delete an identity row. The freed Handle becomes reclaimable
   * (AC-7). Dependent participants are not touched here — Phase C's
   * `/erase` route handles WS disconnect + successor transfer before
   * calling this; participants whose identity has been erased will fail
   * subsequent FK-checked reads, which is the intended terminal state.
   *
   * Idempotent: deleting an unknown id is a no-op (no error).
   */
  delete(id: string): void;
}

interface IdentityRow {
  id: string;
  handle: string;
  passcode_hash: string;
  created_at: string;
  last_seen_at: string;
}

function rowToIdentity(row: IdentityRow): Identity {
  return {
    id: row.id,
    handle: row.handle,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

const ID_COLLISION_RETRY_BUDGET = 3;

export function createIdentitiesRepository(db: Database): IdentitiesRepository {
  const insertStmt: Statement = db.prepare(`
    INSERT INTO identities (id, handle, passcode_hash, created_at, last_seen_at)
    VALUES (@id, @handle, @passcode_hash, @now, @now)
  `);

  const selectByHandle: Statement = db.prepare(`
    SELECT * FROM identities WHERE LOWER(handle) = LOWER(?)
  `);

  const selectById: Statement = db.prepare(`
    SELECT * FROM identities WHERE id = ?
  `);

  const selectHashByHandle: Statement = db.prepare(`
    SELECT id, passcode_hash FROM identities WHERE LOWER(handle) = LOWER(?)
  `);

  const updateLastSeen: Statement = db.prepare(`
    UPDATE identities SET last_seen_at = ? WHERE id = ?
  `);

  const deleteStmt: Statement = db.prepare(`
    DELETE FROM identities WHERE id = ?
  `);

  function findByHandle(handle: string): Identity | null {
    const row = selectByHandle.get(handle) as IdentityRow | undefined;
    return row ? rowToIdentity(row) : null;
  }

  function createWithId(input: {
    id: string;
    handle: string;
    passcode_hash: string;
  }): Identity {
    const now = new Date().toISOString();
    insertStmt.run({
      id: input.id,
      handle: input.handle,
      passcode_hash: input.passcode_hash,
      now,
    });
    return {
      id: input.id,
      handle: input.handle,
      created_at: now,
      last_seen_at: now,
    };
  }

  function create(input: { handle: string; passcode_hash: string }): Identity {
    let lastErr: unknown;
    for (let attempt = 0; attempt < ID_COLLISION_RETRY_BUDGET; attempt++) {
      const id = generateId();
      try {
        return createWithId({ id, handle: input.handle, passcode_hash: input.passcode_hash });
      } catch (err) {
        lastErr = err;
        if (err instanceof Error && /UNIQUE/i.test(err.message)) {
          // Distinguish Handle vs Id collision: if the Handle is now in
          // the DB (either pre-existing or just inserted by another
          // process), this was a Handle conflict and we re-throw so the
          // route surfaces a 409 handle_taken. Otherwise the conflict
          // must have been on `id` — retry with a fresh Id.
          if (findByHandle(input.handle)) throw err;
          continue;
        }
        throw err;
      }
    }
    // 1.1T-combination space + 3 attempts; reaching here implies a serious
    // generator/DB issue. Surface the last error so it's diagnosable.
    throw new Error(
      `identity Id collision retry budget (${ID_COLLISION_RETRY_BUDGET}) exhausted: ${
        lastErr instanceof Error ? lastErr.message : String(lastErr)
      }`,
    );
  }

  return {
    create,
    createWithId,
    findByHandle,
    findById(id) {
      const row = selectById.get(id) as IdentityRow | undefined;
      return row ? rowToIdentity(row) : null;
    },
    findHashByHandle(handle) {
      const row = selectHashByHandle.get(handle) as
        | { id: string; passcode_hash: string }
        | undefined;
      return row ?? null;
    },
    touchLastSeen(id) {
      updateLastSeen.run(new Date().toISOString(), id);
    },
    delete(id) {
      deleteStmt.run(id);
    },
  };
}
