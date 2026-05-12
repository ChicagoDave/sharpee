/**
 * @module @sharpee/zifmia/server/ws/types
 * @purpose Wire-message shapes for the Zifmia WebSocket transport.
 *   Defined here once so the server-side dispatcher and (eventually)
 *   the browser client share the same TypeScript types.
 * @owner Zifmia server (tools/zifmia/server/ws). The TS file is the
 *   schema — there is no runtime validation library on the hot path
 *   yet; a Zod or JSONSchema layer is a Phase 6 concern.
 *
 * Per ADR-175 §3c–§3d the WebSocket is the *side-channel* transport
 * for events that don't fit the request/response model. Commands always
 * travel via HTTP `POST /rooms/:id/command` (AC-9) — sending
 * `command:submit` over WS is a protocol error and the server replies
 * with an `error` frame carrying `code: 'transport_split'`.
 */

// ── Inbound (client → server) ─────────────────────────────────────

/**
 * Discriminated union of every message the server accepts.
 * Phase 3d.i ships subscribe/unsubscribe and the AC-9 rejection target;
 * 3d.ii adds chat; 3d.iii adds lock acquire/release.
 */
export type InboundMessage =
  | RoomSubscribeMessage
  | RoomUnsubscribeMessage
  | ChatSendMessage
  | LockAcquireMessage
  | LockReleaseMessage
  | CommandSubmitMessage;

export interface RoomSubscribeMessage {
  type: 'room:subscribe';
  roomId: string;
}

export interface RoomUnsubscribeMessage {
  type: 'room:unsubscribe';
  roomId: string;
}

/**
 * Sent by misbehaving clients that try to submit a turn over the
 * WebSocket. The server rejects every such frame with an `error`
 * response carrying `code: 'transport_split'` and writes no state.
 * Defined in the inbound union so the dispatcher's switch coverage
 * is exhaustive and the rejection path is type-checked.
 */
export interface CommandSubmitMessage {
  type: 'command:submit';
  roomId?: string;
  command?: string;
}

/**
 * Player-to-room chat. The server persists every accepted frame via
 * the adapter's chat-log table and then fans out `chat:message` to
 * every subscriber of the room (the sender included, so the client
 * doesn't need to render its own optimistic copy — the canonical
 * version with the server-assigned id and ts always wins).
 *
 * Rejection paths land on `error`:
 *  - `invalid_message`  — text missing, non-string, empty after trim,
 *                         or longer than the wire cap (2000 chars).
 *  - `room_not_found`   — `roomId` doesn't exist in the rooms table.
 *  - `not_subscribed`   — connection has not subscribed to `roomId`.
 *    Prevents shotgun-broadcasting chat to rooms the user isn't in.
 */
export interface ChatSendMessage {
  type: 'chat:send';
  roomId: string;
  text: string;
}

/**
 * Request the typing lock for a room. Per ADR-175 §4 lock-on-typing
 * UX: when a player focuses the input box the client emits
 * `lock:acquire`; other participants render a read-only input plus
 * "<handle> is typing…" within 200 ms.
 *
 * Single-holder per room, **per connection**. Multi-tab users get
 * independent locks — closing the tab that holds the lock implicitly
 * releases it; the user's other tabs are not entitled to keep the
 * lock alive.
 *
 * Idempotent when the requester already holds the lock. On contention
 * (different holder) the server replies to the requester with a
 * `lock:state` carrying the current holder; it does not broadcast,
 * since other clients already know.
 */
export interface LockAcquireMessage {
  type: 'lock:acquire';
  roomId: string;
}

/**
 * Release the typing lock. Idempotent — no-op if the requester does
 * not hold the lock. The HTTP turn route force-releases the lock
 * after every command (success or engine throw); explicit release is
 * the UX path for "user un-focused the input."
 */
export interface LockReleaseMessage {
  type: 'lock:release';
  roomId: string;
}

// ── Outbound (server → client) ────────────────────────────────────

export type OutboundMessage =
  | RoomSubscribedMessage
  | RoomUnsubscribedMessage
  | ChatMessageMessage
  | PresenceJoinedMessage
  | PresenceLeftMessage
  | PresenceRosterMessage
  | LockStateMessage
  | TurnBroadcastMessage
  | CommandEchoMessage
  | ErrorMessage;

