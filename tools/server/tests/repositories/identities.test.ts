/**
 * IdentitiesRepository behavior tests (ADR-161).
 *
 * Behavior Statement — IdentitiesRepository
 *   DOES: inserts a new row with (id, handle, passcode_hash, created_at,
 *         last_seen_at) — `create` generates the Id with the Crockford
 *         generator and retries up to 3 times on UNIQUE-on-id collision;
 *         `createWithId` accepts a caller-supplied Id (used by upload).
 *         findByHandle is case-insensitive; findById is exact.
 *         findHashByHandle returns the hash for the auth layer (the only
 *         exposure of the hash). touchLastSeen advances the timestamp.
 *         delete hard-removes the row, freeing the Handle for re-claim.
 *   WHEN: create from POST /api/identities; createWithId from
 *         POST /api/identities/upload (new-registration case);
 *         findByHandle and findHashByHandle from WS hello and reclaim;
 *         delete from POST /api/identities/erase.
 *   BECAUSE: handle is the human identifier shown in the UI; id is the
 *            stable internal key other tables FK to; passcode_hash is
 *            structurally isolated from the domain surface; hard delete
 *            is required so freed handles can be reclaimed (AC-7).
 *   REJECTS WHEN: create with a case-insensitively colliding handle
 *                 throws a UNIQUE error (which the route maps to 409
 *                 handle_taken). createWithId throws on either UNIQUE
 *                 collision (route distinguishes by pre-existing row).
 *                 findByHandle / findById return null for unknown values.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createIdentitiesRepository } from '../../src/repositories/identities.js';
import { ID_PATTERN } from '../../src/identity/id-generator.js';

describe('IdentitiesRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('create returns the persisted record with a Crockford Id and the given handle', () => {
    const identities = createIdentitiesRepository(db);
    const identity = identities.create({ handle: 'Alice', passcode_hash: 'hash-alice' });

    expect(identity.id).toMatch(ID_PATTERN);
    expect(identity.handle).toBe('Alice');
    expect(identity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(identity.last_seen_at).toBe(identity.created_at);
    // The domain surface never carries the hash.
    expect(identity).not.toHaveProperty('passcode_hash');
  });

  it('create rejects a case-insensitively colliding handle', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ handle: 'Alice', passcode_hash: 'h1' });
    expect(() =>
      identities.create({ handle: 'ALICE', passcode_hash: 'h2' }),
    ).toThrow(/UNIQUE/i);
  });

  it('preserves original case of handle while enforcing case-insensitive uniqueness', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ handle: 'Alice', passcode_hash: 'h' });

    expect(identities.findByHandle('alice')?.handle).toBe('Alice');
    expect(identities.findByHandle('ALICE')?.handle).toBe('Alice');
    expect(identities.findByHandle('AlIcE')?.handle).toBe('Alice');
  });

  it('findByHandle returns null for an unknown handle', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findByHandle('ghost')).toBeNull();
  });

  it('findById returns the persisted record by primary key', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ handle: 'Bob', passcode_hash: 'h' });
    const found = identities.findById(created.id);
    expect(found).toEqual(created);
  });

  it('findById returns null for an unknown id', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findById('XYNC-4FJ3')).toBeNull();
  });

  it('findHashByHandle returns the persisted hash for the auth layer', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ handle: 'Carol', passcode_hash: 'argon2-hash-bytes' });
    const auth = identities.findHashByHandle('carol');
    expect(auth).toEqual({ id: created.id, passcode_hash: 'argon2-hash-bytes' });
  });

  it('findHashByHandle returns null for an unknown handle', () => {
    const identities = createIdentitiesRepository(db);
    expect(identities.findHashByHandle('nobody')).toBeNull();
  });

  it('repository surface does not expose passcode_hash on Identity records', () => {
    const identities = createIdentitiesRepository(db);
    identities.create({ handle: 'Dave', passcode_hash: 'super-secret-hash' });
    const found = identities.findByHandle('dave');
    expect(found).not.toHaveProperty('passcode_hash');
    // The persisted hash is reachable only via findHashByHandle (auth boundary).
    const row = db
      .prepare('SELECT passcode_hash FROM identities WHERE LOWER(handle) = ?')
      .get('dave') as { passcode_hash: string } | undefined;
    expect(row?.passcode_hash).toBe('super-secret-hash');
  });

  it('touchLastSeen advances last_seen_at past created_at', async () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ handle: 'Eve', passcode_hash: 'h' });
    await new Promise((r) => setTimeout(r, 10));
    identities.touchLastSeen(created.id);
    const found = identities.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.last_seen_at > created.last_seen_at).toBe(true);
  });

  it('delete hard-removes the row from the table', () => {
    const identities = createIdentitiesRepository(db);
    const created = identities.create({ handle: 'Frank', passcode_hash: 'h' });

    identities.delete(created.id);

    expect(identities.findByHandle('frank')).toBeNull();
    expect(identities.findById(created.id)).toBeNull();
    expect(identities.findHashByHandle('frank')).toBeNull();

    // The row is gone — not soft-deleted with a marker column.
    const row = db
      .prepare('SELECT * FROM identities WHERE id = ?')
      .get(created.id);
    expect(row).toBeUndefined();
  });

  it('delete is idempotent — deleting an unknown id is a no-op', () => {
    const identities = createIdentitiesRepository(db);
    expect(() => identities.delete('NEVE-RWAS')).not.toThrow();
    // Adding then deleting twice does not error.
    const created = identities.create({ handle: 'Grace', passcode_hash: 'h' });
    identities.delete(created.id);
    expect(() => identities.delete(created.id)).not.toThrow();
  });

  it('AC-7: after delete the freed handle can be re-created with a different Id', () => {
    const identities = createIdentitiesRepository(db);
    const first = identities.create({ handle: 'Heidi', passcode_hash: 'h1' });

    identities.delete(first.id);

    // Same handle (case-insensitive) is now reclaimable.
    const second = identities.create({ handle: 'heidi', passcode_hash: 'h2' });
    expect(second.id).not.toBe(first.id);
    expect(second.handle).toBe('heidi');
    expect(identities.findByHandle('Heidi')?.id).toBe(second.id);

    // The old hash must be gone — the auth layer must not find the
    // previous holder's secret under the same handle.
    const auth = identities.findHashByHandle('heidi');
    expect(auth?.passcode_hash).toBe('h2');
    expect(auth?.passcode_hash).not.toBe('h1');
  });

  it('createWithId persists the caller-supplied Id (upload new-registration path)', () => {
    const identities = createIdentitiesRepository(db);
    const result = identities.createWithId({
      id: 'XYNC-4FJ3',
      handle: 'Ivan',
      passcode_hash: 'h-ivan',
    });

    expect(result).toEqual({
      id: 'XYNC-4FJ3',
      handle: 'Ivan',
      created_at: expect.any(String),
      last_seen_at: result.created_at,
    });
    expect(identities.findById('XYNC-4FJ3')?.handle).toBe('Ivan');
  });

  it('createWithId throws on a colliding Id (upload Id_mismatch path)', () => {
    const identities = createIdentitiesRepository(db);
    identities.createWithId({ id: 'XYNC-4FJ3', handle: 'Judy', passcode_hash: 'h1' });
    expect(() =>
      identities.createWithId({ id: 'XYNC-4FJ3', handle: 'Karl', passcode_hash: 'h2' }),
    ).toThrow(/UNIQUE/i);
  });

  it('createWithId throws on a colliding handle (upload handle_taken path)', () => {
    const identities = createIdentitiesRepository(db);
    identities.createWithId({ id: 'XYNC-4FJ3', handle: 'Liam', passcode_hash: 'h1' });
    expect(() =>
      identities.createWithId({ id: 'ABCD-EFGH', handle: 'Liam', passcode_hash: 'h2' }),
    ).toThrow(/UNIQUE/i);
  });
});
