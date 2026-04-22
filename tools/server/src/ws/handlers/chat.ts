/**
 * WebSocket `chat` handler.
 *
 * Public interface: {@link handleChat}, {@link ChatDeps}.
 * Bounded context: room real-time coordination (ADR-153 Decision 8, Decision 11).
 *
 * Any connected participant may send chat — tier is not checked. The only
 * silencing mechanism is the `muted` flag on the participant row. Every
 * accepted chat is persisted as a `session_events { kind: 'chat' }` row and
 * broadcast to every socket in the room; `last_activity_at` is bumped so the
 * room does not get recycled while it is in active use.
 *
 * The handler computes `ts` once and passes it to both the repository and
 * the broadcast so the persisted row and the wire frame share a single
 * source of truth.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface ChatDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  rooms: RoomsRepository;
  connections: ConnectionManager;
}

/**
 * Validate + dispatch a `chat` frame.
 *
 * Order of checks:
 *   1. text non-empty after trim
 *   2. sender still exists
 *   3. sender not muted
 *   4. persist chat event, bump last_activity, broadcast
 *
 * Errors are delivered to sender only; nothing is persisted or broadcast
 * on any rejection path.
 */
export function handleChat(
  deps: ChatDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'chat' }>
): void {
  const text = typeof msg.text === 'string' ? msg.text.trim() : '';
  if (!text) {
    sendErr(ws, 'empty_chat', 'chat requires non-empty text');
    return;
  }

  const participant = deps.participants.findById(actor.participant_id);
  if (!participant) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (participant.muted) {
    sendErr(ws, 'muted', 'you have been muted');
    return;
  }

  const ts = new Date().toISOString();
  const event_id = deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'chat',
    payload: { kind: 'chat', text },
    ts,
  });
  deps.rooms.updateLastActivity(actor.room_id, ts);

  deps.connections.broadcast(actor.room_id, {
    kind: 'chat',
    event_id,
    from: actor.participant_id,
    text,
    ts,
  });
}
