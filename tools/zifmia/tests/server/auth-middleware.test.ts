/**
 * @module tests/server/auth-middleware.test
 * @purpose Behavior tests for `authMiddleware`. Confirms 401
 *   `unauthenticated` on every failure path and `request.identity`
 *   population on success. Exercises a one-off `/protected` test route
 *   wired only for this suite.
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

import { authMiddleware } from '../../src/server/auth-middleware';
import { generateSessionToken } from '../../src/auth/session-token';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

interface SetupResult {
  app: FastifyInstance;
  adapter: SqliteAdapter;
  baseUrl: string;
}

async function setupServer(now: () => number = Date.now): Promise<SetupResult> {
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const app = Fastify({ logger: false });
  app.addHook('preHandler', authMiddleware({ adapter, now }));
  app.get('/protected', async (request) => {
    return { handle: request.identity?.handle };
  });
  const addr = await app.listen({ host: '127.0.0.1', port: 0 });
  return { app, adapter, baseUrl: addr };
}

describe('authMiddleware', () => {
  let setup: SetupResult;

  beforeEach(async () => {
    setup = await setupServer();
  });

  afterEach(async () => {
    await setup.app.close();
    await setup.adapter.close();
  });

  it('401 unauthenticated when Authorization header is missing', async () => {
    const res = await fetch(`${setup.baseUrl}/protected`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('401 unauthenticated when bearer prefix is missing', async () => {
    const res = await fetch(`${setup.baseUrl}/protected`, {
      headers: { authorization: 'NotBearer xyz' }
    });
    expect(res.status).toBe(401);
  });

  it('401 unauthenticated when token is unknown', async () => {
    const res = await fetch(`${setup.baseUrl}/protected`, {
      headers: { authorization: 'Bearer not-a-real-token' }
    });
    expect(res.status).toBe(401);
  });

  it('401 unauthenticated when session is expired', async () => {
    // Fake clock that reports a time *after* the session expiry.
    await setup.app.close();
    await setup.adapter.close();
    setup = await setupServer(() => 10_000_000);

    const identity = await setup.adapter.createIdentity({
      handle: 'expired-user',
      passcodeHash: 'hash'
    });
    const token = generateSessionToken();
    await setup.adapter.createSession({
      token,
      identityId: identity.id,
      expiresAt: 1_000_000 // earlier than the fake clock
    });

    const res = await fetch(`${setup.baseUrl}/protected`, {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(401);
  });

  it('attaches identity on success and falls through to the handler', async () => {
    const identity = await setup.adapter.createIdentity({
      handle: 'valid-user',
      passcodeHash: 'hash'
    });
    const token = generateSessionToken();
    await setup.adapter.createSession({
      token,
      identityId: identity.id,
      expiresAt: Date.now() + 1_000_000
    });

    const res = await fetch(`${setup.baseUrl}/protected`, {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ handle: 'valid-user' });
  });
});
