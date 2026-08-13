/**
 * REAL-PATH tests for identity routes — exercise the production
 * Fastify + better-sqlite3 stack against an in-memory SQLite file. No
 * mocks; `:memory:` is the same driver as on-disk SQLite, just without
 * persistence between processes.
 *
 * Covers AC-1 (identity claim), AC-9 (erase frees the handle), and
 * the handle-validation rejection surface on the HTTP layer.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildServer, type ZifmiaServer } from '../src/server.js';
import { readStoredIdentity, writeStoredIdentity, clearStoredIdentity } from '../src/client/identity-storage.js';

describe('identity routes — AC-1 + AC-9 (REAL-PATH SQLite)', () => {
  let server: ZifmiaServer;

  beforeEach(async () => {
    server = await buildServer({ dbFile: ':memory:' });
  });

  afterEach(async () => {
    await server.close();
  });

  // AC-1: a `POST /api/identities { handle }` with a fresh handle
  // returns 201 `{id, handle, is_admin}`. A second call with the same
  // handle returns 409 `handle_taken`.
  it('AC-1: first claim returns 201 with id/handle/is_admin; same handle returns 409', async () => {
    const first = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    expect(first.statusCode).toBe(201);
    const firstBody = first.json() as { id: string; handle: string; is_admin: boolean };
    expect(firstBody.handle).toBe('alice');
    expect(firstBody.is_admin).toBe(false);
    expect(firstBody.id).toMatch(/^[0-9a-f-]{36}$/i);

    // Persist to the canonical store — assert on the actual row.
    const persisted = server.identityRepo.getByHandle('alice');
    expect(persisted).toBeDefined();
    expect(persisted?.id).toBe(firstBody.id);
    expect(persisted?.handle).toBe('alice');

    const second = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: 'handle_taken' });
  });

  it('AC-1: case-insensitive collision returns 409 (handle uniqueness COLLATE NOCASE)', async () => {
    const a = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'Alice' }
    });
    expect(a.statusCode).toBe(201);
    expect((a.json() as { handle: string }).handle).toBe('Alice');

    const b = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    expect(b.statusCode).toBe(409);

    const c = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'ALICE' }
    });
    expect(c.statusCode).toBe(409);

    // Only one row was actually inserted.
    const row = server.identityRepo.getByHandle('alice');
    expect(row?.handle).toBe('Alice');
  });

  it('rejects invalid handle with 400', async () => {
    for (const payload of [
      { handle: 'a' },           // too short
      { handle: 'a'.repeat(13) },// too long
      { handle: 'al ice' },      // whitespace
      { handle: 'alice1' },      // digit
      { handle: 42 },            // wrong type
      {}                         // missing
    ]) {
      const res = await server.app.inject({
        method: 'POST',
        url: '/api/identities',
        payload
      });
      expect(res.statusCode, `payload ${JSON.stringify(payload)}`).toBe(400);
      expect(res.json()).toEqual({ error: 'invalid_handle' });
    }
  });

  // AC-9: `POST /api/identities/erase { handle }` hard-deletes the row;
  // subsequent claim with the same handle succeeds with a new id.
  it('AC-9: erase frees the handle (subsequent claim succeeds with NEW id)', async () => {
    const claim = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'bob' }
    });
    expect(claim.statusCode).toBe(201);
    const originalId = (claim.json() as { id: string }).id;

    const erase = await server.app.inject({
      method: 'POST',
      url: '/api/identities/erase',
      payload: { handle: 'bob' }
    });
    expect(erase.statusCode).toBe(200);
    expect(erase.json()).toEqual({ erased: true });

    // Row is actually gone.
    expect(server.identityRepo.getByHandle('bob')).toBeUndefined();

    const reclaim = await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'bob' }
    });
    expect(reclaim.statusCode).toBe(201);
    const reclaimedId = (reclaim.json() as { id: string }).id;
    expect(reclaimedId).not.toBe(originalId);
    expect(reclaimedId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('erase on unknown handle is idempotent (200, erased: false)', async () => {
    const res = await server.app.inject({
      method: 'POST',
      url: '/api/identities/erase',
      payload: { handle: 'nobody' }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ erased: false });
  });

  it('GET /api/rooms is open to unidentified callers (Phase 1: returns empty list)', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/api/rooms' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ rooms: [] });
  });
});

// Client-side localStorage helper. The browser path uses real localStorage;
// in Node tests we pass an in-memory Storage shim, which is the same
// `Storage` shape the browser uses (storage IS the integration boundary;
// the shim is acceptable per the JS/TS standard's Storage interface).
describe('identity storage helper (client-side)', () => {
  function makeStorage(): Storage {
    const map = new Map<string, string>();
    return {
      get length() { return map.size; },
      clear: () => map.clear(),
      getItem: (k: string) => map.get(k) ?? null,
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      removeItem: (k: string) => { map.delete(k); },
      setItem: (k: string, v: string) => { map.set(k, v); }
    };
  }

  it('round-trips an identity through the Storage interface', () => {
    const s = makeStorage();
    expect(readStoredIdentity(s)).toBeUndefined();
    writeStoredIdentity({ id: 'xyz', handle: 'Carol' }, s);
    expect(readStoredIdentity(s)).toEqual({ id: 'xyz', handle: 'Carol' });
    clearStoredIdentity(s);
    expect(readStoredIdentity(s)).toBeUndefined();
  });

  it('ignores malformed stored values', () => {
    const s = makeStorage();
    s.setItem('sharpee:identity', '{not-json');
    expect(readStoredIdentity(s)).toBeUndefined();

    s.setItem('sharpee:identity', JSON.stringify({ id: 1, handle: 'Dave' }));
    expect(readStoredIdentity(s)).toBeUndefined();

    s.setItem('sharpee:identity', JSON.stringify({ id: 'ok', noHandle: true }));
    expect(readStoredIdentity(s)).toBeUndefined();
  });
});
