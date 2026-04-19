/**
 * WebSocket `submit_command` handler.
 *
 * Public interface: {@link handleSubmitCommand}.
 * Bounded context: WebSocket runtime path (ADR-153 Runtime Host Interface).
 *
 * Phase 4 contract: any authenticated participant can submit. Lock
 * enforcement lands in Phase 5 — at that point this handler will reject
 * submissions from non-holders.
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { RoomManager } from '../../rooms/room-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';

export interface SubmitCommandDeps {
  participants: ParticipantsRepository;
  connections: ConnectionManager;
  roomManager: RoomManager;
}

function sendErr(ws: WebSocket, code: string, detail: string): void {
  const msg: ServerMsg = { kind: 'error', code, detail };
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket down; nothing to do */
  }
}

/**
 * Validate + dispatch a submit_command frame. Returns once the room
 * manager has been told to run the turn; the output broadcast is fired
 * later by the room manager itself.
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

  await deps.roomManager.submitCommand({
    room_id: actor.room_id,
    actor_id: actor.participant_id,
    text,
  });
}
