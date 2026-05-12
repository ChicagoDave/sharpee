/**
 * @module tests/server/restore.test
 * @purpose Behavior tests for `POST /rooms/:id/restore` (Phase 4c /
 *   AC-6). Covers the destructive-rollback semantics, error mapping,
 *   adapter-level truncation, and WS fan-out.
 *
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — resolves `{saveId}` → target turn, truncates save_blobs
 *    and named_saves beyond that turn, returns a TurnPacket-shaped
 *    `{turn, blocks: [], events: []}` with the target turn.
 *  - DOES — after restore, `getLatestSaveBlob` is the target; later
 *    turns and named saves pointing past them are gone; named saves
 *    at/before the target are preserved.
 *  - DOES — `room:restored` broadcast to subscribers whose identity
 *    is NOT the submitter; `lock:state {holder: null}` to everyone.
 *  - REJECTS WHEN — body missing saveId (400); room not found (404);
 *    save not found (404); save belongs to a different room (409);
 *    target save_blob row missing or undecodable (500, lock still
 *    released); missing auth (401).
 *  - INVARIANT — the room's truncation runs inside the per-room
 *    lease so a concurrent `POST /command` cannot race.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { clearStoryCacheForTests } from '../../src/engine/bundle-loader';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

interface TestCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  wsBase: string;
  submitterToken: string;
  submitterId: string;
  submitterHandle: string;
  observerToken: string;
  observerId: string;
  roomId: string;
  otherRoomId: string;
}

async function registerIdentity(
  handle: ZifmiaServerHandle,
  userHandle: string,
): Promise<{ sessionToken: string; identityId: string; handle: string }> {
  const res = await fetch(
    `http://127.0.0.1:${handle.port}/identity/register`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' }),
    },
  );
  const body = (await res.json()) as { id: string; sessionToken: string };
  return {
    sessionToken: body.sessionToken,
    identityId: body.id,
    handle: userHandle,
  };
}

async function setup(): Promise<TestCtx> {
  clearStoryCacheForTests();
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });

  const submitter = await registerIdentity(handle, 'restore-submitter');
  const observer = await registerIdentity(handle, 'restore-observer');

  await handle.adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: submitter.identityId,
    bundle: await buildTinyFixtureBundle(),
  });

  const room = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'restore room',
    public: true,
    createdBy: submitter.identityId,
  });
  const other = await handle.adapter.createRoom({
    storyId: tinyFixtureConfig.id,
    bundleVersion: tinyFixtureConfig.version,
    title: 'restore other room',
    public: true,
    createdBy: submitter.identityId,
  });

  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    wsBase: `ws://127.0.0.1:${handle.port}/ws`,
    submitterToken: submitter.sessionToken,
    submitterId: submitter.identityId,
    submitterHandle: submitter.handle,
    observerToken: observer.sessionToken,
    observerId: observer.identityId,
    roomId: room.id,
    otherRoomId: other.id,
  };
}

async function postCommand(ctx: TestCtx, roomId: string): Promise<void> {
  const res = await fetch(`${ctx.baseUrl}/rooms/${roomId}/command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ctx.submitterToken}`,
    },
    body: JSON.stringify({ command: 'look' }),
  });
  if (res.status !== 200) {
    throw new Error(`postCommand: status ${res.status}`);
  }
  await res.json();
}

async function postSave(
  ctx: TestCtx,
  roomId: string,
  label: string,
  atTurn?: number,
): Promise<{ saveId: string; atTurn: number; label: string }> {
  const body: Record<string, unknown> = { label };
  if (atTurn !== undefined) body.atTurn = atTurn;
  const res = await fetch(`${ctx.baseUrl}/rooms/${roomId}/saves`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ctx.submitterToken}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status !== 201) {
    throw new Error(`postSave: status ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as {
    saveId: string;
    atTurn: number;
    label: string;
  };
}

async function postRestore(
  ctx: TestCtx,
  roomId: string,
  body: unknown,
  opts: { auth?: boolean } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth !== false) {
    headers.authorization = `Bearer ${ctx.submitterToken}`;
  }
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/restore`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /rooms/:id/restore — destructive rollback', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('rolls the room back to the named save turn and returns an empty TurnPacket', async () => {
    // Build a 4-turn history with a save pinned at turn 2.
    for (let i = 0; i < 4; i++) await postCommand(ctx, ctx.roomId);
    const save = await postSave(ctx, ctx.roomId, 'midpoint', 2);
    expect(save.atTurn).toBe(2);

    const res = await postRestore(ctx, ctx.roomId, { saveId: save.saveId });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      turn: number;
      blocks: unknown[];
      events: unknown[];
    };
    expect(body.turn).toBe(2);
    expect(body.blocks).toEqual([]);
    expect(body.events).toEqual([]);

    // Adapter state proves the truncation actually ran.
    const remainingTurns = await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId);
    expect(remainingTurns).toEqual([1, 2]);

    const latest = await ctx.handle.adapter.getLatestSaveBlob(ctx.roomId);
    expect(latest).not.toBeNull();
    expect(latest!.turn).toBe(2);
  });

  it('keeps named saves at/before the target and removes ones pointing past it', async () => {
    for (let i = 0; i < 5; i++) await postCommand(ctx, ctx.roomId);
    const early = await postSave(ctx, ctx.roomId, 'early', 1);
    const target = await postSave(ctx, ctx.roomId, 'target', 3);
    const future = await postSave(ctx, ctx.roomId, 'future', 5);

    const res = await postRestore(ctx, ctx.roomId, { saveId: target.saveId });
    expect(res.status).toBe(200);

    const remaining = await ctx.handle.adapter.listNamedSaves(ctx.roomId);
    const ids = remaining.map((s) => s.saveId).sort();
    expect(ids).toEqual([early.saveId, target.saveId].sort());

    expect(await ctx.handle.adapter.getNamedSave(future.saveId)).toBeNull();
  });

  it('next /command after restore writes turn = target + 1', async () => {
    for (let i = 0; i < 3; i++) await postCommand(ctx, ctx.roomId);
    const save = await postSave(ctx, ctx.roomId, 'pin', 2);
    const restoreRes = await postRestore(ctx, ctx.roomId, { saveId: save.saveId });
    expect(restoreRes.status).toBe(200);

    const cmd = await fetch(`${ctx.baseUrl}/rooms/${ctx.roomId}/command`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${ctx.submitterToken}`,
      },
      body: JSON.stringify({ command: 'look' }),
    });
    expect(cmd.status).toBe(200);
    const packet = (await cmd.json()) as { turn: number };
    expect(packet.turn).toBe(3);

    const turns = await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId);
    expect(turns).toEqual([1, 2, 3]);
  });

  it('rejects malformed bodies', async () => {
    await postCommand(ctx, ctx.roomId);
    await postSave(ctx, ctx.roomId, 's', 1);

    for (const bad of [
      {},
      { saveId: '' },
      { saveId: '   ' },
      { saveId: 42 },
      '"not an object"',
    ]) {
      const res = await postRestore(ctx, ctx.roomId, bad as unknown);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('invalid_body');
    }

    // Adapter state unchanged.
    const turns = await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId);
    expect(turns).toEqual([1]);
  });

  it('returns 404 when the room is unknown', async () => {
    const res = await postRestore(ctx, 'no-such-room', { saveId: 'x' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('room_not_found');
  });

  it('returns 404 when the saveId does not exist', async () => {
    const res = await postRestore(ctx, ctx.roomId, { saveId: 'never-existed' });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('save_not_found');
  });

  it('returns 409 when the save belongs to a different room', async () => {
    await postCommand(ctx, ctx.otherRoomId);
    const otherSave = await postSave(ctx, ctx.otherRoomId, 'wrong room', 1);

    await postCommand(ctx, ctx.roomId);
    const res = await postRestore(ctx, ctx.roomId, { saveId: otherSave.saveId });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('save_room_mismatch');

    // No truncation occurred — the other room's history is intact.
    const otherTurns = await ctx.handle.adapter.listSaveBlobTurns(ctx.otherRoomId);
    expect(otherTurns).toEqual([1]);
    const thisTurns = await ctx.handle.adapter.listSaveBlobTurns(ctx.roomId);
    expect(thisTurns).toEqual([1]);
  });

  it('returns 401 without a session token', async () => {
    const res = await postRestore(ctx, ctx.roomId, { saveId: 'x' }, { auth: false });
    expect(res.status).toBe(401);
  });
});

// ── WebSocket fan-out ───────────────────────────────────────────

interface TestSocket {
  ws: WebSocket;
  next(timeoutMs?: number): Promise<unknown>;
  send(payload: unknown): void;
  close(): Promise<void>;
}

async function openSocket(url: string): Promise<TestSocket> {
  const ws = new WebSocket(url);
  const queue: unknown[] = [];
  const waiters: Array<(v: unknown) => void> = [];
  let closeResolve: () => void;
  const closed = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });
  ws.on('message', (raw) => {
    const parsed = JSON.parse(raw.toString('utf-8')) as unknown;
    const waiter = waiters.shift();
    if (waiter) waiter(parsed);
    else queue.push(parsed);
  });
  ws.on('close', () => closeResolve());
  ws.on('error', () => {
    /* swallow */
  });
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('close', () => resolve());
    ws.on('error', (err) => reject(err));
  }).catch(() => undefined);
  return {
    ws,
    next: (timeoutMs = 1500) =>
      new Promise<unknown>((resolve, reject) => {
        const queued = queue.shift();
        if (queued !== undefined) {
          resolve(queued);
          return;
        }
        const timer = setTimeout(() => {
          const idx = waiters.indexOf(resolveOnce);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error(`WS next() timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        const resolveOnce = (v: unknown): void => {
          clearTimeout(timer);
          resolve(v);
        };
        waiters.push(resolveOnce);
      }),
    send(payload: unknown) {
      ws.send(JSON.stringify(payload));
    },
    async close() {
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close();
      }
      await closed;
    },
  };
}

describe('POST /rooms/:id/restore — WS fan-out', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it("broadcasts room:restored to non-submitter subscribers and lock:state to all", async () => {
    for (let i = 0; i < 3; i++) await postCommand(ctx, ctx.roomId);
    const save = await postSave(ctx, ctx.roomId, 'rewind-here', 1);

    const observer = await openSocket(
      `${ctx.wsBase}?token=${ctx.observerToken}`,
    );
    observer.send({ type: 'room:subscribe', roomId: ctx.roomId });
    await observer.next(); // room:subscribed
    await observer.next(); // presence:roster

    // Submitter holds the typing lock so we observe the release.
    const submitterSocket = await openSocket(
      `${ctx.wsBase}?token=${ctx.submitterToken}`,
    );
    submitterSocket.send({ type: 'room:subscribe', roomId: ctx.roomId });
    await submitterSocket.next(); // room:subscribed
    await submitterSocket.next(); // presence:roster
    // Observer also sees presence:joined when the submitter subscribed.
    await observer.next();

    submitterSocket.send({ type: 'lock:acquire', roomId: ctx.roomId });
    await submitterSocket.next(); // lock:state set, holder = submitter
    // Observer sees the same lock:state broadcast.
    await observer.next();

    const res = await postRestore(ctx, ctx.roomId, { saveId: save.saveId });
    expect(res.status).toBe(200);

    // Observer: first frame should be room:restored (identity-exclusion
    // skips the submitter, not the observer), then lock:state.
    const restored = (await observer.next()) as {
      type: string;
      roomId: string;
      atTurn: number;
      by: { identityId: string; handle: string };
      savedLabel: string;
    };
    expect(restored.type).toBe('room:restored');
    expect(restored.roomId).toBe(ctx.roomId);
    expect(restored.atTurn).toBe(1);
    expect(restored.by.identityId).toBe(ctx.submitterId);
    expect(restored.by.handle).toBe(ctx.submitterHandle);
    expect(restored.savedLabel).toBe('rewind-here');

    const observerLock = (await observer.next()) as {
      type: string;
      holder: unknown;
    };
    expect(observerLock.type).toBe('lock:state');
    expect(observerLock.holder).toBeNull();

    // Submitter: must NOT see room:restored (they have the HTTP
    // response). Their next frame is the lock release.
    const submitterFrame = (await submitterSocket.next()) as {
      type: string;
      holder: unknown;
    };
    expect(submitterFrame.type).toBe('lock:state');
    expect(submitterFrame.holder).toBeNull();

    await observer.close();
    await submitterSocket.close();
  });
});
