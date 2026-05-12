/**
 * @module zifmia/web/ws-client
 * @purpose Typed WebSocket client for the Zifmia `/ws` endpoint.
 *   Opens the socket with a `?token=` query (the server's only
 *   browser-friendly auth path), sends `room:subscribe` on open,
 *   parses inbound JSON frames into the server's `OutboundMessage`
 *   union, and dispatches by `type` to registered handlers.
 * @owner Zifmia web client.
 *
 * Phase 6c-client scope: subscribe + receive + dispatch + send.
 * Phase 6e adds exponential-backoff reconnect and the on-disconnect
 * UX wiring; this client deliberately does NOT reconnect on close.
 *
 * Wire shapes mirror `tools/zifmia/src/server/ws/types.ts`. The
 * client treats the server-side file as authoritative — when a new
 * `OutboundMessage` kind ships, this client's `InboundFrame` union
 * extends in the same commit.
 */

import type { ChannelTurnPacket, TurnEvent, TurnSubmitter } from './api/types';

// ── Inbound (server → client) ─────────────────────────────────────

export interface RoomSubscribedFrame {
  type: 'room:subscribed';
  roomId: string;
}

export interface RoomUnsubscribedFrame {
  type: 'room:unsubscribed';
  roomId: string;
}

export interface ChatMessageFrame {
  type: 'chat:message';
  id: string;
  roomId: string;
  fromId: string;
  fromHandle: string;
  text: string;
  ts: number;
}

export interface PresenceJoinedFrame {
  type: 'presence:joined';
  roomId: string;
  identityId: string;
  handle: string;
  /** Admin bit — drives the ADR-176 `--admin` modifier on the row. */
  isAdmin: boolean;
}

export interface PresenceLeftFrame {
  type: 'presence:left';
  roomId: string;
  identityId: string;
  handle: string;
}

export interface PresenceRosterFrame {
  type: 'presence:roster';
  roomId: string;
  participants: Array<{ identityId: string; handle: string; isAdmin: boolean }>;
}

export interface LockStateFrame {
  type: 'lock:state';
  roomId: string;
  holder: { identityId: string; handle: string } | null;
}

export interface TurnBroadcastFrame {
  type: 'turn:broadcast';
  roomId: string;
  turn: number;
  blocks: unknown[];
  events: TurnEvent[];
  channelPacket: ChannelTurnPacket;
  submitter: TurnSubmitter;
}

export interface CommandEchoFrame {
  type: 'command_echo';
  roomId: string;
  turn: number;
  submitter: TurnSubmitter;
  command: string;
}

export interface RoomRestoredFrame {
  type: 'room:restored';
  roomId: string;
  atTurn: number;
  by: TurnSubmitter;
  savedLabel: string;
}

export interface ErrorFrame {
  type: 'error';
  code:
    | 'unauthenticated'
    | 'transport_split'
    | 'invalid_message'
    | 'room_not_found'
    | 'not_subscribed'
    | 'lock_contended';
  detail?: string;
}

export type InboundFrame =
  | RoomSubscribedFrame
  | RoomUnsubscribedFrame
  | ChatMessageFrame
  | PresenceJoinedFrame
  | PresenceLeftFrame
  | PresenceRosterFrame
  | LockStateFrame
  | TurnBroadcastFrame
  | CommandEchoFrame
  | RoomRestoredFrame
  | ErrorFrame;

// ── Outbound (client → server) ────────────────────────────────────

export interface RoomSubscribeOutbound {
  type: 'room:subscribe';
  roomId: string;
}

export interface RoomUnsubscribeOutbound {
  type: 'room:unsubscribe';
  roomId: string;
}

export interface ChatSendOutbound {
  type: 'chat:send';
  roomId: string;
  text: string;
}

export interface LockAcquireOutbound {
  type: 'lock:acquire';
  roomId: string;
}

export interface LockReleaseOutbound {
  type: 'lock:release';
  roomId: string;
}

