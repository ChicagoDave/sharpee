/**
 * WebSocket frame shapes per ADR-177 §3.
 *
 * Public interface: all exported types + {@link CLOSE_CODES}.
 * Owner: zifmia server, WS layer.
 *
 * The wire is JSON; every frame is `{ "type": "<kind>", ...payload }`.
 * Frame kinds are split into:
 *   - Client → Server (3 kinds): chat:send, lock:acquire, lock:release
 *   - Server → Client (6 kinds): chat:message, lock:state, turn,
 *     role_change, presence, room_restored
 *   - hello / hello:ack are the bidirectional handshake.
 *
 * `TurnPacket` is intentionally minimal in Phase 3 (the broadcast pipe
 * carries it; the engine integration that produces real channel
 * content lands in Phase 5 per the Integration Reality Statement).
 */

export const CLOSE_CODES = {
  UNKNOWN_HANDLE: 4001,
  NOT_IN_ROOM: 4003,
  ROOM_NOT_FOUND: 4004,
  HELLO_REQUIRED: 4005,
  HELLO_TIMEOUT: 4006,
  IDENTITY_ERASED: 4007
} as const;

export type WsCloseCode = typeof CLOSE_CODES[keyof typeof CLOSE_CODES];

// ─── Handshake ──────────────────────────────────────────────────────

export interface HelloFrame {
  type: 'hello';
  roomId: string;
  handle: string;
}

export interface HelloAckFrame {
  type: 'hello:ack';
  participantId: string;
  tier: 'primary_host' | 'co_host' | 'command_entrant' | 'participant';
  lockHolder: string | null;
}

// ─── Chat ───────────────────────────────────────────────────────────

export interface ChatSendFrame {
  type: 'chat:send';
  roomId: string;
  text: string;
}

export interface ChatMessageFrame {
  type: 'chat:message';
  id: string;
  roomId: string;
  fromId: string;       // identity_id
  fromHandle: string;
  text: string;
  ts: number;
}

// ─── Lock-on-typing ─────────────────────────────────────────────────

export interface LockAcquireFrame {
  type: 'lock:acquire';
  roomId: string;
}

export interface LockReleaseFrame {
  type: 'lock:release';
  roomId: string;
}

export interface LockStateFrame {
  type: 'lock:state';
  roomId: string;
  holder: string | null;        // participant_id
  expiresAt: number | null;     // ms epoch
}

// ─── Turn broadcast ─────────────────────────────────────────────────

/**
 * Minimal Phase-3 TurnPacket. The real channel-service `TurnPacket`
 * lands in Phase 5; this shape is a forward-compatible subset.
 */
export interface TurnPacket {
  turnId: string;
  channels: Record<string, unknown[]>;
}

export interface TurnFrame {
  type: 'turn';
  roomId: string;
  turnId: string;
  submitter: { id: string; handle: string };
  packet: TurnPacket;
}

// ─── Lifecycle ──────────────────────────────────────────────────────

export interface RoleChangeFrame {
  type: 'role_change';
  roomId: string;
  participantId: string;
  tier: 'primary_host' | 'co_host' | 'command_entrant' | 'participant';
  actorId?: string;
}

export interface PresenceFrame {
  type: 'presence';
  roomId: string;
  participantId: string;
  connected: boolean;
  graceDeadline?: number;
}

export interface RoomRestoredFrame {
  type: 'room_restored';
  roomId: string;
  atSaveId: string;
  byHandle: string;
}

/**
 * Mute-state change. Broadcast on POST /api/rooms/:id/mute so every
 * client in the room can grey out the muted participant in the
 * roster + suppress their cached chat lines immediately. Server-only
 * frame; clients never send it.
 */
export interface MuteStateFrame {
  type: 'mute_state';
  roomId: string;
  participantId: string;
  muted: boolean;
  actorId?: string;
}

/**
 * DM message. Broadcast only to sockets in the {primary_host, co_host}
 * tiers per ADR-153 Decision 8 (carry-forward) and AC-13. Other
 * participants never see this frame.
 */
export interface DmMessageFrame {
  type: 'dm:message';
  id: string;
  roomId: string;
  fromId: string;
  fromHandle: string;
  text: string;
  ts: number;
}

// ─── Unions ─────────────────────────────────────────────────────────

export type ClientFrame =
  | HelloFrame
  | ChatSendFrame
  | LockAcquireFrame
  | LockReleaseFrame;

export type ServerFrame =
  | HelloAckFrame
  | ChatMessageFrame
  | LockStateFrame
  | TurnFrame
  | RoleChangeFrame
  | PresenceFrame
  | RoomRestoredFrame
  | MuteStateFrame
  | DmMessageFrame;

/** Parse a JSON string into a ClientFrame, or `undefined` if invalid. */
export function parseClientFrame(raw: string): ClientFrame | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') return undefined;
  const type = (parsed as { type?: unknown }).type;
  switch (type) {
    case 'hello':
    case 'chat:send':
    case 'lock:acquire':
    case 'lock:release':
      return parsed as ClientFrame;
    default:
      return undefined;
  }
}
