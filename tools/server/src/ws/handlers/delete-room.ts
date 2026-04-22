/**
 * WebSocket `delete_room` handler.
 *
 * Public interface: {@link handleDeleteRoom}, {@link DeleteRoomDeps}.
 * Bounded context: room lifecycle (ADR-153 Decision 12, AC4).
 *
 * Protocol-level type-to-confirm: the client must echo the current
 * `room.title` in `confirm_title`. A mismatch is rejected without any
 * mutation, satisfying boundary case B-6.
 *
 * Cleanup order (each step is idempotent enough to be re-run safely):
 *   1. tear down the sandbox (sends SHUTDOWN, SIGKILLs after 1s)
 *   2. cascade-delete the room row — FKs remove participants, session_events,
 *      saves in the same transaction (ADR-153 Atomicity Requirement #1)
 *   3. broadcast `room_closed { reason: 'deleted' }` to every socket still
 *      in this room's connection map
 *   4. close every socket in the room with application close code 4006
 */

import type { WebSocket } from 'ws';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { SandboxRegistry } from '../../sandbox/sandbox-registry.js';
import type { ClientMsg } from '../../wire/browser-server.js';
import { sendErr } from '../error-response.js';

/** Application close code attached to every socket after a host-initiated delete. */
export const ROOM_DELETED_CLOSE_CODE = 4006;

export interface DeleteRoomDeps {
  participants: ParticipantsRepository;
  rooms: RoomsRepository;
  connections: ConnectionManager;
  sandboxes: SandboxRegistry;
}

/**
 * Process a `delete_room` frame.
 *
 * Order of checks:
 *   1. sender exists
 *   2. sender tier is primary_host
 *   3. confirm_title is a non-empty string
 *   4. room still exists
 *   5. confirm_title exactly matches the room's current title
 *   6. tear down sandbox, cascade delete, broadcast room_closed, close sockets
 */
export function handleDeleteRoom(
  deps: DeleteRoomDeps,
  ws: WebSocket,
  actor: { participant_id: string; room_id: string },
  msg: Extract<ClientMsg, { kind: 'delete_room' }>
): void {
  const sender = deps.participants.findById(actor.participant_id);
  if (!sender) {
    sendErr(ws, 'unknown_participant', 'participant no longer exists');
    return;
  }
  if (sender.tier !== 'primary_host') {
    sendErr(
      ws,
      'insufficient_authority',
      `tier ${sender.tier} may not delete; requires primary_host`
    );
    return;
  }

  if (typeof msg.confirm_title !== 'string' || msg.confirm_title.length === 0) {
    sendErr(ws, 'bad_confirm_title', 'delete_room requires confirm_title');
    return;
  }

  const room = deps.rooms.findById(actor.room_id);
  if (!room) {
    sendErr(ws, 'room_not_found', 'room no longer exists');
    return;
  }

  if (msg.confirm_title !== room.title) {
    sendErr(
      ws,
      'confirm_title_mismatch',
      'The room title you entered does not match.'
    );
    return;
  }

  // Step 1: stop the sandbox. Safe even if it was never spawned.
  deps.sandboxes.tearDown(actor.room_id);

  // Step 2: cascade delete (single BEGIN IMMEDIATE transaction).
  deps.rooms.delete(actor.room_id);

  // Step 3: tell every connected client why the room just vanished.
  deps.connections.broadcast(actor.room_id, {
    kind: 'room_closed',
    reason: 'deleted',
    message: 'This room was closed by the host.',
  });

  // Step 4: close the sockets. Per-socket close handlers will then clean up
  // the connection registry.
  deps.connections.closeRoom(actor.room_id, ROOM_DELETED_CLOSE_CODE, 'room_deleted');
}