export type OutboundFrame =
  | RoomSubscribeOutbound
  | RoomUnsubscribeOutbound
  | ChatSendOutbound
  | LockAcquireOutbound
  | LockReleaseOutbound;

// ── Client ────────────────────────────────────────────────────────

export type InboundHandler = (frame: InboundFrame) => void;

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: { data?: unknown }) => void
  ): void;
  removeEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: { data?: unknown }) => void
  ): void;
}

export interface ReconnectOptions {
  /**
   * Backoff schedule in milliseconds — one entry per attempt. The
   * client uses `schedule[Math.min(attempts, schedule.length - 1)]`,
   * so the last entry doubles as the cap. Per Phase 6e plan:
   * `[500, 1000, 2000, 4000, 8000]` (capped at 8s).
   */
  backoffSchedule: number[];
  /** Max attempts before giving up. Default 10 per Phase 6e plan. */
  maxAttempts: number;
  /**
   * Fired after a reconnect attempt succeeds (the socket fires 'open'
   * for a non-first time). The RoomManager wires this to its
   * `refresh()` so server state is re-fetched and the transcript is
   * re-replayed idempotently.
   */
  onReconnect?: () => void;
  /**
   * Fired after `maxAttempts` consecutive failures. The RoomManager
   * wires this to a persistent banner so the user knows the room is
   * unrecoverable without a page reload.
   */
  onGiveUp?: () => void;
  /**
   * Scheduler — `(fn, ms) → token`. Defaults to `setTimeout`. Tests
   * inject a deterministic scheduler that runs synchronously.
   */
  scheduler?: (fn: () => void, ms: number) => number;
  /** Counterpart to `scheduler`. Defaults to `clearTimeout`. */
  clearScheduler?: (token: number) => void;
}

export interface WsClientOptions {
  /** Full WebSocket URL (e.g. `ws://127.0.0.1:3000/ws?token=...`). */
  url: string;
  /** Room id to subscribe on open. */
  roomId: string;
  /** Factory override for tests. Defaults to `new WebSocket(url)`. */
  socketFactory?: (url: string) => WebSocketLike;
  /**
   * Enable reconnect with exponential backoff. Omit for one-shot
   * sockets (the Phase 6c form). When supplied, the client schedules
   * a reopen on any close that wasn't caller-initiated.
   */
  reconnect?: ReconnectOptions;
}

/**
 * Plain-TS WebSocket client. Construct, call `open()`, register
 * handlers via `on(kind, handler)`, send via `send(frame)`. Close
 * via `close()`. Re-opening is not supported in this phase — create
 * a new instance on reconnect (Phase 6e).
 */
