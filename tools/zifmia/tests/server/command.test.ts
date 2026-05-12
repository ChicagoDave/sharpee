/**
 * @module tests/server/command.test
 * @purpose Behavior tests for `POST /rooms/:id/command` covering: happy
 *   path, AC-11 auth gating, body validation, the three classed
 *   precondition failures (room_not_found / room_closed /
 *   bundle_not_installed), and AC-13 engine-throw recovery against a
 *   real crashing fixture.
 * @owner Zifmia server tests.
 *
 * Behavior Statement covered:
 *  - DOES 1 — dispatches to executor; returns 200 with TurnPacket and
 *    persists exactly one save_blobs row.
 *  - DOES 3 — 400 invalid_body on missing/empty/non-string command.
 *  - DOES 4 — 404 room_not_found on unknown :id.
 *  - DOES 5 — 410 room_closed on closed room (no save_blob written).
 *  - DOES 7 — 500 turn_failed on engine throw (no save_blob written).
 *  - REJECTS — 401 unauthenticated when middleware fails.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  buildCrashingFixtureBundle,
  clearTinyFixtureCacheForTests,
  crashingFixtureConfig,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

interface TestCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  sessionToken: string;
  identityId: string;
  /** A room pinned to the tiny (happy-path) fixture. */
  tinyRoomId: string;
}

async function register(
  handle: ZifmiaServerHandle,
  userHandle = 'commander',
): Promise<{ sessionToken: string; identityId: string }> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' }),
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return { sessionToken: body.sessionToken, identityId: body.id };
}

async function setup(): Promise<TestCtx> {
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });

  const { sessionToken, identityId } = await register(handle);

  await handle.adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: identityId,
    bundle: await buildTinyFixtureBundle(),
  });

  const room = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'Command-Route Test Room',
    public: true,
    createdBy: identityId,
  });

  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    sessionToken,
    identityId,
    tinyRoomId: room.id,
  };
}

