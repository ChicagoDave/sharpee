/**
 * @module tests/server/command-fanout.test
 * @purpose Cross-transport behavior tests for `POST /rooms/:id/command`:
 *   after the turn lands, the route fans out `command_echo` and
 *   `turn:broadcast` to non-submitter WebSocket subscribers, then
 *   force-releases the room lock and broadcasts `lock:state { holder:
 *   null }` to everyone. The AC-13 engine-throw path skips the turn
 *   broadcasts but still releases the lock.
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — on HTTP success: `command_echo` then `turn:broadcast` to
 *    every subscriber whose identity is NOT the submitter.
 *  - DOES — on HTTP success: `lock:state { holder: null }` to every
 *    subscriber (submitter included) iff the lock was held.
 *  - DOES (AC-13) — on engine throw: no `command_echo`, no
 *    `turn:broadcast`. `lock:state { holder: null }` broadcast iff a
 *    lock was previously held.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildCrashingFixtureBundle,
  buildTinyFixtureBundle,
  clearTinyFixtureCacheForTests,
  crashingFixtureConfig,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

interface TestCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  wsBase: string;
  submitterToken: string;
  submitterId: string;
  observerToken: string;
  observerId: string;
  observerHandle: string;
  tinyRoomId: string;
}

async function registerIdentity(
  handle: ZifmiaServerHandle,
  userHandle: string,
): Promise<{ sessionToken: string; identityId: string; handle: string }> {
  const res = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: userHandle, passcode: 'a valid passcode' }),
  });
  const body = (await res.json()) as { id: string; sessionToken: string };
  return {
    sessionToken: body.sessionToken,
    identityId: body.id,
    handle: userHandle,
  };
}

async function setup(): Promise<TestCtx> {
  clearTinyFixtureCacheForTests();
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });

  const submitter = await registerIdentity(handle, 'submitter');
  const observer = await registerIdentity(handle, 'observer');

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
    title: 'Fan-out test room',
    public: true,
    createdBy: submitter.identityId,
  });

  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    wsBase: `ws://127.0.0.1:${handle.port}/ws`,
    submitterToken: submitter.sessionToken,
    submitterId: submitter.identityId,
    observerToken: observer.sessionToken,
    observerId: observer.identityId,
    observerHandle: observer.handle,
    tinyRoomId: room.id,
  };
}

interface TestSocket {
  ws: WebSocket;
  next(timeoutMs?: number): Promise<unknown>;
  send(payload: unknown): void;
  close(): Promise<void>;
}

async function openSocket(url: string): Promise<TestSocket> {
  const ws = new WebSocket(url);
  const messageQueue: unknown[] = [];
  const messageWaiters: Array<(value: unknown) => void> = [];
  let closeResolve: () => void;
  const closed = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });

  ws.on('message', (raw) => {
    const parsed = JSON.parse(raw.toString('utf-8')) as unknown;
    const waiter = messageWaiters.shift();
    if (waiter) waiter(parsed);
    else messageQueue.push(parsed);
  });
  ws.on('close', () => closeResolve());
  ws.on('error', () => {
    // swallow — close handler covers cleanup.
  });

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('close', () => resolve());
    ws.on('error', (err) => reject(err));
  }).catch(() => {
    /* close-side resolves on reject */
  });

  return {
    ws,
    next: (timeoutMs = 1500) =>
      new Promise<unknown>((resolve, reject) => {
        const queued = messageQueue.shift();
        if (queued !== undefined) {
          resolve(queued);
          return;
        }
        const timer = setTimeout(() => {
          const idx = messageWaiters.indexOf(resolveOnce);
          if (idx >= 0) messageWaiters.splice(idx, 1);
          reject(new Error(`WS next() timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        const resolveOnce = (v: unknown): void => {
          clearTimeout(timer);
          resolve(v);
        };
        messageWaiters.push(resolveOnce);
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

async function postCommand(
  ctx: TestCtx,
  roomId: string,
  command: string,
): Promise<Response> {
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ctx.submitterToken}`,
    },
    body: JSON.stringify({ command }),
  });
}

describe('POST /rooms/:id/command — fan-out on success', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('broadcasts command_echo then turn:broadcast to non-submitter subscribers', async () => {
    const observer = await openSocket(`${ctx.wsBase}?token=${ctx.observerToken}`);
    observer.send({ type: 'room:subscribe', roomId: ctx.tinyRoomId });
    await observer.next(); // room:subscribed
    await observer.next(); // presence:roster

    const res = await postCommand(ctx, ctx.tinyRoomId, 'look');
    expect(res.status).toBe(200);

    const echo = (await observer.next()) as {
      type: string;
      roomId: string;
      command: string;
      submitter: { identityId: string; handle: string };
      turn: number;
    };
    expect(echo.type).toBe('command_echo');
    expect(echo.command).toBe('look');
    expect(echo.submitter.identityId).toBe(ctx.submitterId);
    expect(echo.submitter.handle).toBe('submitter');
    expect(echo.turn).toBe(1);

    const turnBroadcast = (await observer.next()) as {
      type: string;
      roomId: string;
      turn: number;
      blocks: unknown[];
      channelPacket: { kind: string; turn_id: string };
      submitter: { identityId: string };
    };
    expect(turnBroadcast.type).toBe('turn:broadcast');
    expect(turnBroadcast.turn).toBe(1);
    expect(turnBroadcast.blocks.length).toBeGreaterThan(0);
    // Phase 6c-server: turn:broadcast carries the channel-typed packet.
    expect(turnBroadcast.channelPacket).toBeDefined();
    expect(turnBroadcast.channelPacket.kind).toBe('turn');
    expect(turnBroadcast.submitter.identityId).toBe(ctx.submitterId);

    await observer.close();
  });

  it("does not echo to the submitter's own WS connection", async () => {
    // Submitter is also subscribed via WS. They should NOT see
    // command_echo or turn:broadcast (they have the TurnPacket as
    // their HTTP response). They SHOULD see lock:state because the
    // lock state is room-wide.
    const submitterSocket = await openSocket(
      `${ctx.wsBase}?token=${ctx.submitterToken}`,
    );
    submitterSocket.send({ type: 'room:subscribe', roomId: ctx.tinyRoomId });
    await submitterSocket.next();
    await submitterSocket.next();
    // Submitter acquires lock so we have something to release.
    submitterSocket.send({ type: 'lock:acquire', roomId: ctx.tinyRoomId });
    await submitterSocket.next(); // lock:state set

    const res = await postCommand(ctx, ctx.tinyRoomId, 'look');
    expect(res.status).toBe(200);

    // Next frame on submitter's WS must be the lock:state release —
    // NOT a command_echo or turn:broadcast.
    const frame = (await submitterSocket.next()) as {
      type: string;
      holder: unknown;
    };
    expect(frame.type).toBe('lock:state');
    expect(frame.holder).toBeNull();

    await submitterSocket.close();
  });

  it('broadcasts lock:state { holder: null } when a lock was held', async () => {
    const observer = await openSocket(
      `${ctx.wsBase}?token=${ctx.observerToken}`,
    );
    observer.send({ type: 'room:subscribe', roomId: ctx.tinyRoomId });
    await observer.next();
    await observer.next();

    // Observer acquires the lock.
    observer.send({ type: 'lock:acquire', roomId: ctx.tinyRoomId });
    await observer.next(); // lock:state holder=observer

    const res = await postCommand(ctx, ctx.tinyRoomId, 'look');
    expect(res.status).toBe(200);

    // Observer receives command_echo, turn:broadcast, lock:state.
    const e1 = (await observer.next()) as { type: string };
    const e2 = (await observer.next()) as { type: string };
    const e3 = (await observer.next()) as { type: string; holder: unknown };
    expect(e1.type).toBe('command_echo');
    expect(e2.type).toBe('turn:broadcast');
    expect(e3.type).toBe('lock:state');
    expect(e3.holder).toBeNull();

    await observer.close();
  });
});

describe('POST /rooms/:id/command — AC-13 fan-out on engine throw', () => {
  let ctx: TestCtx;
  let crashRoomId: string;

  beforeEach(async () => {
    ctx = await setup();
    await ctx.handle.adapter.installStoryBundle({
      storyId: crashingFixtureConfig.id,
      version: crashingFixtureConfig.version,
      ifid: 'TEST-FIXTURE-CRASH-0001',
      title: crashingFixtureConfig.title,
      installedBy: ctx.submitterId,
      bundle: await buildCrashingFixtureBundle(),
    });
    const room = await ctx.handle.adapter.createRoom({
      storyId: crashingFixtureConfig.id,
      bundleVersion: crashingFixtureConfig.version,
      title: 'Crash fan-out room',
      public: true,
      createdBy: ctx.submitterId,
    });
    crashRoomId = room.id;
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('does not send command_echo or turn:broadcast on engine throw', async () => {
    const observer = await openSocket(`${ctx.wsBase}?token=${ctx.observerToken}`);
    observer.send({ type: 'room:subscribe', roomId: crashRoomId });
    await observer.next();
    await observer.next();

    // Observer acquires the lock so AC-13 has something to release.
    observer.send({ type: 'lock:acquire', roomId: crashRoomId });
    await observer.next(); // lock:state holder=observer

    const res = await postCommand(ctx, crashRoomId, 'look');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('turn_failed');

    // Observer must receive lock:state release — and NOT command_echo
    // or turn:broadcast.
    const frame = (await observer.next()) as {
      type: string;
      holder: unknown;
    };
    expect(frame.type).toBe('lock:state');
    expect(frame.holder).toBeNull();

    // No further frames within a short window — assert by sending a
    // chat through a separate connection and confirming observer's
    // next frame is the chat, not a stray turn:broadcast.
    const probe = await openSocket(`${ctx.wsBase}?token=${ctx.submitterToken}`);
    probe.send({ type: 'room:subscribe', roomId: crashRoomId });
    await probe.next(); // room:subscribed
    await probe.next(); // presence:roster
    await observer.next(); // observer sees presence:joined for submitter
    probe.send({ type: 'chat:send', roomId: crashRoomId, text: 'ping' });
    await probe.next(); // probe's own chat echo
    const observerNext = (await observer.next()) as {
      type: string;
      text?: string;
    };
    expect(observerNext.type).toBe('chat:message');
    expect(observerNext.text).toBe('ping');

    // AC-13 storage invariant — no save_blob row for the crash room.
    const turns = await ctx.handle.adapter.listSaveBlobTurns(crashRoomId);
    expect(turns).toEqual([]);

    await observer.close();
    await probe.close();
  });
});
