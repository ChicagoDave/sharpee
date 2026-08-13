/**
 * @module tests/server/ws.test
 * @purpose Behavior tests for the Zifmia `/ws` route: handshake auth,
 *   room subscribe/unsubscribe lifecycle, AC-9 transport-split
 *   rejection of `command:submit`, and registry cleanup on close.
 * @owner Zifmia server tests.
 *
 * Behavior Statement coverage (rule 12):
 *  - DOES — `room:subscribe` adds the connection to the registry and
 *    replies `room:subscribed`; visible via `getActiveSubscriptionRegistry`.
 *  - DOES — `room:unsubscribe` removes from the registry; replies
 *    `room:unsubscribed`.
 *  - DOES — closing the socket triggers `removeAll` so the registry
 *    leaks no entries.
 *  - DOES (AC-9) — `command:submit` returns `error code: transport_split`
 *    and writes nothing (no save_blob, no audit row).
 *  - REJECTS — handshake without/with-invalid/with-expired token closes
 *    with 1008 + `error code: unauthenticated`.
 *  - REJECTS — malformed JSON or unknown `type` returns `invalid_message`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { getActiveSubscriptionRegistry } from '../../src/server/ws';

interface TestCtx {
  handle: ZifmiaServerHandle;
  sessionToken: string;
  identityId: string;
  wsBase: string;
  /** Pre-seeded real room ids the tests can subscribe to. Subscribe
   * now rejects unknown rooms (3d.ii), so tests must use these. */
  roomA: string;
  roomB: string;
  roomC: string;
}

async function setup(): Promise<TestCtx> {
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
  });

  const res = await fetch(
    `http://127.0.0.1:${handle.port}/identity/register`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle: 'ws-user', passcode: 'a valid passcode' }),
    },
  );
  const body = (await res.json()) as { id: string; sessionToken: string };

  // Seed three rooms. The story-library install is required because
  // `adapter.createRoom` accepts any `(storyId, bundleVersion)` pair
  // without cross-checking the library — that gate lives in the HTTP
  // POST /rooms route which we are not exercising here.
  await handle.adapter.installStoryBundle({
    storyId: 'ws-test',
    version: '1.0.0',
    ifid: 'WS-TEST',
    title: 'WS test',
    installedBy: body.id,
    bundle: new Uint8Array([0]),
  });
  const make = async (title: string): Promise<string> => {
    const r = await handle.adapter.createRoom({
      storyId: 'ws-test',
      bundleVersion: '1.0.0',
      title,
      public: true,
      createdBy: body.id,
    });
    return r.id;
  };

  return {
    handle,
    sessionToken: body.sessionToken,
    identityId: body.id,
    wsBase: `ws://127.0.0.1:${handle.port}/ws`,
    roomA: await make('room A'),
    roomB: await make('room B'),
    roomC: await make('room C'),
  };
}

/**
 * Open a WebSocket and return a handle that exposes the underlying
 * socket plus a `next()` promise that resolves with the next message
 * received. Wraps the message-event lifecycle so tests can `await`
 * server replies without writing event listeners by hand.
 */
interface TestSocket {
  ws: WebSocket;
  next(): Promise<unknown>;
  send(payload: unknown): void;
  close(): Promise<void>;
  /** Resolves when the underlying socket emits `close`. Carries the
   * close code so tests can assert on 1008 (policy violation) without
   * adding a second listener. */
  closed: Promise<number>;
}

