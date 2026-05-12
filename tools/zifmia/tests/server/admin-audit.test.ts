/**
 * @module tests/server/admin-audit.test
 * @purpose Behavior tests for `GET /admin/audit` — Phase 5b admin
 *   route. Confirms the [auth, admin] preHandler chain rejects the
 *   right requests, the response wrapping shape, reverse-chronological
 *   ordering, and `?sinceTs` + `?limit` query handling.
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import type { AuditEntry } from '../../src/storage/types';

interface SessionInfo {
  sessionToken: string;
  identityId: string;
}

async function register(
  handle: ZifmiaServerHandle,
  userHandle: string
): Promise<SessionInfo> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' })
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

interface Ctx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  admin: SessionInfo;
  mortal: SessionInfo;
}

async function setup(): Promise<Ctx> {
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test'
  });
  const admin = await register(handle, 'overseer');
  const mortal = await register(handle, 'peasant');
  await handle.adapter.setIdentityAdmin(admin.identityId, true);
  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    admin,
    mortal
  };
}

async function fetchAudit(
  ctx: Ctx,
  query: string = '',
  bearer: string | null = ctx.admin.sessionToken
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/audit${query}`, { headers });
}

describe('GET /admin/audit', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 401 unauthenticated without a bearer token', async () => {
    const res = await fetchAudit(ctx, '', null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 403 forbidden for an authenticated non-admin', async () => {
    const res = await fetchAudit(ctx, '', ctx.mortal.sessionToken);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
  });

  it('returns an empty list when no audit rows exist yet', async () => {
    const res = await fetchAudit(ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: AuditEntry[] };
    expect(body.entries).toEqual([]);
  });

  it('returns rows in reverse-chronological order (newest first)', async () => {
    await ctx.handle.adapter.appendAuditEntry({
      actorId: ctx.admin.identityId,
      action: 'room.create',
      targetKind: 'room',
      targetId: 'room-1',
      detail: '{"i":1}'
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await ctx.handle.adapter.appendAuditEntry({
      actorId: ctx.admin.identityId,
      action: 'room.kill',
      targetKind: 'room',
      targetId: 'room-1',
      detail: '{"i":2}'
    });

    const res = await fetchAudit(ctx);
    const body = (await res.json()) as { entries: AuditEntry[] };
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0]!.action).toBe('room.kill');
    expect(body.entries[1]!.action).toBe('room.create');
    expect(body.entries[0]!.ts).toBeGreaterThanOrEqual(body.entries[1]!.ts);
  });

  it('honors ?sinceTs by excluding earlier rows', async () => {
    const first = await ctx.handle.adapter.appendAuditEntry({
      actorId: null,
      action: 'story.install',
      targetKind: 'story',
      targetId: 'storyA',
      detail: '{}'
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await ctx.handle.adapter.appendAuditEntry({
      actorId: null,
      action: 'story.upgrade',
      targetKind: 'story',
      targetId: 'storyA',
      detail: '{}'
    });

    const res = await fetchAudit(ctx, `?sinceTs=${second.ts}`);
    const body = (await res.json()) as { entries: AuditEntry[] };
    const ids = body.entries.map((e) => e.id);
    expect(ids).toContain(second.id);
    expect(ids).not.toContain(first.id);
  });

  it('honors ?limit by capping the result count', async () => {
    for (let i = 0; i < 5; i++) {
      await ctx.handle.adapter.appendAuditEntry({
        actorId: null,
        action: 'identity.passcode_reset',
        targetKind: 'identity',
        targetId: `id-${i}`,
        detail: '{}'
      });
    }

    const res = await fetchAudit(ctx, '?limit=2');
    const body = (await res.json()) as { entries: AuditEntry[] };
    expect(body.entries).toHaveLength(2);
  });

  it('returns 400 invalid_query when ?limit is non-integer', async () => {
    const res = await fetchAudit(ctx, '?limit=abc');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe('invalid_query');
    expect(body.detail).toBe('limit_must_be_integer');
  });

  it('returns 400 invalid_query when ?limit is zero', async () => {
    const res = await fetchAudit(ctx, '?limit=0');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { detail: string }).detail).toBe(
      'limit_out_of_range'
    );
  });

  it('returns 400 invalid_query when ?limit exceeds the max (1000)', async () => {
    const res = await fetchAudit(ctx, '?limit=1001');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { detail: string }).detail).toBe(
      'limit_out_of_range'
    );
  });

  it('returns 400 invalid_query when ?sinceTs is non-integer', async () => {
    const res = await fetchAudit(ctx, '?sinceTs=not-a-number');
    expect(res.status).toBe(400);
    expect(((await res.json()) as { detail: string }).detail).toBe(
      'sinceTs_must_be_nonneg_integer'
    );
  });

  it('returns 400 invalid_query when ?sinceTs is negative', async () => {
    const res = await fetchAudit(ctx, '?sinceTs=-1');
    expect(res.status).toBe(400);
  });
});
