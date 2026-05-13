/**
 * WebSocket client — lifecycle, hello handshake, frame dispatch, and
 * reconnect-with-backoff for the zifmia web client.
 *
 * Public interface: {@link WsClient}, {@link createWsClient}.
 * Owner: web client.
 *
 * Per ADR-177 §3: every connection begins with `hello { roomId,
 * handle }` and the client treats close codes 4001/4003/4004/4005/4006/4007
 * as terminal (no auto-reconnect — the cause needs human/UI handling).
 * Generic socket errors / network drops trigger backoff reconnect; the
 * server resolves to the same `participant_id` per AC-11.
 */

import type {
  ServerFrame,
  ClientFrame,
  HelloFrame,
  WsCloseCode
} from '../../src/ws/types.js';

export type WsClientStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed';

export interface WsClientEvents {
  /** Every server-emitted frame after `hello:ack`. */
  onFrame?: (frame: ServerFrame) => void;
  /** Status transitions (UI surfaces the connecting/closed states). */
  onStatus?: (status: WsClientStatus) => void;
  /** Terminal close codes (4001/4003/4004/4005/4006/4007). */
  onTerminalClose?: (code: WsCloseCode | number, reason: string) => void;
  /** The participant_id resolved by the server's hello:ack. */
  onHelloAck?: (info: { participantId: string; tier: string; lockHolder: string | null }) => void;
}

export interface WsClientOptions {
  url: string;
  hello: Omit<HelloFrame, 'type'>;
  events?: WsClientEvents;
  /** Initial backoff in ms (doubles up to maxBackoffMs). */
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

const TERMINAL_CODES = new Set<number>([4001, 4003, 4004, 4005, 4006, 4007]);

export interface WsClient {
  open(): void;
  send(frame: ClientFrame): void;
  close(): void;
  status(): WsClientStatus;
}

export function createWsClient(options: WsClientOptions): WsClient {
  let socket: WebSocket | null = null;
  let status: WsClientStatus = 'idle';
  let terminal = false;
  let backoffMs = options.initialBackoffMs ?? 500;
  const maxBackoffMs = options.maxBackoffMs ?? 10_000;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function setStatus(next: WsClientStatus): void {
    if (status === next) return;
    status = next;
    options.events?.onStatus?.(next);
  }

  function scheduleReconnect(): void {
    if (terminal) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
      open();
    }, backoffMs);
  }

  function open(): void {
    if (status === 'open' || status === 'connecting') return;
    setStatus('connecting');
    const ws = new WebSocket(options.url);
    socket = ws;

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'hello', ...options.hello } satisfies HelloFrame));
    });

    ws.addEventListener('message', (event) => {
      let frame: ServerFrame;
      try {
        frame = JSON.parse(typeof event.data === 'string' ? event.data : '') as ServerFrame;
      } catch { return; }

      if (frame.type === 'hello:ack') {
        setStatus('open');
        backoffMs = options.initialBackoffMs ?? 500;
        options.events?.onHelloAck?.({
          participantId: frame.participantId,
          tier: frame.tier,
          lockHolder: frame.lockHolder
        });
        return;
      }
      options.events?.onFrame?.(frame);
    });

    ws.addEventListener('close', (event) => {
      socket = null;
      const code = event.code;
      const reason = event.reason ?? '';
      if (TERMINAL_CODES.has(code)) {
        terminal = true;
        setStatus('closed');
        options.events?.onTerminalClose?.(code as WsCloseCode, reason);
        return;
      }
      if (terminal) {
        setStatus('closed');
        return;
      }
      setStatus('closed');
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // Browsers fire 'error' before 'close' on most disconnect causes;
      // do nothing here and let the close handler drive state.
    });
  }

  return {
    open,
    send(frame) {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify(frame));
    },
    close() {
      terminal = true;
      setStatus('closing');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      setStatus('closed');
    },
    status: () => status
  };
}
