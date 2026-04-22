/**
 * WebSocket `release_lock` handler.
 *
 * Public interface: {@link handleReleaseLock}, {@link ReleaseLockDeps}.
 * Bounded context: lock-on-typing runtime (ADR-153 Decision 7 — voluntary
 * release path).
 *
 * A `release_lock` is the client's explicit "I'm done typing" frame — used
 * when the user cancels out of an in-progress input rather than submitting
 * or deleting back to empty. It is idempotent: sending it while not holding
 * the lock is a silent no-op.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { LockManager } from '../lock-manager.js';
import { sendErr } from '../error-response.js';

export interface ReleaseLockDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  locks: LockManager;
}

/**
 * Process a `release_lock` frame.
 *
 * Paths:
 *   - sender is current holder → release, broadcast lock_state(null)
 *   - sender is not holder     → silent no-op (idempotent, ADR-153 N-5)
 *   - sender is unknown/muted  → error to sender only
 */
export function handleReleaseLock(
  deps: ReleaseLockDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string }
): void {
  const participant = deps.participants.findById(actor.participant_id);
  if (!participant) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (participant.muted) {
    sendErr(ws, 'muted', 'you have been muted');
    return;
  }

  const released = deps.locks.release(actor.room_id, actor.participant_id);
  if (released) {
    deps.connections.broadcast(actor.room_id, { kind: 'lock_state', holder_id: null });
  }
}