async function openSocket(url: string): Promise<TestSocket> {
  const ws = new WebSocket(url);
  const messageQueue: unknown[] = [];
  const messageWaiters: Array<(value: unknown) => void> = [];
  let closeCode = 0;
  let closeResolve: (code: number) => void;
  const closed = new Promise<number>((resolve) => {
    closeResolve = resolve;
  });

  ws.on('message', (raw) => {
    const parsed = JSON.parse(raw.toString('utf-8')) as unknown;
    const waiter = messageWaiters.shift();
    if (waiter) waiter(parsed);
    else messageQueue.push(parsed);
  });
  ws.on('close', (code: number) => {
    closeCode = code;
    closeResolve(code);
    // Drain any waiters with a sentinel so callers don't hang.
    while (messageWaiters.length > 0) {
      const w = messageWaiters.shift();
      if (w) w({ type: '__closed', code });
    }
  });
  ws.on('error', () => {
    // Ignored — `close` handles cleanup. Without this listener Node
    // re-throws emitter errors and crashes the test process on the
    // 401 handshake path.
  });

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('close', () => resolve());
    ws.on('error', (err) => reject(err));
  }).catch(() => {
    /* swallowed — the close-side resolves on reject too */
  });

  void closeCode;

  return {
    ws,
    next: () =>
      new Promise<unknown>((resolve) => {
        const queued = messageQueue.shift();
        if (queued !== undefined) resolve(queued);
        else messageWaiters.push(resolve);
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
    closed,
  };
}

describe('GET /ws — handshake auth', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('rejects the handshake when no token is provided', async () => {
    const sock = await openSocket(ctx.wsBase);
    const msg = (await sock.next()) as { type: string; code: string };
    expect(msg.type).toBe('error');
    expect(msg.code).toBe('unauthenticated');
    const code = await sock.closed;
    expect(code).toBe(1008);
  });

  it('rejects the handshake when the token is unknown', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=not-a-real-token`);
    const msg = (await sock.next()) as { type: string; code: string };
    expect(msg.code).toBe('unauthenticated');
    expect(await sock.closed).toBe(1008);
  });

  it('rejects the handshake when the token is expired', async () => {
    // Inject an expired session directly so the test does not have to
    // wait the session-lifetime period.
    const expiredToken = 'expired-token-' + Date.now();
    await ctx.handle.adapter.createSession({
      token: expiredToken,
      identityId: ctx.identityId,
      expiresAt: Date.now() - 1000,
    });
    const sock = await openSocket(`${ctx.wsBase}?token=${expiredToken}`);
    const msg = (await sock.next()) as { type: string; code: string };
    expect(msg.code).toBe('unauthenticated');
    expect(await sock.closed).toBe(1008);
  });

  it('accepts the handshake with a valid token', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    expect(sock.ws.readyState).toBe(WebSocket.OPEN);
    await sock.close();
  });
});

describe('GET /ws — subscribe / unsubscribe lifecycle', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('adds the connection to the registry on room:subscribe', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    const ack = (await sock.next()) as { type: string; roomId: string };
    expect(ack.type).toBe('room:subscribed');
    expect(ack.roomId).toBe(ctx.roomA);
    // 3d.ii adds a `presence:roster` immediately after the ACK; drain it.
    await sock.next();

    const snapshot = getActiveSubscriptionRegistry()?.snapshot();
    expect(snapshot?.get(ctx.roomA)).toBe(1);

    await sock.close();
  });

  it('removes the connection from the registry on room:unsubscribe', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomB });
    await sock.next(); // room:subscribed
    await sock.next(); // presence:roster (3d.ii)
    sock.send({ type: 'room:unsubscribe', roomId: ctx.roomB });
    const ack = (await sock.next()) as { type: string; roomId: string };
    expect(ack.type).toBe('room:unsubscribed');

    const snapshot = getActiveSubscriptionRegistry()?.snapshot();
    expect(snapshot?.get(ctx.roomB)).toBeUndefined();

    await sock.close();
  });

  it('drops every subscription when the connection closes', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomC });
    await sock.next(); // room:subscribed
    await sock.next(); // presence:roster
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await sock.next();
    await sock.next();

    const beforeClose = getActiveSubscriptionRegistry()?.snapshot();
    expect(beforeClose?.get(ctx.roomC)).toBe(1);
    expect(beforeClose?.get(ctx.roomA)).toBe(1);

    await sock.close();

    // Yield a tick so the `close` handler fires.
    await new Promise((r) => setTimeout(r, 20));

    const afterClose = getActiveSubscriptionRegistry()?.snapshot();
    expect(afterClose?.get(ctx.roomC)).toBeUndefined();
    expect(afterClose?.get(ctx.roomA)).toBeUndefined();
  });
});

describe('GET /ws — AC-9 transport-split rejection', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('rejects command:submit with error transport_split and writes no state', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'command:submit', roomId: 'any-room', command: 'look' });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.type).toBe('error');
    expect(reply.code).toBe('transport_split');

    // AC-9 invariant — no save_blob row materialized.
    const turns = await ctx.handle.adapter.listSaveBlobTurns('any-room');
    expect(turns).toEqual([]);

    await sock.close();
  });
});

describe('GET /ws — malformed and unknown frames', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('returns invalid_message for non-JSON frames', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.ws.send('this is not json');
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('invalid_message');
    await sock.close();
  });

  it('returns invalid_message for unknown message types', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'unknown:thing', foo: 1 });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('invalid_message');
    await sock.close();
  });

  it('returns invalid_message when room:subscribe has no roomId', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe' });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('invalid_message');
    await sock.close();
  });

  it('returns room_not_found when subscribing to an unknown room', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: 'no-such-room' });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.type).toBe('error');
    expect(reply.code).toBe('room_not_found');
    await sock.close();
  });
});

// ── chat:send fan-out + persistence ───────────────────────────────

describe('GET /ws — chat:send', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  it('persists the message and fans chat:message to all subscribers (including sender)', async () => {
    // Second identity so we can observe a non-sender subscriber.
    const res = await fetch(
      `http://127.0.0.1:${ctx.handle.port}/identity/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle: 'listener',
          passcode: 'a valid passcode',
        }),
      },
    );
    const listenerBody = (await res.json()) as { sessionToken: string };

    const sender = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    const listener = await openSocket(
      `${ctx.wsBase}?token=${listenerBody.sessionToken}`,
    );

    // Both subscribe to roomA. Sender first; drain its ACKs.
    sender.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await sender.next(); // room:subscribed
    await sender.next(); // presence:roster

    listener.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await listener.next(); // room:subscribed
    await listener.next(); // presence:roster

    // Sender sees the listener's presence:joined (listener was the
    // first connection for that identity in this room).
    const senderPresence = (await sender.next()) as { type: string };
    expect(senderPresence.type).toBe('presence:joined');

    // Send a chat.
    sender.send({
      type: 'chat:send',
      roomId: ctx.roomA,
      text: 'hello world',
    });

    const senderEcho = (await sender.next()) as {
      type: string;
      text: string;
      fromHandle: string;
      id: string;
    };
    const listenerEcho = (await listener.next()) as {
      type: string;
      text: string;
      fromHandle: string;
      id: string;
    };

    expect(senderEcho.type).toBe('chat:message');
    expect(senderEcho.text).toBe('hello world');
    expect(senderEcho.fromHandle).toBe('ws-user');

    expect(listenerEcho.type).toBe('chat:message');
    expect(listenerEcho.id).toBe(senderEcho.id);
    expect(listenerEcho.text).toBe('hello world');

    // Adapter state — message persisted.
    const stored = await ctx.handle.adapter.listChatMessages(ctx.roomA);
    expect(stored.length).toBe(1);
    expect(stored[0].text).toBe('hello world');
    expect(stored[0].fromHandle).toBe('ws-user');

    await sender.close();
    await listener.close();
  });

  it('rejects chat:send with not_subscribed when not subscribed to the room', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({
      type: 'chat:send',
      roomId: ctx.roomA,
      text: 'hello',
    });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.type).toBe('error');
    expect(reply.code).toBe('not_subscribed');

    // Nothing persisted.
    const stored = await ctx.handle.adapter.listChatMessages(ctx.roomA);
    expect(stored.length).toBe(0);

    await sock.close();
  });

  it('rejects chat:send to an unknown room with room_not_found', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({
      type: 'chat:send',
      roomId: 'no-such-room',
      text: 'hello',
    });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('room_not_found');
    await sock.close();
  });

  it('rejects empty chat text with invalid_message', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await sock.next();
    await sock.next();

    sock.send({ type: 'chat:send', roomId: ctx.roomA, text: '   ' });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('invalid_message');

    const stored = await ctx.handle.adapter.listChatMessages(ctx.roomA);
    expect(stored.length).toBe(0);
    await sock.close();
  });

  it('rejects chat text longer than the wire cap with invalid_message', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await sock.next();
    await sock.next();

    sock.send({
      type: 'chat:send',
      roomId: ctx.roomA,
      text: 'x'.repeat(2001),
    });
    const reply = (await sock.next()) as { type: string; code: string };
    expect(reply.code).toBe('invalid_message');
    await sock.close();
  });
});

