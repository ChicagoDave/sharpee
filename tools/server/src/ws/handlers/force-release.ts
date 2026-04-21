/**
 * WebSocket `force_release` handler.
 *
 * Public interface: {@link handleForceRelease}, {@link ForceReleaseDeps}.
 * Bounded context: lock-on-typing runtime (ADR-153 Decision 7 — authority
 * release path).
 *
 * A `force_release` is an authority-gated command. A Co-Host or Primary Host
 * can wrest typing control from the current lock holder (e.g. a participant
 * who walked away from their keyboard but hasn't yet tripped the 60s AFK
 * timer). Every successful force-release produces an audit-trail row in
 * session_events so the session log shows actor → target.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { LockManager } from '../lock-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';

export interface ForceReleaseDeps {
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
  locks: LockManager;
}

function sendErr(ws: WebSocket, code: string, detail: string): void {
  const msg: ServerMsg = { kind: 'error', code, detail };
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket down; close handler will reap */
  }
}

/**
 * Process a `force_release` frame.
 *
 * Paths:
 *   - sender is co_host / primary_host AND target is current holder
 *     → forceRelease, append role(force_release) event, broadcast lock_state(null)
 *   - sender unknown / muted        → error to sender
 *   - sender tier lacks authority   → error('insufficient_authority')
 *   - target is not the current holder (raced away, or no one holds)
 *                                   → error('not_holder'), no state mutation, no event row
 */
export function handleForceRelease(
  deps: ForceReleaseDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'force_release' }>
): void {
  if (typeof msg.target_participant_id !== 'string' || msg.target_participant_id.length === 0) {
    sendErr(ws, 'bad_target', 'force_release.target_participant_id must be a non-empty string');
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
  if (participant.tier !== 'primary_host' && participant.tier !== 'co_host') {
    sendErr(ws, 'insufficient_authority', 'force_release requires co_host or primary_host tier');
    return;
  }

  const currentHolder = deps.locks.getState(actor.room_id).holder_id;
  if (currentHolder === null || currentHolder !== msg.target_participant_id) {
    sendErr(ws, 'not_holder', 'target_participant_id does not match the current lock holder');
    return;
  }

  const prior = deps.locks.forceRelease(actor.room_id);
  if (prior === null) {
    // Race: holder released between getState() and forceRelease(). Treat as
    // not_holder rather than pretending we did the release.
    sendErr(ws, 'not_holder', 'lock was released between check and action');
    return;
  }

  deps.sessionEvents.append({
    room_id: actor.room_id,
    participant_id: actor.participant_id,
    kind: 'role',
    payload: {
      kind: 'role',
      op: 'force_release',
      target_participant_id: prior,
    },
  });

  deps.connections.broadcast(actor.room_id, { kind: 'lock_state', holder_id: null });
}
