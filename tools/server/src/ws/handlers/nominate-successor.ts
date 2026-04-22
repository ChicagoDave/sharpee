/**
 * WebSocket `nominate_successor` handler.
 *
 * Public interface: {@link handleNominateSuccessor}, {@link NominateSuccessorDeps}.
 * Bounded context: role hierarchy (ADR-153 Decision 6 — cascading succession).
 *
 * Authority: only the Primary Host may designate the successor.
 *
 * Invariant preserved: at most one participant per room has `is_successor = 1`
 * at any time. If a different Co-Host is currently the successor, this
 * handler clears their flag in the same transaction before setting the new
 * target's flag.
 *
 * Invariant enforced: only `co_host` participants may be successors —
 * targeting any other tier (participant, command_entrant) returns `not_co_host`.
 * That matches the state machine in `performSuccession` which assumes the
 * successor is a Co-Host ready to move up to Primary Host.
 *
 * Audience: `successor` pushes are broadcast to every connection in the
 * room. Participants benefit from knowing who the backup is; the plan is
 * silent on this point for explicit nominations (it specifies PH-only for
 * the first-join auto-nomination case; explicit nominations are broadcast
 * here for visibility).
 */

import type { WebSocket } from 'ws';
import type { Database } from 'better-sqlite3';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface NominateSuccessorDeps {
  db: Database;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

/**
 * Process a `nominate_successor` frame.
 *
 * Order of checks:
 *   1. target_participant_id non-empty
 *   2. sender known + not muted
 *   3. sender is primary_host
 *   4. target exists, in same room, tier = co_host
 *   5. target is not already the successor
 *   6. in one tx: clear prior successor (if any); set target; append event
 *   7. broadcast `successor { participant_id }` to the room
 */
export function handleNominateSuccessor(
  deps: NominateSuccessorDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'nominate_successor' }>
): void {
  if (
    typeof msg.target_participant_id !== 'string' ||
    msg.target_participant_id.length === 0
  ) {
    sendErr(
      ws,
      'bad_target',
      'nominate_successor.target_participant_id must be a non-empty string'
    );
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
  if (sender.tier !== 'primary_host') {
    sendErr(ws, 'insufficient_authority', 'only primary_host may nominate a successor');
    return;
  }

  const target = deps.participants.findById(msg.target_participant_id);
  if (!target || target.room_id !== actor.room_id) {
    sendErr(ws, 'unknown_target_participant', 'target is not a member of this room');
    return;
  }
  if (target.tier !== 'co_host') {
    sendErr(ws, 'not_co_host', 'only co_host participants may be nominated as successor');
    return;
  }
  if (target.is_successor) {
    sendErr(ws, 'already_successor', 'target is already the designated successor');
    return;
  }

  // Find the current successor (if any) to clear.
  const priorSuccessor = deps.participants
    .listForRoom(actor.room_id)
    .find((p) => p.is_successor && p.participant_id !== target.participant_id);

  const tx = deps.db.transaction(() => {
    if (priorSuccessor) {
      deps.participants.setIsSuccessor(priorSuccessor.participant_id, false);
    }
    deps.participants.setIsSuccessor(target.participant_id, true);
    deps.sessionEvents.append({
      room_id: actor.room_id,
      participant_id: actor.participant_id,
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'nominate',
        target_participant_id: target.participant_id,
      },
    });
  });
  tx();

  deps.connections.broadcast(actor.room_id, {
    kind: 'successor',
    participant_id: target.participant_id,
  });
}
