/**
 * @module tests/server/admin-middleware.test
 * @purpose Behavior tests for `adminMiddleware`. Confirms the composed
 *   `[authMiddleware, adminMiddleware]` pipeline returns 401 / 403 /
 *   through on the right inputs and that fall-through preserves the
 *   identity attached by the auth step.
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

import { adminMiddleware } from '../../src/server/admin-middleware';
import { authMiddleware } from '../../src/server/auth-middleware';
import { generateSessionToken } from '../../src/auth/session-token';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

interface SetupResult {
  app: FastifyInstance;
  adapter: SqliteAdapter;
  baseUrl: string;
}

async function setupServer(): Promise<SetupResult> {
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const app = Fastify({ logger: false });
  // Production-shape registration: auth first, then admin gate.
  app.get(
    '/admin/ping',
    {
      preHandler: [authMiddleware({ adapter }), adminMiddleware()]
    },
    async (request) => ({
      handle: request.identity?.handle,
      isAdmin: request.identity?.isAdmin
    })
  );
  // A separate route that uses ONLY adminMiddleware so we can verify
  // the defensive 401 path when auth is misconfigured upstream.
  app.get(
    '/admin/no-auth',
    { preHandler: [adminMiddleware()] },
    async () => ({ ok: true })
  );
  const addr = await app.listen({ host: '127.0.0.1', port: 0 });
  return { app, adapter, baseUrl: addr };
}

async function makeSessionFor(
  setup: SetupResult,
  handle: string,
  isAdmin: boolean
): Promise<string> {
  const identity = await setup.adapter.createIdentity({
    handle,
    passcodeHash: 'hash'
  });
  if (isAdmin) {
    await setup.adapter.setIdentityAdmin(identity.id, true);
  }
  const token = generateSessionToken();
  await setup.adapter.createSession({
    token,
    identityId: identity.id,
    expiresAt: Date.now() + 1_000_000
  });
  return token;
}

describe('adminMiddleware', () => {
  let setup: SetupResult;

  beforeEach(async () => {
    setup = await setupServer();
  });

  afterEach(async () => {
    await setup.app.close();
    await setup.adapter.close();
  });

  it('401 unauthenticated when no Authorization header is present (auth catches it first)', async () => {
    const res = await fetch(`${setup.baseUrl}/admin/ping`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('403 forbidden when the identity is authenticated but not an admin', async () => {
    const token = await makeSessionFor(setup, 'mortal', false);

    const res = await fetch(`${setup.baseUrl}/admin/ping`, {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
  });

  it('200 fall-through when the identity is an admin; identity is preserved', async () => {
    const token = await makeSessionFor(setup, 'overseer', true);

    const res = await fetch(`${setup.baseUrl}/admin/ping`, {
      headers: { authorization: `Bearer ${token}` }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      handle: 'overseer',
      isAdmin: true
    });
  });

  it('401 unauthenticated when adminMiddleware runs without a prior auth step', async () => {
    // Defensive path — adminMiddleware should not bypass auth even if
    // a route is misconfigured to omit it.
    const res = await fetch(`${setup.baseUrl}/admin/no-auth`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('still rejects (403) when the same identity later loses admin', async () => {
    // Confirms adminMiddleware reads the *current* DB state via the
    // auth-middleware-attached identity, not a cached snapshot.
    const adminToken = await makeSessionFor(setup, 'demoted', true);
    const ok = await fetch(`${setup.baseUrl}/admin/ping`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect(ok.status).toBe(200);

    const id = (await setup.adapter.getIdentityByHandle('demoted'))!.id;
    await setup.adapter.setIdentityAdmin(id, false);

    const after = await fetch(`${setup.baseUrl}/admin/ping`, {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    expect(after.status).toBe(403);
  });
});
