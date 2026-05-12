/**
 * @module tests/server/admin-rooms.test
 * @purpose Behavior tests for `DELETE /admin/rooms/:id` (Phase 5d
 *   admin room-kill). Confirms 404/401/403 paths, idempotent close,
 *   and audit emission with the `wasAlreadyClosed` discriminator.
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
): Promise<SessionInfo> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' }),
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

interface Ctx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  admin: SessionInfo;
  mortal: SessionInfo;
  roomId: string;
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
  await handle.adapter.setIdentityAdmin(admin.identityId, true);

  // Need at least one story so room creation works; install a fake one
  // through the adapter directly (validation pipeline isn't being
  // exercised here).
  await handle.adapter.installStoryBundle({
    storyId: 'admin-rooms-fixture',
    version: '1.0.0',
    ifid: 'TEST-AR-FIXTURE',
    title: 'Admin-Rooms Fixture',
    installedBy: admin.identityId,
    bundle: new Uint8Array([0]),
  });
  const room = await handle.adapter.createRoom({
    storyId: 'admin-rooms-fixture',
    bundleVersion: '1.0.0',
    title: 'Doomed Room',
    public: true,
    createdBy: admin.identityId,
  });

  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    admin,
    mortal,
    roomId: room.id,
  };
}

async function killRoom(
  ctx: Ctx,
  roomId: string,
  bearer: string | null = ctx.admin.sessionToken,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (bearer !== null) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${ctx.baseUrl}/admin/rooms/${roomId}`, {
    method: 'DELETE',
    headers,
  });
}

describe('DELETE /admin/rooms/:id', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('401 unauthenticated without a bearer', async () => {
    const res = await killRoom(ctx, ctx.roomId, null);
    expect(res.status).toBe(401);
  });

  it('403 forbidden for non-admin', async () => {
    const res = await killRoom(ctx, ctx.roomId, ctx.mortal.sessionToken);
    expect(res.status).toBe(403);

    // Room is NOT closed
    const after = await ctx.handle.adapter.getRoom(ctx.roomId);
    expect(after?.closedAt).toBeUndefined();
  });

  it('404 room_not_found when the id is unknown', async () => {
    const res = await killRoom(ctx, 'no-such-room');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe(
      'room_not_found',
    );
  });

  it('204 + sets closedAt + audits room.kill on first kill', async () => {
    const res = await killRoom(ctx, ctx.roomId);
    expect(res.status).toBe(204);

    const after = await ctx.handle.adapter.getRoom(ctx.roomId);
    expect(after?.closedAt).toBeDefined();
    expect(after?.closedAt).toBeGreaterThan(0);

    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const kills = audit.filter((e) => e.action === 'room.kill');
    expect(kills).toHaveLength(1);
    const detail = JSON.parse(kills[0]!.detail) as {
      roomId: string;
      title: string;
      wasAlreadyClosed: boolean;
    };
    expect(detail.roomId).toBe(ctx.roomId);
    expect(detail.title).toBe('Doomed Room');
    expect(detail.wasAlreadyClosed).toBe(false);
    expect(kills[0]!.actorId).toBe(ctx.admin.identityId);
  });

  it('204 idempotent re-kill; audit row records wasAlreadyClosed=true', async () => {
    expect((await killRoom(ctx, ctx.roomId)).status).toBe(204);
    const closedAtFirst = (await ctx.handle.adapter.getRoom(ctx.roomId))!.closedAt;

    const res = await killRoom(ctx, ctx.roomId);
    expect(res.status).toBe(204);

    // closed_at not overwritten by the second call
    const closedAtSecond = (await ctx.handle.adapter.getRoom(ctx.roomId))!.closedAt;
    expect(closedAtSecond).toBe(closedAtFirst);

    const audit = await ctx.handle.adapter.listAuditEntries({ limit: 10 });
    const kills = audit
      .filter((e) => e.action === 'room.kill')
      .sort((a, b) => a.ts - b.ts);
    expect(kills).toHaveLength(2);
    const detail0 = JSON.parse(kills[0]!.detail) as { wasAlreadyClosed: boolean };
    const detail1 = JSON.parse(kills[1]!.detail) as { wasAlreadyClosed: boolean };
    expect(detail0.wasAlreadyClosed).toBe(false);
    expect(detail1.wasAlreadyClosed).toBe(true);
  });

  it('preserves chat history and save_blobs (soft-close, not delete)', async () => {
    // Pre-existing chat + save_blob rows
    await ctx.handle.adapter.appendChatMessage({
      roomId: ctx.roomId,
      fromId: ctx.admin.identityId,
      fromHandle: 'overseer',
      text: 'pre-kill message',
      ts: Date.now(),
    });
    await ctx.handle.adapter.appendSaveBlob({
      roomId: ctx.roomId,
      turn: 1,
      formatVersion: 3,
      bundleVersion: '1.0.0',
      payload: new Uint8Array([1, 2, 3]),
    });

    expect((await killRoom(ctx, ctx.roomId)).status).toBe(204);

    const chat = await ctx.handle.adapter.listChatMessages(ctx.roomId);
    expect(chat).toHaveLength(1);
    expect(chat[0]!.text).toBe('pre-kill message');
    const turns = await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId);
    expect(turns).toEqual([1]);
  });
});