// ── presence broadcasts ───────────────────────────────────────────

describe('GET /ws — presence', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  async function asListener(): Promise<{ token: string; identityId: string }> {
    const res = await fetch(
      `http://127.0.0.1:${ctx.handle.port}/identity/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle: 'listener-' + Math.random().toString(36).slice(2, 8),
          passcode: 'a valid passcode',
        }),
      },
    );
    const body = (await res.json()) as {
      id: string;
      sessionToken: string;
    };
    return { token: body.sessionToken, identityId: body.id };
  }

  it('delivers presence:roster to the joiner immediately after subscribe', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    const ack = (await sock.next()) as { type: string };
    expect(ack.type).toBe('room:subscribed');
    const roster = (await sock.next()) as {
      type: string;
      participants: Array<{ identityId: string; handle: string; isAdmin: boolean }>;
    };
    expect(roster.type).toBe('presence:roster');
    expect(roster.participants.length).toBe(1);
    expect(roster.participants[0].identityId).toBe(ctx.identityId);
    expect(roster.participants[0].handle).toBe('ws-user');
    // Phase 6d: roster carries isAdmin so the joiner's PresenceManager
    // can apply the `--admin` ADR-176 modifier without an extra round trip.
    expect(roster.participants[0].isAdmin).toBe(false);
    await sock.close();
  });

  it('presence:roster reports isAdmin=true for admin-flagged identities', async () => {
    // Promote the ws-user identity to admin before subscribing.
    await ctx.handle.adapter.setIdentityAdmin(ctx.identityId, true);
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await sock.next(); // ack
    const roster = (await sock.next()) as {
      participants: Array<{ identityId: string; isAdmin: boolean }>;
    };
    expect(roster.participants[0].isAdmin).toBe(true);
    await sock.close();
  });

  it('presence:joined carries isAdmin for the joining identity', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const listener = await asListener();
    await ctx.handle.adapter.setIdentityAdmin(listener.identityId, true);
    const bSock = await openSocket(`${ctx.wsBase}?token=${listener.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();

    const joined = (await a.next()) as {
      type: string;
      identityId: string;
      isAdmin: boolean;
    };
    expect(joined.type).toBe('presence:joined');
    expect(joined.identityId).toBe(listener.identityId);
    expect(joined.isAdmin).toBe(true);

    await a.close();
    await bSock.close();
  });

  it('isAdmin is cached at WS connect — flipping admin after the socket opens does NOT affect a later subscribe', async () => {
    // Invariant: `client.identity` is captured by `authenticateUpgrade`
    // during the HTTP-upgrade handshake. Changes to the identity row
    // after that point are NOT visible to the subscription handler.
    // This locks the cache-at-connect design choice — if a future
    // change re-reads identity per subscribe, this test must be
    // updated in the same commit.
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const listener = await asListener();
    const bSock = await openSocket(`${ctx.wsBase}?token=${listener.token}`);
    // Promote AFTER bSock connected, BEFORE it subscribes.
    await ctx.handle.adapter.setIdentityAdmin(listener.identityId, true);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();

    const joined = (await a.next()) as { type: string; isAdmin: boolean };
    expect(joined.type).toBe('presence:joined');
    expect(joined.isAdmin).toBe(false);

    await a.close();
    await bSock.close();
  });

  it('broadcasts presence:joined to other subscribers on first-connection subscribe', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asListener();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();

    // Identity A receives presence:joined for identity B.
    const joined = (await a.next()) as {
      type: string;
      identityId: string;
    };
    expect(joined.type).toBe('presence:joined');
    expect(joined.identityId).toBe(b.identityId);

    await a.close();
    await bSock.close();
  });

  it('broadcasts presence:left to other subscribers on last-connection close', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asListener();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();

    // Drain the presence:joined that A receives for B.
    await a.next();

    await bSock.close();
    // Yield so the close handler runs.
    await new Promise((r) => setTimeout(r, 20));

    const left = (await a.next()) as { type: string; identityId: string };
    expect(left.type).toBe('presence:left');
    expect(left.identityId).toBe(b.identityId);

    await a.close();
  });

  it('multi-tab: second connection from the same identity does not emit presence:joined', async () => {
    // Watcher subscribed to the room first; they observe what
    // presence events fire.
    const watcher = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    watcher.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await watcher.next();
    await watcher.next();

    // Multi-tab user, first tab.
    const tabUser = await asListener();
    const tab1 = await openSocket(`${ctx.wsBase}?token=${tabUser.token}`);
    tab1.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await tab1.next();
    await tab1.next();

    // Watcher sees presence:joined for tab1's identity.
    const first = (await watcher.next()) as {
      type: string;
      identityId: string;
    };
    expect(first.type).toBe('presence:joined');
    expect(first.identityId).toBe(tabUser.identityId);

    // Same identity, second tab — must NOT emit a second presence:joined.
    const tab2 = await openSocket(`${ctx.wsBase}?token=${tabUser.token}`);
    tab2.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await tab2.next();
    await tab2.next();

    // Watcher should not see another presence event. Send a chat
    // through tab2 — the watcher's next message must be the chat,
    // not a stray presence:joined.
    tab2.send({
      type: 'chat:send',
      roomId: ctx.roomA,
      text: 'ping from tab2',
    });
    const next = (await watcher.next()) as {
      type: string;
      text?: string;
    };
    expect(next.type).toBe('chat:message');
    expect(next.text).toBe('ping from tab2');

    await tab1.close();
    await tab2.close();
    await watcher.close();
  });
});