async function postCommand(
  ctx: TestCtx,
  roomId: string,
  body: unknown,
  options: { auth?: boolean } = { auth: true },
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.auth !== false) {
    headers.authorization = `Bearer ${ctx.sessionToken}`;
  }
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/command`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /rooms/:id/command — happy path', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    clearTinyFixtureCacheForTests();
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 200 with a TurnPacket and persists a save_blobs row', async () => {
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: 'look' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      turn: number;
      blocks: unknown[];
      events: unknown[];
    };
    expect(body.turn).toBe(1);
    expect(Array.isArray(body.blocks)).toBe(true);
    expect(body.blocks.length).toBeGreaterThan(0);

    const blob = await ctx.handle.adapter.getSaveBlobAt(ctx.tinyRoomId, 1);
    expect(blob).not.toBeNull();
    expect(blob!.payload.byteLength).toBeGreaterThan(0);
  });
});

describe('POST /rooms/:id/command — body and auth', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    clearTinyFixtureCacheForTests();
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 401 when the request has no session token', async () => {
    const res = await postCommand(
      ctx,
      ctx.tinyRoomId,
      { command: 'look' },
      { auth: false },
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unauthenticated');
  });

  it('returns 400 when the body is missing the command field', async () => {
    const res = await postCommand(ctx, ctx.tinyRoomId, {});
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail?: string };
    expect(body.error).toBe('invalid_body');
    expect(body.detail).toBe('malformed_command');
  });

  it('returns 400 when the command is an empty string', async () => {
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: '   ' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_body');
  });
});

describe('POST /rooms/:id/command — precondition failures', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    clearTinyFixtureCacheForTests();
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 404 when the room id is unknown', async () => {
    const res = await postCommand(ctx, 'no-such-room', { command: 'look' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('room_not_found');
  });

  it('returns 410 when the room is closed and writes no save_blob', async () => {
    await ctx.handle.adapter.closeRoom(ctx.tinyRoomId);
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: 'look' });
    expect(res.status).toBe(410);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('room_closed');

    const turns = await ctx.handle.adapter.listSaveBlobTurns(ctx.tinyRoomId);
    expect(turns).toEqual([]);
  });

  it('returns 500 bundle_not_installed when the room references a missing bundle', async () => {
    const ghost = await ctx.handle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: '99.99.99-missing',
      title: 'Phantom bundle room',
      public: true,
      createdBy: ctx.identityId,
    });
    const res = await postCommand(ctx, ghost.id, { command: 'look' });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('bundle_not_installed');

    const turns = await ctx.handle.adapter.listSaveBlobTurns(ghost.id);
    expect(turns).toEqual([]);
  });
});

describe('POST /rooms/:id/command — AC-13 engine-throw recovery', () => {
  let ctx: TestCtx;
  let crashRoomId: string;

  beforeEach(async () => {
    clearTinyFixtureCacheForTests();
    ctx = await setup();

    await ctx.handle.adapter.installStoryBundle({
      storyId: crashingFixtureConfig.id,
      version: crashingFixtureConfig.version,
      ifid: 'TEST-FIXTURE-CRASH-0001',
      title: crashingFixtureConfig.title,
      installedBy: ctx.identityId,
      bundle: await buildCrashingFixtureBundle(),
    });

    const room = await ctx.handle.adapter.createRoom({
      storyId: crashingFixtureConfig.id,
      bundleVersion: crashingFixtureConfig.version,
      title: 'Crash Test Room',
      public: true,
      createdBy: ctx.identityId,
    });
    crashRoomId = room.id;
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns 500 turn_failed and writes no save_blob when the engine throws', async () => {
    const res = await postCommand(ctx, crashRoomId, { command: 'look' });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('turn_failed');

    // AC-13 invariant — no row was appended for this turn.
    const turns = await ctx.handle.adapter.listSaveBlobTurns(crashRoomId);
    expect(turns).toEqual([]);
  });

  it('does not leak the room lease — a subsequent command on a healthy room succeeds', async () => {
    // After the engine-throw turn, the lease for the crash room should
    // be released by the executor's finally block. The tiny room uses a
    // separate lease, but verifying a healthy command still works is a
    // smoke check that the server is not poisoned by the prior failure.
    await postCommand(ctx, crashRoomId, { command: 'look' });
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: 'look' });
    expect(res.status).toBe(200);
  });

  it('writes no audit row when the engine throws (AC-13 + ADR-175 §OQ-6)', async () => {
    const res = await postCommand(ctx, crashRoomId, { command: 'look' });
    expect(res.status).toBe(500);
    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    const commandSubmits = entries.filter((e) => e.action === 'command.submit');
    expect(commandSubmits).toEqual([]);
  });
});

describe('POST /rooms/:id/command — Phase 5b audit emission', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    clearTinyFixtureCacheForTests();
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('appends a command.submit audit row on success with the full detail JSON', async () => {
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: 'look' });
    expect(res.status).toBe(200);

    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    const commandSubmits = entries.filter((e) => e.action === 'command.submit');
    expect(commandSubmits).toHaveLength(1);

    const entry = commandSubmits[0]!;
    expect(entry.actorId).toBe(ctx.identityId);
    expect(entry.targetKind).toBe('room');
    expect(entry.targetId).toBe(ctx.tinyRoomId);
    expect(entry.ts).toBeGreaterThan(0);

    const detail = JSON.parse(entry.detail) as {
      roomId: string;
      turn: number;
      command: string;
      submitter: { identityId: string; handle: string };
    };
    expect(detail.roomId).toBe(ctx.tinyRoomId);
    expect(detail.turn).toBe(1);
    expect(detail.command).toBe('look');
    expect(detail.submitter).toEqual({
      identityId: ctx.identityId,
      handle: 'commander',
    });
  });

  it('records distinct audit rows for back-to-back successful commands', async () => {
    await postCommand(ctx, ctx.tinyRoomId, { command: 'look' });
    await postCommand(ctx, ctx.tinyRoomId, { command: 'wait' });

    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    const commandSubmits = entries
      .filter((e) => e.action === 'command.submit')
      .sort((a, b) => a.ts - b.ts);
    expect(commandSubmits).toHaveLength(2);
    const detail0 = JSON.parse(commandSubmits[0]!.detail) as { command: string; turn: number };
    const detail1 = JSON.parse(commandSubmits[1]!.detail) as { command: string; turn: number };
    expect(detail0.command).toBe('look');
    expect(detail0.turn).toBe(1);
    expect(detail1.command).toBe('wait');
    expect(detail1.turn).toBe(2);
  });

  it('does NOT audit on body validation 400 (no turn ran)', async () => {
    const res = await postCommand(ctx, ctx.tinyRoomId, { command: '' });
    expect(res.status).toBe(400);
    const entries = await ctx.handle.adapter.listAuditEntries({ limit: 100 });
    const commandSubmits = entries.filter((e) => e.action === 'command.submit');
    expect(commandSubmits).toEqual([]);
  });
});
