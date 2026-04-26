/**
 * POST /api/identities/erase behavior tests (ADR-161).
 *
 * Behavior Statement — eraseIdentityRoute
 *   DOES: validates `(handle, passcode)`; verifies via `findHashByHandle +
 *         verify`; closes every live WS owned by the identity with code
 *         4007 `identity_erased`; hard-deletes the identity row; returns
 *         `{erased: true}` (200). Order is verify → close sockets →
 *         delete row.
 *   WHEN: user invokes the Erase Identity confirmation modal (Phase E).
 *   BECAUSE: ADR-161 portability + AC-7. The user must be able to delete
 *            their identity; the freed Handle becomes reclaimable; live
 *            sessions must terminate so a connected client cannot keep
 *            acting after the row is gone.
 *   REJECTS WHEN: missing fields → 400 missing_field; unknown handle →
 *                 404 unknown_handle; passcode mismatch → 401
 *                 bad_passcode; malformed JSON → 400 bad_request.
 *
 * The WS-disconnect side of the contract is exercised by
 * tests/ws/erase-disconnect.test.ts with a real `ws.WebSocket`. Here we
 * assert only that the route invokes the connection manager with the
 * correct arguments, and that the row is deleted.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

interface RecordedClose {
  identity_id: string;
  code: number;
  reason: string;
}

describe('POST /api/identities/erase', () => {
  let app: TestAppHandle;
  let closeCalls: RecordedClose[];

  beforeEach(() => {
    app = buildTestApp();
    closeCalls = [];
    // Wrap the test-app's connection manager so we can assert the route
    // invoked closeIdentitySockets with the expected arguments without
    // having to spin up a real WS.
    const original = app.connections.closeIdentitySockets;
    app.connections.closeIdentitySockets = (identity_id, code, reason) => {
      closeCalls.push({ identity_id, code, reason });
      return original.call(app.connections, identity_id, code, reason);
    };
  });
  afterEach(() => {
    app.cleanup();
  });

  it('happy path: deletes the row, closes sockets with 4007, returns {erased:true}', async () => {
    const seeded = app.seedIdentity();

    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: seeded.handle, passcode: seeded.passcode }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ erased: true });

    // Row hard-deleted.
    const row = app.db
      .prepare('SELECT * FROM identities WHERE id = ?')
      .get(seeded.id);
    expect(row).toBeUndefined();

    // closeIdentitySockets called with the resolved id and 4007.
    expect(closeCalls).toEqual([
      { identity_id: seeded.id, code: 4007, reason: 'identity_erased' },
    ]);
  });

  it('post-erase: the Handle is reclaimable (AC-7) — a fresh create succeeds with the same Handle', async () => {
    const seeded = app.seedIdentity();
    const erase = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: seeded.handle, passcode: seeded.passcode }),
    });
    expect(erase.status).toBe(200);

    const create = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: seeded.handle }),
    });
    expect(create.status).toBe(201);
    const body = (await create.json()) as { id: string; handle: string };
    expect(body.handle).toBe(seeded.handle);
    // The new identity has a different id than the erased one.
    expect(body.id).not.toBe(seeded.id);
  });

  it('post-erase: findByHandle returns null', async () => {
    const seeded = app.seedIdentity();
    await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: seeded.handle, passcode: seeded.passcode }),
    });
    expect(app.identities.findByHandle(seeded.handle)).toBeNull();
  });

  it('unknown handle → 404 unknown_handle, no row deleted, no socket closed', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'nobody', passcode: 'plate-music' }),
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe('unknown_handle');

    // Seeded row untouched.
    expect(app.identities.findById(seeded.id)).not.toBeNull();
    expect(closeCalls).toEqual([]);
  });

  it('passcode mismatch → 401 bad_passcode, no row deleted, no socket closed', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: seeded.handle, passcode: 'wrong-passcode' }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code: string }).code).toBe('bad_passcode');
    expect(app.identities.findById(seeded.id)).not.toBeNull();
    expect(closeCalls).toEqual([]);
  });

  it('missing handle → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passcode: 'plate-music' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('missing passcode → 400 missing_field', async () => {
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('missing_field');
  });

  it('malformed JSON → 400 bad_request', async () => {
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('bad_request');
  });

  it('case-insensitive handle resolves to the same identity', async () => {
    const seeded = app.seedIdentity();
    const res = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: seeded.handle.toUpperCase(),
        passcode: seeded.passcode,
      }),
    });
    expect(res.status).toBe(200);
    expect(app.identities.findById(seeded.id)).toBeNull();
    expect(closeCalls[0]?.identity_id).toBe(seeded.id);
  });
});

describe('POST /api/identities/erase — Integration Reality (real argon2)', () => {
  let app: TestAppHandle;

  beforeEach(() => {
    app = buildTestApp({ realHashService: true });
  });
  afterEach(() => {
    app.cleanup();
  });

  it('end-to-end: create identity → erase with real passcode → row gone', async () => {
    // Use the actual create route so the persisted hash is real argon2.
    const create = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as { id: string; handle: string; passcode: string };

    const erase = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: created.handle, passcode: created.passcode }),
    });
    expect(erase.status).toBe(200);
    expect(app.identities.findById(created.id)).toBeNull();
  });

  it('real argon2: wrong passcode is rejected, row not deleted', async () => {
    const create = await app.fetch('/api/identities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'Alice' }),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as { id: string; handle: string; passcode: string };

    const erase = await app.fetch('/api/identities/erase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: created.handle, passcode: 'wrong-passcode' }),
    });
    expect(erase.status).toBe(401);
    expect(app.identities.findById(created.id)).not.toBeNull();
  });
});