// ── lock:acquire / lock:release ───────────────────────────────────

describe('GET /ws — lock acquire/release/state', () => {
  let ctx: TestCtx;
  beforeEach(async () => {
    ctx = await setup();
  });
  afterEach(async () => {
    await ctx.handle.close();
  });

  async function asSecond(): Promise<{ token: string; identityId: string }> {
    const res = await fetch(
      `http://127.0.0.1:${ctx.handle.port}/identity/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle: 'second-' + Math.random().toString(36).slice(2, 8),
          passcode: 'a valid passcode',
        }),
      },
    );
    const body = (await res.json()) as {
      id: string;
      sessionToken: string;
    };
    return { token: body.sessionToken, identityId: body.id };
  }

  it('acquires when free and broadcasts lock:state to all subscribers', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next(); // room:subscribed
    await a.next(); // presence:roster

    const b = await asSecond();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();

    // Drain A's presence:joined for B.
    await a.next();

    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    const aState = (await a.next()) as {
      type: string;
      holder: { identityId: string; handle: string } | null;
    };
    expect(aState.type).toBe('lock:state');
    expect(aState.holder?.identityId).toBe(ctx.identityId);

    const bState = (await bSock.next()) as {
      type: string;
      holder: { identityId: string } | null;
    };
    expect(bState.type).toBe('lock:state');
    expect(bState.holder?.identityId).toBe(ctx.identityId);

    await a.close();
    await bSock.close();
  });

  it('idempotent re-acquire sends lock:state only to the requester, no broadcast', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asSecond();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();
    await a.next(); // presence:joined for B

    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    await a.next(); // a's lock:state
    await bSock.next(); // b's lock:state from the initial acquire

    // Re-acquire — A already holds. Should NOT broadcast to B.
    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    const aState = (await a.next()) as { type: string };
    expect(aState.type).toBe('lock:state');

    // To confirm B saw nothing, send a chat from A and assert B's
    // next frame is the chat, not a stray lock:state.
    a.send({ type: 'chat:send', roomId: ctx.roomA, text: 'still mine' });
    await a.next(); // a's chat:message echo
    const bNext = (await bSock.next()) as { type: string; text?: string };
    expect(bNext.type).toBe('chat:message');
    expect(bNext.text).toBe('still mine');

    await a.close();
    await bSock.close();
  });

  it('contended acquire returns lock_contended + lock:state to the requester only', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asSecond();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();
    await a.next(); // presence:joined

    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    await a.next(); // a's lock:state
    await bSock.next(); // b's lock:state

    // B tries to acquire — denied.
    bSock.send({ type: 'lock:acquire', roomId: ctx.roomA });
    const bErr = (await bSock.next()) as { type: string; code: string };
    expect(bErr.type).toBe('error');
    expect(bErr.code).toBe('lock_contended');
    const bStateOnContend = (await bSock.next()) as {
      type: string;
      holder: { identityId: string } | null;
    };
    expect(bStateOnContend.type).toBe('lock:state');
    expect(bStateOnContend.holder?.identityId).toBe(ctx.identityId);

    // A should not have seen any extra frame — confirm by sending a
    // chat from B and checking A's next frame is the chat.
    bSock.send({ type: 'chat:send', roomId: ctx.roomA, text: 'pinging' });
    await bSock.next(); // b's chat:message echo
    const aNext = (await a.next()) as { type: string; text?: string };
    expect(aNext.type).toBe('chat:message');
    expect(aNext.text).toBe('pinging');

    await a.close();
    await bSock.close();
  });

  it('release broadcasts lock:state { holder: null } to all subscribers', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asSecond();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();
    await a.next();

    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    await a.next();
    await bSock.next();

    a.send({ type: 'lock:release', roomId: ctx.roomA });
    const aRelease = (await a.next()) as {
      type: string;
      holder: { identityId: string } | null;
    };
    expect(aRelease.type).toBe('lock:state');
    expect(aRelease.holder).toBeNull();

    const bRelease = (await bSock.next()) as {
      type: string;
      holder: { identityId: string } | null;
    };
    expect(bRelease.type).toBe('lock:state');
    expect(bRelease.holder).toBeNull();

    await a.close();
    await bSock.close();
  });

  it('disconnect with lock held broadcasts lock:state { holder: null } to remaining subscribers', async () => {
    const a = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    a.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await a.next();
    await a.next();

    const b = await asSecond();
    const bSock = await openSocket(`${ctx.wsBase}?token=${b.token}`);
    bSock.send({ type: 'room:subscribe', roomId: ctx.roomA });
    await bSock.next();
    await bSock.next();
    await a.next();

    a.send({ type: 'lock:acquire', roomId: ctx.roomA });
    await a.next();
    await bSock.next();

    await a.close();
    await new Promise((r) => setTimeout(r, 20));

    // B receives lock:state { holder: null } AND then presence:left
    // for A in some order; we accept either ordering and check for
    // both messages within two frames.
    const frames: Array<{ type: string; holder?: unknown }> = [
      (await bSock.next()) as { type: string },
      (await bSock.next()) as { type: string },
    ];
    expect(frames.some((f) => f.type === 'lock:state' && f.holder === null))
      .toBe(true);
    expect(frames.some((f) => f.type === 'presence:left')).toBe(true);

    await bSock.close();
  });

  it('lock:acquire when not subscribed returns not_subscribed', async () => {
    const sock = await openSocket(`${ctx.wsBase}?token=${ctx.sessionToken}`);
    sock.send({ type: 'lock:acquire', roomId: ctx.roomA });
    const err = (await sock.next()) as { type: string; code: string };
    expect(err.type).toBe('error');
    expect(err.code).toBe('not_subscribed');
    await sock.close();
  });
});
