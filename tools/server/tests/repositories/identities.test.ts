/**
 * IdentitiesRepository behavior tests.
 *
 * Behavior Statement — IdentitiesRepository
 *   DOES: inserts an identities row with (identity_id, username, secret_hash,
 *         created_at, last_seen_at) and deleted_at NULL by default; resolves
 *         findByUsername case-insensitively and findById by primary key, both
 *         filtering out soft-deleted rows; reads the persisted secret_hash for
 *         auth-layer verification via findHashByUsername; updates last_seen_at;
 *         sets deleted_at on softDelete.
 *   WHEN: create from the identity HTTP route (Phase 2) and tests; resolve
 *         from the WS hello handler (Phase 3) and the identity reclaim route
 *         (Phase 2); softDelete from the admin script (Phase 7).
 *   BECAUSE: username is the human identifier; identity_id is the stable PK
 *            other tables FK to; secret_hash is never returned through the
 *            domain surface (auth layer reads it explicitly); soft-delete
 *            preserves participants FK while making the identity unreachable.
 *   REJECTS WHEN: create with a case-insensitively colliding username throws
 *                 (UNIQUE index on LOWER(username)); findByUsername /
 *                 findById return null for unknown ids and for soft-deleted
 *                 rows.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createIdentitiesRepository } from '../../src/repositories/identities.js';

describe('IdentitiesRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('create returns the persisted record with a UUID identity_id and the given username', () => {
    const identities = createIdentitiesRepository(db);
    const identity = identities.create({ username: 'Alice', secret_hash: 'hash-alice' });

    expect(identity.identity_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(identity.username).toBe('Alice');
    expect(identity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(identity.last_seen_at).toBe(identity.created_at);
    // The domain surface never carries the hash.
    expect(identity).not.toHaveProperty('secret_hash');
  });

  it('create rejects a case-insensitively colliding username', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ username: 'Alice', secret_hash: 'h1' });
    expect(() =>
      identities.create({ username: 'ALICE', secret_hash: 'h2' })
    ).toThrow(/UNIQUE/i);
  });

  it('preserves the original case of username for display while enforcing case-insensitive uniqueness', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ username: 'Alice', secret_hash: 'h' });

    // Different case lookups all resolve to the original-case row.
    expect(identities.findByUsername('alice')?.username).toBe('Alice');
    expect(identities.findByUsername('ALICE')?.username).toBe('Alice');
    expect(identities.findByUsername('AlIcE')?.username).toBe('Alice');
  });

  it('findByUsername returns null for an unknown username', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findByUsername('ghost')).toBeNull();
  });

  it('findById returns the persisted record', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ username: 'Bob', secret_hash: 'h' });
    const found = identities.findById(created.identity_id);
    expect(found).toEqual(created);
  });

  it('findById returns null for an unknown identity_id', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findHashByUsername returns the persisted hash for the auth layer', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ username: 'Carol', secret_hash: 'argon2-hash-bytes' });
    const auth = identities.findHashByUsername('carol');
    expect(auth).toEqual({
      identity_id: created.identity_id,
      secret_hash: 'argon2-hash-bytes',
    });
  });

  it('findHashByUsername returns null for an unknown username', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findHashByUsername('nobody')).toBeNull();
  });

  it('repository surface does not expose plaintext or hashed secret on Identity records', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ username: 'Dave', secret_hash: 'super-secret-hash' });
    const found = identities.findByUsername('dave');
    expect(found).not.toHaveProperty('secret_hash');
    // The persisted hash is reachable only via findHashByUsername (auth boundary).
    const row = db.prepare('SELECT secret_hash FROM identities WHERE LOWER(username) = ?').get('dave') as
      | { secret_hash: string }
      | undefined;
    expect(row?.secret_hash).toBe('super-secret-hash');
  });

  it('touchLastSeen advances last_seen_at past created_at', async () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ username: 'Eve', secret_hash: 'h' });
    await new Promise((r) => setTimeout(r, 10));
    identities.touchLastSeen(created.identity_id);
    const found = identities.findById(created.identity_id);
    expect(found).not.toBeNull();
    expect(found!.last_seen_at > created.last_seen_at).toBe(true);
  });

  it('softDelete makes findByUsername and findById return null but the row persists in the DB', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ username: 'Frank', secret_hash: 'h' });

    identities.softDelete(created.identity_id);

    expect(identities.findByUsername('frank')).toBeNull();
    expect(identities.findById(created.identity_id)).toBeNull();
    expect(identities.findHashByUsername('frank')).toBeNull();

    // The row is still there, just with deleted_at set.
    const row = db
      .prepare('SELECT deleted_at FROM identities WHERE identity_id = ?')
      .get(created.identity_id) as { deleted_at: string | null } | undefined;
    expect(row?.deleted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('softDelete is idempotent — calling twice does not error and does not advance deleted_at', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ username: 'Grace', secret_hash: 'h' });

    identities.softDelete(created.identity_id);
    const firstDeletedAt = (db
      .prepare('SELECT deleted_at FROM identities WHERE identity_id = ?')
      .get(created.identity_id) as { deleted_at: string }).deleted_at;

    // The query guards against advancing deleted_at on a second call: WHERE deleted_at IS NULL.
    identities.softDelete(created.identity_id);
    const secondDeletedAt = (db
      .prepare('SELECT deleted_at FROM identities WHERE identity_id = ?')
      .get(created.identity_id) as { deleted_at: string }).deleted_at;

    expect(secondDeletedAt).toBe(firstDeletedAt);
  });
});