export class WsClient {
  private readonly options: WsClientOptions;
  private socket: WebSocketLike | null = null;
  private opened = false;
  private closedByCaller = false;
  private readonly handlers = new Map<string, Set<InboundHandler>>();
  private readonly outboundQueue: OutboundFrame[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private hasOpenedOnce = false;

  constructor(options: WsClientOptions) {
    this.options = options;
  }

  /** Number of consecutive reconnect attempts since the last successful
   * open. Exposed for tests and operator diagnostics. */
  get attempts(): number {
    return this.reconnectAttempts;
  }

  /** Open the socket. Idempotent. */
  open(): void {
    if (this.socket) return;
    this.closedByCaller = false;
    const factory =
      this.options.socketFactory ??
      ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
    const socket = factory(this.options.url);
    this.socket = socket;
    socket.addEventListener('open', this.handleOpen);
    socket.addEventListener('message', this.handleMessage);
    socket.addEventListener('close', this.handleClose);
    socket.addEventListener('error', this.handleError);
  }

  /** Send a frame. Queued until the socket is open. */
  send(frame: OutboundFrame): void {
    if (this.opened && this.socket) {
      this.socket.send(JSON.stringify(frame));
      return;
    }
    this.outboundQueue.push(frame);
  }

  /** Register a handler for inbound frames of a given kind. */
  on<K extends InboundFrame['type']>(
    kind: K,
    handler: (frame: Extract<InboundFrame, { type: K }>) => void
  ): () => void {
    const set = this.handlers.get(kind) ?? new Set<InboundHandler>();
    set.add(handler as InboundHandler);
    this.handlers.set(kind, set);
    return () => set.delete(handler as InboundHandler);
  }

  /** Close the socket. Idempotent. */
  close(): void {
    this.closedByCaller = true;
    this.cancelReconnect();
    const socket = this.socket;
    if (!socket) return;
    socket.removeEventListener('open', this.handleOpen);
    socket.removeEventListener('message', this.handleMessage);
    socket.removeEventListener('close', this.handleClose);
    socket.removeEventListener('error', this.handleError);
    try {
      socket.close();
    } catch {
      // Already closing or closed — nothing to do.
    }
    this.socket = null;
    this.opened = false;
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer === null) return;
    const opts = this.options.reconnect;
    const clear = opts?.clearScheduler ?? ((id: number) => clearTimeout(id));
    clear(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  /** `true` once `'open'` has fired and `room:subscribe` was queued. */
  get isOpen(): boolean {
    return this.opened;
  }

  private readonly handleOpen = (): void => {
    this.opened = true;
    const wasReconnect = this.hasOpenedOnce;
    this.hasOpenedOnce = true;
    this.reconnectAttempts = 0;
    // Always subscribe first so the server-side `presence:roster` /
    // `lock:state` flow has a registered subscription before any
    // other queued frame is sent.
    this.socket?.send(
      JSON.stringify({
        type: 'room:subscribe',
        roomId: this.options.roomId
      } satisfies RoomSubscribeOutbound)
    );
    while (this.outboundQueue.length > 0) {
      const next = this.outboundQueue.shift();
      if (!next) break;
      this.socket?.send(JSON.stringify(next));
    }
    // Fire onReconnect only for non-first opens — the first 'open' is
    // the initial connect and is handled by RoomManager.enter().
    if (wasReconnect) {
      this.options.reconnect?.onReconnect?.();
    }
  };

  private readonly handleMessage = (event: { data?: unknown }): void => {
    const raw = event.data;
    if (typeof raw !== 'string') return;
    let frame: InboundFrame;
    try {
      frame = JSON.parse(raw) as InboundFrame;
    } catch {
      // Malformed frame — drop. The server contract guarantees JSON.
      return;
    }
    if (!frame || typeof frame !== 'object' || typeof frame.type !== 'string') {
      return;
    }
    const set = this.handlers.get(frame.type);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(frame);
      } catch {
        // A buggy handler must not break dispatch to siblings.
      }
    }
  };

  private readonly handleClose = (): void => {
    this.opened = false;
    if (this.closedByCaller) return;
    const opts = this.options.reconnect;
    if (!opts) return;
    if (this.reconnectAttempts >= opts.maxAttempts) {
      opts.onGiveUp?.();
      return;
    }
    const schedule = opts.backoffSchedule;
    const idx = Math.min(this.reconnectAttempts, schedule.length - 1);
    const delay = schedule[idx] ?? 8000;
    this.reconnectAttempts += 1;
    const scheduler = opts.scheduler ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
    this.reconnectTimer = scheduler(() => {
      this.reconnectTimer = null;
      this.reopen();
    }, delay);
  };

  private reopen(): void {
    // Tear down any lingering socket references then construct a fresh
    // one. The existing `open()` path handles factory + listener wire-up.
    const existing = this.socket;
    if (existing) {
      existing.removeEventListener('open', this.handleOpen);
      existing.removeEventListener('message', this.handleMessage);
      existing.removeEventListener('close', this.handleClose);
      existing.removeEventListener('error', this.handleError);
      this.socket = null;
    }
    this.open();
  }

  private readonly handleError = (): void => {
    // Errors precede a close in the standard WebSocket lifecycle. The
    // close handler does the cleanup; suppress here to avoid double
    // reporting.
  };
}
