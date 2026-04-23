/**
 * `useWebSocket` — React hook that owns the live room WebSocket connection.
 *
 * Public interface: {@link useWebSocket}, {@link UseWebSocketArgs},
 * {@link UseWebSocketResult}, {@link defaultBackoffMs}.
 *
 * Bounded context: client network layer (ADR-153 Interface Contracts).
 *
 * Responsibilities:
 *   1. Connect to `/ws/:room_id`, send `{kind:'hello', token}` on open.
 *   2. Parse incoming `ServerMsg` JSON and dispatch through `roomReducer`.
 *   3. Reconnect on non-normal close with capped exponential backoff.
 *   4. Clean unmount — close with code 1000 and suppress the reconnect path.
 *
 * Test seams — `WebSocketImpl` and `backoffMs` let unit tests drive a fake
 * socket and a zero-delay schedule without patching globals.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { roomReducer } from '../state/roomReducer';
import { initialRoomState, type RoomState } from '../state/types';
import type { ClientMsg, ServerMsg } from '../types/wire';

export type WsConnectionState = 'connecting' | 'open' | 'closed';

export interface UseWebSocketArgs {
  /** Room the socket is scoped to. Changes trigger a full reconnect. */
  roomId: string;
  /** Bearer token supplied in the `hello` intent. */
  token: string;
  /**
   * Test override for the WebSocket constructor. Production callers should
   * omit this so the browser's built-in WebSocket is used.
   */
  WebSocketImpl?: typeof WebSocket;
  /**
   * Test override for the reconnect backoff schedule. Receives the zero-based
   * attempt number and returns the delay in ms.
   */
  backoffMs?: (attempt: number) => number;
}

export interface UseWebSocketResult {
  state: RoomState;
  connection: WsConnectionState;
  /**
   * Send a client intent. When the socket is not currently OPEN the call is
   * dropped silently — the server resyncs on the next `welcome`, so callers
   * don't have to queue.
   */
  send: (msg: ClientMsg) => void;
}

/**
 * Default backoff: 250 ms, 500 ms, 1 s, 2 s, 4 s, 8 s, then capped at 10 s.
 * Jitterless on purpose — the jitter surface belongs behind ops config,
 * not hard-wired into the client.
 */
export function defaultBackoffMs(attempt: number): number {
  return Math.min(10_000, 250 * 2 ** attempt);
}

export function useWebSocket({
  roomId,
  token,
  WebSocketImpl,
  backoffMs,
}: UseWebSocketArgs): UseWebSocketResult {
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const [connection, setConnection] = useState<WsConnectionState>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  // Overrides are held in refs so changing them across renders doesn't force a
  // reconnect — the effect depends only on roomId/token.
  const wsImplRef = useRef<typeof WebSocket | undefined>(WebSocketImpl);
  const backoffRef = useRef<(attempt: number) => number>(backoffMs ?? defaultBackoffMs);
  wsImplRef.current = WebSocketImpl;
  backoffRef.current = backoffMs ?? defaultBackoffMs;

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (cancelled) return;
      setConnection('connecting');
      const Impl = wsImplRef.current ?? WebSocket;
      const ws = new Impl(`/ws/${encodeURIComponent(roomId)}`);
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnection('open');
        try {
          ws.send(JSON.stringify({ kind: 'hello', token } satisfies ClientMsg));
        } catch {
          // If send fails the server won't respond and onclose will retry.
        }
      };

      ws.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== 'string') return;
        try {
          const msg = JSON.parse(e.data) as ServerMsg;
          dispatch(msg);
        } catch {
          // Drop malformed frames — real clients should never see these.
        }
      };

      ws.onclose = (e: CloseEvent) => {
        if (socketRef.current === ws) socketRef.current = null;
        setConnection('closed');
        if (cancelled || e.code === 1000) return;
        const delay = backoffRef.current(attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // The browser always follows up with onclose; retry logic lives there.
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws && (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING)) {
        try {
          ws.close(1000, 'unmount');
        } catch {
          // Already closing — nothing to do.
        }
      }
    };
  }, [roomId, token]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  return { state, connection, send };
}
