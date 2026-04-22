/**
 * WebSocket `dm` handler — private direct messages between the Primary Host
 * and any Co-Host.
 *
 * Public interface: {@link handleDm}, {@link DmDeps}.
 * Bounded context: private room coordination (ADR-153 Decision 8, Decision 11).
 *
 * Axis rule (ADR-153 Decision 8):
 *   PH  → any Co-Host : allowed
 *   Co-Host → PH      : allowed
 *   Everything else   : `dm_axis_violation`
 *
 * Every accepted DM is persisted to the session event log with the sender as
 * participant_id and the recipient's id inside the payload. The delivery is
 * targeted — only the sender and recipient sockets receive the push; other
 * participants in the room see nothing.
 *
 * The handler computes `ts` once and passes it to both the repository and
 * the two wire frames so the persisted row and what the endpoints see share
 * a single source of truth.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';
import type { Tier } from '../../repositories/types.js';
import { sendErr } from '../error-response.js';

export interface DmDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  rooms: RoomsRepository;
  connections: ConnectionManager;
}

/**
 * Return true when the sender/recipient tier pair satisfies the PH↔Co-Host
 * axis. All other combinations (including Co-Host↔Co-Host, any↔Participant,
 * Participant↔any) are rejected.
 */
function isPhCohostAxis(senderTier: Tier, recipientTier: Tier): boolean {
  return (
    (senderTier === 'primary_host' && recipientTier === 'co_host') ||
    (senderTier === 'co_host' && recipientTier === 'primary_host')
  );
}

/**
 * Validate + dispatch a `dm` frame.
 *
 * Order of checks (each early-returns with an error to sender only):
 *   1. text non-empty after trim
 *   2. sender exists
 *   3. sender not muted
 *   4. recipient exists and is in the same room
 *   5. axis is PH↔Co-Host in either direction
 *   6. persist, bump last_activity, deliver to sender + recipient sockets
 */
export function handleDm(
  deps: DmDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'dm' }>
): void {
  const text = typeof msg.text === 'string' ? msg.text.trim() : '';
  if (!text) {
    sendErr(ws, 'empty_dm', 'dm requires non-empty text');
    return;
  }

  const to_participant_id =
    typeof msg.to_participant_id === 'string' ? msg.to_participant_id : '';
  if (!to_participant_id) {
    sendErr(ws, 'bad_target', 'dm requires target participant id');
    return;
  }

  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (sender.muted) {
    sendErr(ws, 'muted', 'you have been muted');
    return;
  }

  const recipient = deps.participants.findById(to_participant_id);
  if (!recipient || recipient.room_id !== actor.room_id) {
    sendErr(ws, 'recipient_not_found', 'recipient is not in this room');
    return;
  }

  if (!isPhCohostAxis(sender.tier, recipient.tier)) {
    sendErr(
      ws,
      'dm_axis_violation',
      'direct messages are only available between the Primary Host and Co-Hosts'
    );
    return;
  }

  const ts = new Date().toISOString();
  const event_id = deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'dm',
    payload: { kind: 'dm', to_participant_id, text },
    ts,
  });
  deps.rooms.updateLastActivity(actor.room_id, ts);

  const push: ServerMsg = {
    kind: 'dm',
    event_id,
    from: actor.participant_id,
    to: to_participant_id,
    text,
    ts,
  };
  deps.connections.send(actor.participant_id, push);
  deps.connections.send(to_participant_id, push);
}
