/**
 * Identities repository — persistent user identity per ADR-159.
 *
 * Public interface: {@link IdentitiesRepository}, {@link createIdentitiesRepository}.
 * Bounded context: persistence layer.
 *
 * The `identities` table is a stable interface for admin tooling (delete-identity
 * script today; identity transfer/export/import in the future). New columns may be
 * added; existing columns must not be renamed or have semantics shifted without
 * updating the admin tooling in the same change.
 *
 * The `secret_hash` is never returned through this repository's surface — the
 * HashService layer performs verification by reading the hash via `findHashByUsername`
 * and comparing against the plaintext supplied by the client.
 */

import { randomUUID } from 'node:crypto';
import type { Database, Statement } from 'better-sqlite3';
import type { Identity } from './types.js';

export interface IdentitiesRepository {
  /**
   * Insert a new identity. Throws if `username` collides case-insensitively with
   * an existing row (UNIQUE index on `LOWER(username)`). Caller supplies the hash;
   * the repository never sees plaintext.
   */
  create(input: { username: string; secret_hash: string }): Identity;

  /**
   * Look up an identity by username (case-insensitive). Returns null for unknown
   * usernames and for soft-deleted rows.
   */
  findByUsername(username: string): Identity | null;

  /**
   * Look up an identity by its primary key. Returns null for unknown ids and for
   * soft-deleted rows.
   */
  findById(identity_id: string): Identity | null;

  /**
   * Read the persisted secret_hash for verification. Returns null if the username
   * is unknown or soft-deleted. Used by the HashService to verify a presented secret.
   * Not exposed beyond the auth layer.
   */
  findHashByUsername(username: string): { identity_id: string; secret_hash: string } | null;

  /**
   * Mark `last_seen_at` to the current time. Called on successful resolve (warm
   * reconnect or cold reclaim) so the admin can see which identities are dormant.
   */
  touchLastSeen(identity_id: string): void;

  /**
   * Soft-delete an identity. Sets `deleted_at` to the current ISO-8601 timestamp;
   * subsequent `findByUsername` / `findById` return null. Does not modify
   * dependent participant rows — they continue to satisfy the FK against the
   * soft-deleted identity. The Phase 7 admin script decides whether to additionally
   * anonymize participant rows; this repository only owns the identity row.
   */
  softDelete(identity_id: string): void;
}

interface IdentityRow {
  identity_id: string;
  username: string;
  secret_hash: string;
  created_at: string;
  last_seen_at: string;
  deleted_at: string | null;
}

function rowToIdentity(row: IdentityRow): Identity {
  return {
    identity_id: row.identity_id,
    username: row.username,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

export function createIdentitiesRepository(db: Database): IdentitiesRepository {
  const insert: Statement = db.prepare(`
    INSERT INTO identities (
      identity_id, username, secret_hash, created_at, last_seen_at
    ) VALUES (@identity_id, @username, @secret_hash, @now, @now)
  `);

  const selectByUsername: Statement = db.prepare(`
    SELECT * FROM identities
    WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL
  `);

  const selectById: Statement = db.prepare(`
    SELECT * FROM identities
    WHERE identity_id = ? AND deleted_at IS NULL
  `);

  const selectHashByUsername: Statement = db.prepare(`
    SELECT identity_id, secret_hash FROM identities
    WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL
  `);

  const updateLastSeen: Statement = db.prepare(`
    UPDATE identities SET last_seen_at = ? WHERE identity_id = ?
  `);

  const softDeleteStmt: Statement = db.prepare(`
    UPDATE identities SET deleted_at = ? WHERE identity_id = ? AND deleted_at IS NULL
  `);

  return {
    create(input) {
      const identity_id = randomUUID();
      const now = new Date().toISOString();
      insert.run({
        identity_id,
        username: input.username,
        secret_hash: input.secret_hash,
        now,
      });
      return {
        identity_id,
        username: input.username,
        created_at: now,
        last_seen_at: now,
      };
    },

    findByUsername(username) {
      const row = selectByUsername.get(username) as IdentityRow | undefined;
      return row ? rowToIdentity(row) : null;
    },

    findById(identity_id) {
      const row = selectById.get(identity_id) as IdentityRow | undefined;
      return row ? rowToIdentity(row) : null;
    },

    findHashByUsername(username) {
      const row = selectHashByUsername.get(username) as
        | { identity_id: string; secret_hash: string }
        | undefined;
      return row ?? null;
    },

    touchLastSeen(identity_id) {
      updateLastSeen.run(new Date().toISOString(), identity_id);
    },

    softDelete(identity_id) {
      softDeleteStmt.run(new Date().toISOString(), identity_id);
    },
  };
}
