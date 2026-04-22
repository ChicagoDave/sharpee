/**
 * WebSocket `hello` handler — validates the bearer token, matches it to the
 * URL-scoped room, and responds with `welcome` or an error close.
 *
 * Public interface: {@link handleHello}, {@link HelloDeps}.
 * Bounded context: WebSocket presence (ADR-153 Decision 4 reconnect path).
 *
 * Negative paths covered:
 *   - token not found        → error(token_invalid) + close
 *   - token in a other room  → error(token_room_mismatch) + close
 *   - room no longer exists  → room_closed + close (N-4 from ADR-153)
 */

import type { WebSocket } from 'ws';
import type { Database } from 'better-sqlite3';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SavesRepository } from '../../repositories/saves.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';
import { buildRoomSnapshot } from '../room-snapshot.js';

export interface HelloDeps {
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  saves: SavesRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
}

function sendMsg(ws: WebSocket, msg: ServerMsg): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket torn down; close handler will clean up */
  }
}

function closeWith(ws: WebSocket, code: number, reason: string): void {
  try {
    ws.close(code, reason);
  } catch {
    /* already closed */
  }
}

/**
 * Process a `hello` message received on a freshly-opened socket bound to `url_room_id`.
 *
 * On success: the participant is marked connected, the registry is updated,
 * a `welcome` is sent to the new socket, and a `presence(connected=true)`
 * is broadcast to every other participant in the room.
 *
 * On any rejection path the socket is closed with an application-level
 * close code (4xxx) carrying a machine-readable reason.
 *
 * @returns the participant_id if accepted, otherwise null
 */
export function handleHello(
  deps: HelloDeps,
  ws: WebSocket,
  url_room_id: string,
  raw: ClientMsg
): string | null {
  if (raw.kind !== 'hello' || typeof raw.token !== 'string' || !raw.token) {
    sendMsg(ws, { kind: 'error', code: 'hello_required', detail: 'first frame must be hello' });
    closeWith(ws, 4000, 'hello_required');
    return null;
  }

  const participant = deps.participants.findByToken(raw.token);
  if (!participant) {
    sendMsg(ws, { kind: 'error', code: 'token_invalid', detail: 'token not recognized' });
    closeWith(ws, 4001, 'token_invalid');
    return null;
  }

  // If the DB lost the room (e.g. idle-recycled mid-session), the FK cascade
  // removed the participants row too — so token would be unknown. A surviving
  // participant row implies the room exists; verify anyway to make N-4 explicit.
  const room = deps.rooms.findById(participant.room_id);
  if (!room) {
    sendMsg(ws, { kind: 'room_closed', reason: 'recycled', message: 'room no longer exists' });
    closeWith(ws, 4004, 'room_closed');
    return null;
  }

  if (participant.room_id !== url_room_id) {
    sendMsg(ws, {
      kind: 'error',
      code: 'token_room_mismatch',
      detail: 'token does not match this room',
    });
    closeWith(ws, 4002, 'token_room_mismatch');
    return null;
  }

  // Commit presence update + join-event append atomically so readers never
  // see the connected flag flipped without the corresponding log entry.
  const tx = deps.db.transaction(() => {
    deps.participants.setConnected(participant.participant_id, true);
    deps.sessionEvents.append({
      room_id: room.room_id,
      participant_id: participant.participant_id,
      kind: 'join',
      payload: { kind: 'join', display_name: participant.display_name, reconnect: true },
    });
  });
  tx();

  deps.connections.register(room.room_id, participant.participant_id, ws);

  const { snapshot, participants } = buildRoomSnapshot(room, {
    rooms: deps.rooms,
    participants: deps.participants,
    saves: deps.saves,
  });

  sendMsg(ws, {
    kind: 'welcome',
    participant_id: participant.participant_id,
    room: snapshot,
    participants,
  });

  deps.connections.broadcast(
    room.room_id,
    { kind: 'presence', participant_id: participant.participant_id, connected: true },
    { except_participant_id: participant.participant_id }
  );

  // Auto-nominate successor (ADR-153 D6): if the room currently has no
  // designated successor and the joining participant is not the PH, mark
  // them as the successor and broadcast `successor`. Runs on any hello —
  // first-join or reconnect — so a room that somehow lost its successor
  // recovers on the next eligible hello.
  if (participant.tier !== 'primary_host') {
    const hasSuccessor = deps.participants
      .listForRoom(room.room_id)
      .some((p) => p.is_successor);
    if (!hasSuccessor) {
      const nominateTx = deps.db.transaction(() => {
        deps.participants.setIsSuccessor(participant.participant_id, true);
        deps.sessionEvents.append({
          room_id: room.room_id,
          // null = system actor — the auto-nomination is not user-initiated
          participant_id: null,
          kind: 'role',
          payload: {
            kind: 'role',
            op: 'nominate',
            target_participant_id: participant.participant_id,
          },
        });
      });
      nominateTx();

      deps.connections.broadcast(room.room_id, {
        kind: 'successor',
        participant_id: participant.participant_id,
      });
    }
  }

  return participant.participant_id;
}
