// @vitest-environment happy-dom
/**
 * @module tests/web/ws-client.test
 * @purpose Behavior tests for `WsClient`. Asserts:
 *   - open() constructs a socket and registers listeners
 *   - on 'open', client sends `room:subscribe` for the constructed roomId
 *   - send() queues outbound frames until 'open' fires; flushes on open
 *   - on() dispatches inbound frames by `type`; returns unsubscribe
 *   - malformed inbound frames are dropped silently
 *   - close() removes listeners + closes the socket
 *   - second open() is idempotent
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WsClient, type InboundFrame, type WebSocketLike } from '../../web/src/ws-client';

interface FakeSocket extends WebSocketLike {
  emit(type: 'open' | 'message' | 'close' | 'error', event?: { data?: unknown }): void;
  sent: string[];
  closed: boolean;
}

function makeSocket(): FakeSocket {
  const listeners = new Map<string, Set<(event: { data?: unknown }) => void>>();
  const sent: string[] = [];
  return {
    readyState: 0,
    sent,
    closed: false,
    send(data: string): void {
      sent.push(data);
    },
    close(): void {
      this.closed = true;
    },
    addEventListener(type, listener): void {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type, listener): void {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event = {}): void {
      const set = listeners.get(type);
      if (!set) return;
      for (const l of set) l(event);
    }
  };
}

describe('WsClient.open / subscribe', () => {
  it('constructs a socket and sends room:subscribe on open', () => {
    const socket = makeSocket();
    const client = new WsClient({
      url: 'ws://localhost/ws?token=t',
      roomId: 'r-1',
      socketFactory: () => socket
    });
    client.open();
    expect(client.isOpen).toBe(false);
    socket.emit('open');
    expect(client.isOpen).toBe(true);
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'room:subscribe',
      roomId: 'r-1'
    });
  });

  it('open() is idempotent', () => {
    const factory = vi.fn(() => makeSocket());
    const client = new WsClient({
      url: 'ws://localhost/ws',
      roomId: 'r',
      socketFactory: factory
    });
    client.open();
    client.open();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('WsClient.send — queueing', () => {
  it('queues outbound frames until open, then flushes in order', () => {
    const socket = makeSocket();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => socket
    });
    client.open();
    client.send({ type: 'chat:send', roomId: 'r-1', text: 'a' });
    client.send({ type: 'chat:send', roomId: 'r-1', text: 'b' });
    expect(socket.sent).toHaveLength(0);
    socket.emit('open');
    // First entry is the auto room:subscribe, then the two queued chats.
    expect(socket.sent).toHaveLength(3);
    expect(JSON.parse(socket.sent[0]).type).toBe('room:subscribe');
    expect(JSON.parse(socket.sent[1]).text).toBe('a');
    expect(JSON.parse(socket.sent[2]).text).toBe('b');
  });

  it('sends immediately once open', () => {
    const socket = makeSocket();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => socket
    });
    client.open();
    socket.emit('open');
    socket.sent.length = 0;
    client.send({ type: 'lock:acquire', roomId: 'r-1' });
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0]).type).toBe('lock:acquire');
  });
});

describe('WsClient.on — dispatch', () => {
  let socket: FakeSocket;
  let client: WsClient;

  beforeEach(() => {
    socket = makeSocket();
    client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => socket
    });
    client.open();
    socket.emit('open');
  });

  it('routes frames to handlers by type', () => {
    const turnHandler = vi.fn();
    const presenceHandler = vi.fn();
    client.on('turn:broadcast', turnHandler);
    client.on('presence:joined', presenceHandler);
    const turnFrame: InboundFrame = {
      type: 'turn:broadcast',
      roomId: 'r-1',
      turn: 1,
      blocks: [],
      events: [],
      channelPacket: { kind: 'turn', turn_id: '1', payload: {} },
      submitter: { identityId: 'a', handle: 'alice' }
    };
    socket.emit('message', { data: JSON.stringify(turnFrame) });
    expect(turnHandler).toHaveBeenCalledWith(turnFrame);
    expect(presenceHandler).not.toHaveBeenCalled();
  });

  it('returns an unsubscribe function', () => {
    const handler = vi.fn();
    const unsub = client.on('chat:message', handler);
    socket.emit('message', {
      data: JSON.stringify({
        type: 'chat:message',
        id: 'm-1',
        roomId: 'r-1',
        fromId: 'a',
        fromHandle: 'alice',
        text: 'hi',
        ts: 0
      })
    });
    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
    socket.emit('message', {
      data: JSON.stringify({
        type: 'chat:message',
        id: 'm-2',
        roomId: 'r-1',
        fromId: 'a',
        fromHandle: 'alice',
        text: 'two',
        ts: 0
      })
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('drops malformed JSON without throwing', () => {
    const handler = vi.fn();
    client.on('turn:broadcast', handler);
    socket.emit('message', { data: '{not json' });
    socket.emit('message', { data: 42 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('isolates handler errors so a thrown sibling does not block dispatch', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    client.on('presence:joined', bad);
    client.on('presence:joined', good);
    socket.emit('message', {
      data: JSON.stringify({
        type: 'presence:joined',
        roomId: 'r-1',
        identityId: 'b',
        handle: 'bob'
      })
    });
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });
});

describe('WsClient.close', () => {
  it('closes the socket and detaches listeners', () => {
    const socket = makeSocket();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => socket
    });
    client.open();
    socket.emit('open');
    client.close();
    expect(socket.closed).toBe(true);
    // After close, message events are no longer dispatched.
    const handler = vi.fn();
    client.on('chat:message', handler);
    socket.emit('message', {
      data: JSON.stringify({
        type: 'chat:message',
        id: 'm',
        roomId: 'r-1',
        fromId: 'a',
        fromHandle: 'alice',
        text: 'x',
        ts: 0
      })
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('WsClient — reconnect (Phase 6e)', () => {
  /**
   * Deterministic scheduler — accumulates scheduled callbacks so the
   * test can flush them synchronously. Mirrors the contract of
   * setTimeout/clearTimeout closely enough for the WsClient's needs.
   */
  function makeScheduler() {
    let nextId = 1;
    const pending = new Map<number, () => void>();
    const scheduler = (fn: () => void, _ms: number): number => {
      const id = nextId++;
      pending.set(id, fn);
      return id;
    };
    const clearScheduler = (id: number): void => {
      pending.delete(id);
    };
    function flush(): void {
      const snapshot = [...pending.entries()];
      pending.clear();
      for (const [, fn] of snapshot) fn();
    }
    return { scheduler, clearScheduler, pending, flush };
  }

  it('re-opens the socket on an unexpected close', () => {
    let constructed = 0;
    const sockets: FakeSocket[] = [];
    const sched = makeScheduler();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => {
        const s = makeSocket();
        sockets.push(s);
        constructed++;
        return s;
      },
      reconnect: {
        backoffSchedule: [10, 20, 40, 80, 160],
        maxAttempts: 3,
        scheduler: sched.scheduler,
        clearScheduler: sched.clearScheduler
      }
    });
    client.open();
    sockets[0].emit('open');
    expect(constructed).toBe(1);
    // Unexpected close (no caller close()).
    sockets[0].emit('close');
    expect(sched.pending.size).toBe(1);
    sched.flush();
    expect(constructed).toBe(2);
    // The new socket re-subscribes on its own open event.
    sockets[1].emit('open');
    expect(sockets[1].sent[0]).toContain('"room:subscribe"');
  });

  it('fires onReconnect once on the post-reconnect open', () => {
    const onReconnect = vi.fn();
    const sockets: FakeSocket[] = [];
    const sched = makeScheduler();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => {
        const s = makeSocket();
        sockets.push(s);
        return s;
      },
      reconnect: {
        backoffSchedule: [10],
        maxAttempts: 3,
        onReconnect,
        scheduler: sched.scheduler,
        clearScheduler: sched.clearScheduler
      }
    });
    client.open();
    sockets[0].emit('open');
    expect(onReconnect).not.toHaveBeenCalled(); // first open is not a reconnect
    sockets[0].emit('close');
    sched.flush();
    sockets[1].emit('open');
    expect(onReconnect).toHaveBeenCalledTimes(1);
    // Tie the timing to the reset-to-zero counter mutation: after a
    // successful reopen, attempts must be 0 — the same state that
    // guards the wasReconnect branch.
    expect(client.attempts).toBe(0);
  });

  it('gives up after maxAttempts; fires onGiveUp; no further reopens', () => {
    const onGiveUp = vi.fn();
    let constructed = 0;
    const sockets: FakeSocket[] = [];
    const sched = makeScheduler();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => {
        const s = makeSocket();
        sockets.push(s);
        constructed++;
        return s;
      },
      reconnect: {
        backoffSchedule: [10],
        maxAttempts: 3,
        onGiveUp,
        scheduler: sched.scheduler,
        clearScheduler: sched.clearScheduler
      }
    });
    client.open();
    sockets[0].emit('open');
    // Three failed reconnects (close without an open in between).
    sockets[0].emit('close');
    sched.flush(); // attempt 1 — opens socket 1
    sockets[1].emit('close');
    sched.flush(); // attempt 2 — opens socket 2
    sockets[2].emit('close');
    sched.flush(); // attempt 3 — opens socket 3
    sockets[3].emit('close');
    // attempts === 3 now → next close exceeds maxAttempts.
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    // No further reconnect scheduled.
    expect(sched.pending.size).toBe(0);
    // 1 initial + 3 reconnect attempts = 4 sockets constructed.
    expect(constructed).toBe(4);
  });

  it('counter resets to 0 after a successful reconnect', () => {
    const sockets: FakeSocket[] = [];
    const sched = makeScheduler();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => {
        const s = makeSocket();
        sockets.push(s);
        return s;
      },
      reconnect: {
        backoffSchedule: [10],
        maxAttempts: 2,
        scheduler: sched.scheduler,
        clearScheduler: sched.clearScheduler
      }
    });
    client.open();
    sockets[0].emit('open');
    sockets[0].emit('close');
    sched.flush();
    expect(client.attempts).toBe(1);
    // Successful reconnect → attempts back to 0.
    sockets[1].emit('open');
    expect(client.attempts).toBe(0);
    // Drop again — should re-arm a full retry budget.
    sockets[1].emit('close');
    sched.flush();
    expect(client.attempts).toBe(1);
  });

  it('caller-initiated close() cancels any pending reconnect', () => {
    const sockets: FakeSocket[] = [];
    const sched = makeScheduler();
    const client = new WsClient({
      url: 'ws://x/ws',
      roomId: 'r-1',
      socketFactory: () => {
        const s = makeSocket();
        sockets.push(s);
        return s;
      },
      reconnect: {
        backoffSchedule: [10],
        maxAttempts: 5,
        scheduler: sched.scheduler,
        clearScheduler: sched.clearScheduler
      }
    });
    client.open();
    sockets[0].emit('open');
    sockets[0].emit('close');
    expect(sched.pending.size).toBe(1);
    client.close();
    expect(sched.pending.size).toBe(0);
  });
});