/**
 * Server-broadcast version of a chat post. The id and ts are assigned
 * by the adapter at persistence time so every client sees the same
 * canonical value, even if the sender's clock was off. `fromHandle`
 * is denormalized at send time per the `ChatMessage` storage shape —
 * subsequent identity renames do not retroactively edit history.
 */
export interface ChatMessageMessage {
  type: 'chat:message';
  id: string;
  roomId: string;
  fromId: string;
  fromHandle: string;
  text: string;
  ts: number;
}

/**
 * Sent to every OTHER subscriber of `roomId` when an identity first
 * arrives — first as in "no other connection from this identity is
 * already subscribed to this room." Re-arrivals from a second tab
 * are silent so the roster doesn't flap on tab churn.
 */
export interface PresenceJoinedMessage {
  type: 'presence:joined';
  roomId: string;
  identityId: string;
  handle: string;
}

/**
 * Sent to every other subscriber of `roomId` when the identity's last
 * connection unsubscribes or disconnects. Counterpart to
 * `presence:joined`; multi-tab connections do not emit `left` until
 * the final tab goes away.
 */
export interface PresenceLeftMessage {
  type: 'presence:left';
  roomId: string;
  identityId: string;
  handle: string;
}

/**
 * Sent only to the joiner immediately after `room:subscribed`. Carries
 * the current roster snapshot so the client can render the participant
 * list without waiting for the next `presence:joined`. The list
 * deduplicates identities — a participant with two open tabs appears
 * once. Sender is included in the list (clients render themselves in
 * the roster as a self-marker).
 */
export interface PresenceRosterMessage {
  type: 'presence:roster';
  roomId: string;
  participants: Array<{ identityId: string; handle: string }>;
}

/**
 * Broadcast on every change to the typing lock for `roomId`. `holder`
 * is `null` when the lock is free. Clients render the input as
 * read-only when the holder is anyone other than themselves, and
 * editable when the holder is themselves or null.
 *
 * Sent in three situations:
 *   - Broadcast to every subscriber when the lock state actually
 *     changes (acquire from free, release to free, force-release by
 *     the HTTP command route).
 *   - Sent only to the requester (no broadcast) when `lock:acquire`
 *     is rejected because someone else already holds the lock.
 */
export interface LockStateMessage {
  type: 'lock:state';
  roomId: string;
  holder: { identityId: string; handle: string } | null;
}

/**
 * Server-broadcast of a successfully-executed turn. Fired by the HTTP
 * command route to every WebSocket subscriber whose identity is NOT
 * the submitter (the submitter receives the same payload as the
 * HTTP response body, so re-broadcasting to their socket would
 * duplicate). Carries the same shape as the HTTP response
 * (`TurnPacket`) plus a `submitter` field so clients can render
 * "<submitter> typed: <command>" prelude.
 */
export interface TurnBroadcastMessage {
  type: 'turn:broadcast';
  roomId: string;
  turn: number;
  blocks: import('@sharpee/text-blocks').ITextBlock[];
  events: import('../../engine/types').TurnEvent[];
  submitter: { identityId: string; handle: string };
}

/**
 * Broadcast immediately after a turn's HTTP request lands and before
 * the resulting `turn:broadcast`. Lets observers render the input
 * line ("> look") in the transcript even though only the submitter
 * typed it. Skipped on engine-throw paths (the turn produced no
 * effect; echoing an aborted command would mislead).
 */
export interface CommandEchoMessage {
  type: 'command_echo';
  roomId: string;
  turn: number;
  submitter: { identityId: string; handle: string };
  command: string;
}

export interface RoomSubscribedMessage {
  type: 'room:subscribed';
  roomId: string;
}

export interface RoomUnsubscribedMessage {
  type: 'room:unsubscribed';
  roomId: string;
}

/**
 * Generic error envelope. `code` is the machine-parseable discriminator
 * (`unauthenticated`, `transport_split`, `invalid_message`,
 * `room_not_found`); `detail` is a human-readable hint for logs and
 * client-side diagnostics. Clients should branch on `code`, not on
 * `detail`.
 */
export interface ErrorMessage {
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
