/**
 * @module tests/server/identity.test
 * @purpose Behavior tests for `POST /identity/register` and
 *   `POST /identity/login`. Critical AC-11 assertion: 401 response
 *   body is IDENTICAL for "no such handle" and "wrong passcode."
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

describe('POST /identity/register', () => {
  let handle: ZifmiaServerHandle;
  const base = (): string => `http://127.0.0.1:${handle.port}`;

  beforeEach(async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test'
    });
  });

  afterEach(async () => {
    await handle.close();
  });

  it('persists a new identity and returns a session token', async () => {
    const res = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'alice', passcode: 'correct horse' })
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      handle: string;
      sessionToken: string;
    };
    expect(body.handle).toBe('alice');
    expect(body.id).toMatch(/.+/);
    expect(body.sessionToken).toMatch(/^[0-9a-f]{64}$/);

    // Identity should now exist in the adapter.
    const stored = await handle.adapter.getIdentityByHandle('alice');
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(body.id);

    // Session should be valid against the adapter.
    const session = await handle.adapter.getSessionByToken(body.sessionToken);
    expect(session?.identityId).toBe(body.id);
  });

  it('returns 409 handle_taken on duplicate handle', async () => {
    const first = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'bob', passcode: 'first one' })
    });
    expect(first.status).toBe(201);

    const dup = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'bob', passcode: 'different one' })
    });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: 'handle_taken' });
  });

  it('rejects malformed handle (regex) with 400', async () => {
    const res = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'has space!', passcode: 'long enough' })
    });
    expect(res.status).toBe(400);
  });

  it('rejects too-short passcode with 400', async () => {
    const res = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'carol', passcode: 'short' })
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /identity/login (AC-11)', () => {
  let handle: ZifmiaServerHandle;
  const base = (): string => `http://127.0.0.1:${handle.port}`;

  beforeEach(async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test'
    });
    // Seed a known identity.
    await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'dave', passcode: 'correct passcode' })
    });
  });

  afterEach(async () => {
    await handle.close();
  });

  it('returns 200 with sessionToken on valid credentials', async () => {
    const res = await fetch(`${base()}/identity/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'dave', passcode: 'correct passcode' })
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionToken: string };
    expect(body.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 401 invalid_credentials on WRONG passcode', async () => {
    const res = await fetch(`${base()}/identity/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'dave', passcode: 'wrong passcode' })
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('returns IDENTICAL 401 invalid_credentials on NONEXISTENT handle', async () => {
    const res = await fetch(`${base()}/identity/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'ghost', passcode: 'any passcode here' })
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('returns 401 invalid_credentials on malformed body (no info leak)', async () => {
    // AC-11's "same body" guarantee extends to validation failures —
    // wire observers cannot distinguish "wrong passcode" from
    // "malformed JSON."
    const res = await fetch(`${base()}/identity/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: '!', passcode: 'x' })
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_credentials' });
  });
});

describe('GET /identity/me', () => {
  let handle: ZifmiaServerHandle;
  const base = (): string => `http://127.0.0.1:${handle.port}`;

  beforeEach(async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test'
    });
  });

  afterEach(async () => {
    await handle.close();
  });

  it('returns {id, handle, isAdmin: false} for a valid bearer token', async () => {
    const reg = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'alice', passcode: 'correct horse' })
    });
    const { id, sessionToken } = (await reg.json()) as {
      id: string;
      sessionToken: string;
    };

    const me = await fetch(`${base()}/identity/me`, {
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({
      id,
      handle: 'alice',
      isAdmin: false
    });
  });

  it('returns isAdmin: true after grant', async () => {
    const reg = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'admin', passcode: 'correct horse' })
    });
    const { id, sessionToken } = (await reg.json()) as {
      id: string;
      sessionToken: string;
    };
    await handle.adapter.setIdentityAdmin(id, true);

    const me = await fetch(`${base()}/identity/me`, {
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    expect(me.status).toBe(200);
    expect((await me.json()) as { isAdmin: boolean }).toMatchObject({
      isAdmin: true
    });
  });

  it('returns 401 with no auth header', async () => {
    const res = await fetch(`${base()}/identity/me`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 401 with unknown bearer token', async () => {
    const res = await fetch(`${base()}/identity/me`, {
      headers: { authorization: 'Bearer not-a-real-token' }
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 401 with malformed Authorization header', async () => {
    const res = await fetch(`${base()}/identity/me`, {
      headers: { authorization: 'something-without-bearer-prefix' }
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('does not leak passcodeHash or createdAt', async () => {
    const reg = await fetch(`${base()}/identity/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'bob', passcode: 'correct horse' })
    });
    const { sessionToken } = (await reg.json()) as { sessionToken: string };

    const me = await fetch(`${base()}/identity/me`, {
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    const body = (await me.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty('passcodeHash');
    expect(body).not.toHaveProperty('createdAt');
    expect(Object.keys(body).sort()).toEqual(['handle', 'id', 'isAdmin']);
  });
});
