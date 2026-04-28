/**
 * WebSocket `restore` handler.
 *
 * Public interface: {@link handleRestore}, {@link RestoreDeps}.
 * Bounded context: save/restore runtime (ADR-153 Decision 2, Decision 10).
 *
 * Authority: any participant whose tier is `command_entrant`, `co_host`, or
 * `primary_host` may restore. Participants receive `insufficient_authority`.
 *
 * On success, the handler broadcasts `restored` to every connection in the
 * room so all participants re-render from the restored state. Because a
 * restore rewinds the story, any in-flight typing lock is invalidated — the
 * handler force-releases the lock and broadcasts `lock_state{holder_id:null}`
 * when the room had an active holder at restore time.
 *
 * On failure, the error is delivered to the sender only — no broadcast and
 * no lock mutation (SaveService guarantees atomicity).
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { LockManager } from '../lock-manager.js';
import type { SaveService } from '../../saves/save-service.js';
import { SaveServiceError } from '../../saves/save-service.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface RestoreDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  locks: LockManager;
  saveService: SaveService;
}

/**
 * Process a `restore` frame.
 *
 * Order of checks:
 *   1. save_id is a non-empty string
 *   2. participant exists, not muted, tier ∈ {command_entrant, co_host, primary_host}
 *   3. delegate to saveService.restore (may throw SaveServiceError)
 *   4. broadcast `restored` to the room
 *   5. if lock was held, forceRelease + broadcast `lock_state{holder_id:null}`
 */
export async function handleRestore(
  deps: RestoreDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'restore' }>
): Promise<void> {
  if (typeof msg.save_id !== 'string' || msg.save_id.length === 0) {
    sendErr(ws, 'bad_save_id', 'restore.save_id must be a non-empty string');
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
  if (
    participant.tier !== 'primary_host' &&
    participant.tier !== 'co_host' &&
    participant.tier !== 'command_entrant'
  ) {
    sendErr(
      ws,
      'insufficient_authority',
      'restore requires command_entrant, co_host, or primary_host tier'
    );
    return;
  }

  let result: Awaited<ReturnType<SaveService['restore']>>;
  try {
    result = await deps.saveService.restore({
      room_id: actor.room_id,
      actor_id: actor.participant_id,
      save_id: msg.save_id,
    });
  } catch (err) {
    if (err instanceof SaveServiceError) {
      // Mirror the save handler: persistence failures broadcast to the room;
      // other SaveServiceError codes (sandbox, lookup) go only to sender.
      if (err.code === 'persistence_failure') {
        deps.connections.broadcast(actor.room_id, {
          kind: 'error',
          code: 'persistence_failure',
          detail: 'The session log could not be written. The action has been rolled back.',
        });
      } else {
        sendErr(ws, err.code, err.message);
      }
    } else {
      sendErr(ws, 'restore_failed', err instanceof Error ? err.message : 'restore failed');
    }
    return;
  }

  deps.connections.broadcast(actor.room_id, {
    kind: 'restored',
    save_id: result.save_id,
    text_blocks: result.text_blocks,
    actor_id: actor.participant_id,
    world: result.world,
  });

  const prior = deps.locks.forceRelease(actor.room_id);
  if (prior !== null) {
    deps.connections.broadcast(actor.room_id, {
      kind: 'lock_state',
      holder_id: null,
    });
  }
}
