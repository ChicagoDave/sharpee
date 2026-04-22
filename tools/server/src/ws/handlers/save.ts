/**
 * WebSocket `save` handler.
 *
 * Public interface: {@link handleSave}, {@link SaveDeps}.
 * Bounded context: save/restore runtime (ADR-153 Decision 2, Decision 10,
 * Decision 11).
 *
 * Authority: any participant whose tier is `command_entrant`, `co_host`, or
 * `primary_host` may save. Participants receive `insufficient_authority`.
 *
 * On success, the handler broadcasts `save_created` to every connection in
 * the room so all participants see the new save appear in their roster.
 * On failure, the error is delivered to the sender only — no broadcast and
 * no state change (SaveService guarantees atomicity).
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { SaveService } from '../../saves/save-service.js';
import { SaveServiceError } from '../../saves/save-service.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

export interface SaveDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  saveService: SaveService;
}

/**
 * Process a `save` frame.
 *
 * Paths:
 *   - sender unknown / muted / low tier    → error to sender, no-op
 *   - sandbox / persistence failure         → error to sender, no broadcast
 *   - success                               → broadcast save_created to room
 */
export async function handleSave(
  deps: SaveDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  _msg: Extract<ClientMsg, { kind: 'save' }>
): Promise<void> {
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
      'save requires command_entrant, co_host, or primary_host tier'
    );
    return;
  }

  let result: Awaited<ReturnType<SaveService['save']>>;
  try {
    result = await deps.saveService.save({
      room_id: actor.room_id,
      actor_id: actor.participant_id,
    });
  } catch (err) {
    if (err instanceof SaveServiceError) {
      // Persistence failures are systemic (disk full, locked DB) — the room
      // as a whole needs to know because follow-up actions will likely hit
      // the same wall. Other errors (sandbox timeout, auth) are just sender-local.
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
      sendErr(ws, 'save_failed', err instanceof Error ? err.message : 'save failed');
    }
    return;
  }

  deps.connections.broadcast(actor.room_id, {
    kind: 'save_created',
    save_id: result.save_id,
    name: result.name,
    actor_id: actor.participant_id,
    ts: result.created_at,
  });
}
