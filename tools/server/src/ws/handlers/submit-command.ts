/**
 * WebSocket `submit_command` handler.
 *
 * Public interface: {@link handleSubmitCommand}, {@link SubmitCommandDeps}.
 * Bounded context: WebSocket runtime path (ADR-153 Runtime Host Interface,
 * Decision 7 — lock-on-typing).
 *
 * Phase 5 contract: only the current lock holder for the room may submit.
 * After the turn's `story_output` has been broadcast, the lock is
 * auto-released and a `lock_state { holder_id: null }` frame is broadcast
 * to all participants so the next typist can acquire.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { RoomManager } from '../../rooms/room-manager.js';
import type { LockManager } from '../lock-manager.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface SubmitCommandDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  roomManager: RoomManager;
  locks: LockManager;
}

/**
 * Validate + dispatch a submit_command frame.
 *
 * Order of checks:
 *   1. non-empty text
 *   2. participant still exists and is not muted
 *   3. sender is current lock holder (rejects with `not_holder` otherwise)
 *   4. delegate to roomManager.submitCommand (awaits broadcast)
 *   5. force-release the lock and broadcast `lock_state{holder_id:null}`
 *
 * Step 5 runs in a `finally`-style block so the lock is freed even if the
 * turn path throws. Release broadcast is suppressed when the lock is
 * already null (e.g. a Co-Host force-released mid-turn).
 */
export async function handleSubmitCommand(
  deps: SubmitCommandDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'submit_command' }>
): Promise<void> {
  const text = typeof msg.text === 'string' ? msg.text.trim() : '';
  if (!text) {
    sendErr(ws, 'empty_command', 'submit_command requires non-empty text');
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

  const lockState = deps.locks.getState(actor.room_id);
  if (lockState.holder_id !== actor.participant_id) {
    sendErr(
      ws,
      'not_holder',
      'only the current input-lock holder may submit a command'
    );
    return;
  }

  try {
    await deps.roomManager.submitCommand({
      room_id: actor.room_id,
      actor_id: actor.participant_id,
      text,
    });
  } finally {
    const prior = deps.locks.forceRelease(actor.room_id);
    if (prior !== null) {
      deps.connections.broadcast(actor.room_id, {
        kind: 'lock_state',
        holder_id: null,
      });
    }
  }
}
