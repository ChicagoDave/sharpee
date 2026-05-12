/**
 * @module tests/server/admin-identities.test
 * @purpose Behavior tests for `POST /admin/identities/:id/passcode_reset`
 *   (Phase 5d). Confirms gating, that the new passcode actually
 *   authenticates (proves the hash was written), that all live
 *   sessions for the identity are invalidated, and that the audit row
 *   records the reset WITHOUT including the plaintext passcode.
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

interface SessionInfo {
  sessionToken: string;
  identityId: string;
}

async function register(
  handle: ZifmiaServerHandle,
  userHandle: string,
  passcode: string = 'a valid passcode',
): Promise<SessionInfo> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode }),
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

async function login(
  handle: ZifmiaServerHandle,
  userHandle: string,
  passcode: string,
): Promise<Response> {
  return fetch(`http://127.0.0.1:${handle.port}/identity/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode }),
  });
}

interface Ctx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  admin: SessionInfo;
  mortal: SessionInfo;
  victim: SessionInfo; // the identity being reset
  victimHandle: string;
}

async function setup(): Promise<Ctx> {
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });
  const admin = await register(handle, 'overseer');
  const mortal = await register(handle, 'peasant');
  const victim = await register(handle, 'forgetful', 'old passcode here');
  await handle.adapter.setIdentityAdmin(admin.identityId, true);
  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    admin,
    mortal,
    victim,
    victimHandle: 'forgetful',
  };
}

async function reset(
  ctx: Ctx,
  identityId: string,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/identities/${identityId}/passcode_reset`, {
    method: 'POST',
    headers,
  });
}

describe('POST /admin/identities/:id/passcode_reset', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('401 unauthenticated without a bearer', async () => {
    const res = await reset(ctx, ctx.victim.identityId, null);
    expect(res.status).toBe(401);
  });

  it('403 forbidden for non-admin', async () => {
    const res = await reset(ctx, ctx.victim.identityId, ctx.mortal.sessionToken);
    expect(res.status).toBe(403);

    // Existing victim session is unchanged
    const session = await ctx.handle.adapter.getSessionByToken(
      ctx.victim.sessionToken,
    );
    expect(session).not.toBeNull();
  });

  it('404 identity_not_found for unknown id', async () => {
    const res = await reset(ctx, 'never-registered');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe(
      'identity_not_found',
    );
  });

  it('200 returns a usable new passcode; old passcode no longer authenticates', async () => {
    const res = await reset(ctx, ctx.victim.identityId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      passcode: string;
      identityId: string;
      handle: string;
    };
    expect(body.identityId).toBe(ctx.victim.identityId);
    expect(body.handle).toBe(ctx.victimHandle);
    expect(body.passcode.length).toBe(16);
    expect(body.passcode).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);

    // New passcode authenticates
    const newLogin = await login(ctx.handle, ctx.victimHandle, body.passcode);
    expect(newLogin.status).toBe(200);

    // Old passcode does NOT authenticate
    const oldLogin = await login(ctx.handle, ctx.victimHandle, 'old passcode here');
    expect(oldLogin.status).toBe(401);
  });

  it('invalidates every existing session for the victim', async () => {
    // Create a second session by logging in again before reset
    const secondLogin = await login(ctx.handle, ctx.victimHandle, 'old passcode here');
    expect(secondLogin.status).toBe(200);
    const secondToken = ((await secondLogin.json()) as { sessionToken: string })
      .sessionToken;

    // Both tokens should currently work
    expect(
      await ctx.handle.adapter.getSessionByToken(ctx.victim.sessionToken),
    ).not.toBeNull();
    expect(await ctx.handle.adapter.getSessionByToken(secondToken)).not.toBeNull();

    expect((await reset(ctx, ctx.victim.identityId)).status).toBe(200);

    // Both prior sessions are gone
    expect(
      await ctx.handle.adapter.getSessionByToken(ctx.victim.sessionToken),
    ).toBeNull();
    expect(await ctx.handle.adapter.getSessionByToken(secondToken)).toBeNull();

    // Other identities' sessions are unaffected
    expect(
      await ctx.handle.adapter.getSessionByToken(ctx.admin.sessionToken),
    ).not.toBeNull();
    expect(
      await ctx.handle.adapter.getSessionByToken(ctx.mortal.sessionToken),
    ).not.toBeNull();
  });

  it('emits an identity.passcode_reset audit row WITHOUT the plaintext passcode', async () => {
    const res = await reset(ctx, ctx.victim.identityId);
    const body = (await res.json()) as { passcode: string };
    const newPasscode = body.passcode;

    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const resets = audit.filter((e) => e.action === 'identity.passcode_reset');
    expect(resets).toHaveLength(1);
    const entry = resets[0]!;
    expect(entry.actorId).toBe(ctx.admin.identityId);
    expect(entry.targetKind).toBe('identity');
    expect(entry.targetId).toBe(ctx.victim.identityId);

    // Detail must include identityId + handle
    const detail = JSON.parse(entry.detail) as {
      identityId: string;
      handle: string;
    };
    expect(detail.identityId).toBe(ctx.victim.identityId);
    expect(detail.handle).toBe(ctx.victimHandle);

    // CRITICAL: detail must NOT contain the plaintext passcode
    expect(entry.detail).not.toContain(newPasscode);
  });

  it('back-to-back resets each return a different passcode', async () => {
    const r1 = await reset(ctx, ctx.victim.identityId);
    const p1 = ((await r1.json()) as { passcode: string }).passcode;
    const r2 = await reset(ctx, ctx.victim.identityId);
    const p2 = ((await r2.json()) as { passcode: string }).passcode;
    expect(p1).not.toBe(p2);

    // Only the most recent passcode authenticates
    expect((await login(ctx.handle, ctx.victimHandle, p1)).status).toBe(401);
    expect((await login(ctx.handle, ctx.victimHandle, p2)).status).toBe(200);
  });
});
