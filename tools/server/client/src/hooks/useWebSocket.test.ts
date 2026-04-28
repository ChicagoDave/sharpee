/**
 * useWebSocket behaviour tests.
 *
 * Behavior Statement — useWebSocket
 *   DOES: opens a WebSocket at `/ws/:room_id`; on open sends a `hello`
 *         intent carrying the persistent identity (handle, passcode) per
 *         ADR-161; parses each incoming JSON frame as a
 *         `ServerMsg` and dispatches it through `roomReducer` so `state`
 *         reflects server pushes; exposes `send` that JSON-serialises a
 *         `ClientMsg` onto the open socket; on non-normal close, reconnects
 *         after `backoffMs(attempt)` ms and re-sends `hello`; on unmount
 *         closes with code 1000 and does not schedule another reconnect.
 *   WHEN: the hook is mounted under React.
 *   BECAUSE: the WebSocket is the authoritative live channel for room state
 *            (ADR-153 Interface Contracts).
 *   REJECTS WHEN: `send()` while the socket is not OPEN is dropped silently
 *                 (server resyncs on next welcome).
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebSocket } from './useWebSocket';
import type { ServerMsg } from '../types/wire';

// ---------- minimal WebSocket test double ----------

type Listener<E> = ((ev: E) => void) | null;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState: number = FakeWebSocket.CONNECTING;
  url: string;
  sent: string[] = [];

  onopen: Listener<Event> = null;
  onmessage: Listener<MessageEvent> = null;
  onclose: Listener<CloseEvent> = null;
  onerror: Listener<Event> = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('not open');
    this.sent.push(data);
  }

  close(code = 1000, _reason?: string): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: true } as CloseEvent);
  }

  // ----- test helpers -----

  simulateOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({} as Event);
  }
  simulateMessage(msg: ServerMsg): void {
    this.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent);
  }
  simulateServerClose(code = 1006): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: false } as CloseEvent);
  }

  static instances: FakeWebSocket[] = [];
  static reset(): void {
    this.instances = [];
  }
  static latest(): FakeWebSocket {
    const last = this.instances[this.instances.length - 1];
    if (!last) throw new Error('no FakeWebSocket instances created');
    return last;
  }
}

const FakeWsImpl = FakeWebSocket as unknown as typeof WebSocket;

const welcomeMsg: ServerMsg = {
  kind: 'welcome',
  participant_id: 'p-guest',
  room: {
    room_id: 'room-1',
    title: 'Test Session',
    story_slug: 'zork',
    pinned: false,
    last_activity_at: '2026-04-22T17:00:00Z',
    lock_holder_id: null,
    saves: [],
    world: '{}',
  },
  participants: [
    {
      participant_id: 'p-guest',
      handle: 'Guest',
      tier: 'participant',
      connected: true,
      muted: false,
    },
  ],
  recording_notice: 'Recorded.',
  chat_backlog: [],
  dm_threads: {},
};

describe('useWebSocket', () => {
  beforeEach(() => {
    FakeWebSocket.reset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects to /ws/:room_id and sends hello with handle+passcode on open', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
        backoffMs: () => 0,
      }),
    );

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.latest().url).toBe('/ws/room-1');
    expect(result.current.connection).toBe('connecting');

    act(() => {
      FakeWebSocket.latest().simulateOpen();
    });

    expect(result.current.connection).toBe('open');
    expect(FakeWebSocket.latest().sent).toEqual([
      JSON.stringify({ kind: 'hello', handle: 'Alice', passcode: 'plate-music' }),
    ]);
  });

  it('URL-encodes room ids containing special characters', () => {
    renderHook(() =>
      useWebSocket({
        roomId: 'room/with space',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
      }),
    );
    expect(FakeWebSocket.latest().url).toBe('/ws/room%2Fwith%20space');
  });

  it('incoming welcome message hydrates state via the reducer', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
      }),
    );
    act(() => {
      FakeWebSocket.latest().simulateOpen();
      FakeWebSocket.latest().simulateMessage(welcomeMsg);
    });
    expect(result.current.state.hydrated).toBe(true);
    expect(result.current.state.selfId).toBe('p-guest');
    expect(result.current.state.room?.room_id).toBe('room-1');
  });

  it('send() serialises a ClientMsg onto the open socket', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
      }),
    );
    act(() => {
      FakeWebSocket.latest().simulateOpen();
    });
    act(() => {
      result.current.send({ kind: 'submit_command', text: 'look' });
    });
    expect(FakeWebSocket.latest().sent).toContain(
      JSON.stringify({ kind: 'submit_command', text: 'look' }),
    );
  });

  it('send() while not OPEN is dropped silently', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
      }),
    );
    // Do not simulate open — readyState still CONNECTING.
    act(() => {
      result.current.send({ kind: 'submit_command', text: 'look' });
    });
    expect(FakeWebSocket.latest().sent).toEqual([]);
  });

  it('reconnects on non-normal close after backoffMs(attempt)', () => {
    const backoff = vi.fn().mockReturnValue(500);
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
        backoffMs: backoff,
      }),
    );
    act(() => {
      FakeWebSocket.latest().simulateOpen();
      FakeWebSocket.latest().simulateServerClose(1006);
    });
    expect(result.current.connection).toBe('closed');
    expect(backoff).toHaveBeenCalledWith(0);
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(result.current.connection).toBe('connecting');

    act(() => {
      FakeWebSocket.latest().simulateOpen();
    });

    // Re-issues hello so the server replies with a fresh welcome.
    expect(FakeWebSocket.latest().sent).toEqual([
      JSON.stringify({ kind: 'hello', handle: 'Alice', passcode: 'plate-music' }),
    ]);
  });

  it('backoff attempt counter increments until a successful open resets it', () => {
    const backoff = vi.fn().mockReturnValue(100);
    renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
        backoffMs: backoff,
      }),
    );
    // Attempt 0: fail before open.
    act(() => {
      FakeWebSocket.latest().simulateServerClose(1006);
    });
    expect(backoff).toHaveBeenLastCalledWith(0);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Attempt 1: fail again.
    act(() => {
      FakeWebSocket.latest().simulateServerClose(1006);
    });
    expect(backoff).toHaveBeenLastCalledWith(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // This time succeed — counter should reset on open.
    act(() => {
      FakeWebSocket.latest().simulateOpen();
      FakeWebSocket.latest().simulateServerClose(1006);
    });
    expect(backoff).toHaveBeenLastCalledWith(0);
  });

  it('unmount closes the socket with code 1000 and does not reconnect', () => {
    const backoff = vi.fn().mockReturnValue(100);
    const { unmount } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
        backoffMs: backoff,
      }),
    );
    const ws = FakeWebSocket.latest();
    act(() => {
      ws.simulateOpen();
    });
    const closeSpy = vi.spyOn(ws, 'close');
    unmount();
    expect(closeSpy).toHaveBeenCalledWith(1000, 'unmount');
    // Advance well past any backoff window — no new instance should appear.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(backoff).not.toHaveBeenCalled();
  });

  it('malformed JSON frames are dropped without throwing', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: 'room-1',
        handle: 'Alice', passcode: 'plate-music',
        WebSocketImpl: FakeWsImpl,
      }),
    );
    act(() => {
      FakeWebSocket.latest().simulateOpen();
      FakeWebSocket.latest().onmessage?.({ data: 'not json' } as MessageEvent);
    });
    expect(result.current.state.hydrated).toBe(false);
  });
});
