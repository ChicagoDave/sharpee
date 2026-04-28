/**
 * WebSocket `hello` handler — verifies the persistent identity credentials,
 * binds the connection to the URL-scoped room, and responds with `welcome`
 * or an error close.
 *
 * Public interface: {@link handleHello}, {@link HelloDeps}.
 * Bounded context: WebSocket presence (ADR-153 Decision 4 reconnect path,
 * ADR-161 hello frame contract — supersedes ADR-159).
 *
 * Per ADR-161, the hello frame carries `(handle, passcode)`. The server
 * looks up the identity by handle, verifies the argon2id hash of the
 * passcode, and resolves to a participant via `(identity.id, room_id)`.
 * If no participant exists for the pair, one is created on the spot — a
 * returning identity reaches a room they have never joined without an
 * out-of-band HTTP join step.
 *
 * Negative paths:
 *   - room no longer exists      → room_closed close (4004)
 *   - hello envelope malformed   → hello_required close (4000)
 *   - unknown handle             → unknown_handle close (4001)
 *   - passcode mismatch          → bad_passcode close (4006)
 */

import type { WebSocket } from 'ws';
import type { Database } from 'better-sqlite3';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { IdentitiesRepository } from '../../repositories/identities.js';
import type { SavesRepository } from '../../repositories/saves.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { HashService } from '../../auth/hash-service.js';
import type { ConnectionManager } from '../connection-manager.js';
import type { RoomManager } from '../../rooms/room-manager.js';
import type { ClientMsg, ServerMsg } from '../../wire/browser-server.js';
import { buildRoomSnapshot } from '../room-snapshot.js';
import { getRecordingNotice } from '../recording-notice.js';
import { generateToken } from '../../http/tokens.js';

export interface HelloDeps {
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  identities: IdentitiesRepository;
  hashService: HashService;
  saves: SavesRepository;
  sessionEvents: SessionEventsRepository;
  connections: ConnectionManager;
  /** Optional so unit tests can omit it; omitted ⇒ no auto opening-scene fire. */
  roomManager?: RoomManager;
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
 * Process a `hello` message received on a freshly-opened socket bound to
 * `url_room_id`. Async because passcode verification calls the argon2 binding.
 *
 * On success: the participant is resolved (or created on first contact in
 * this room), marked connected, registered with the {@link ConnectionManager},
 * and a `welcome` is sent to the new socket. A `presence(connected=true)` is
 * broadcast to every other participant.
 *
 * On any rejection path the socket is closed with an application-level
 * close code (4xxx) carrying a machine-readable reason.
 *
 * @returns the participant_id if accepted, otherwise null
 */
export async function handleHello(
  deps: HelloDeps,
  ws: WebSocket,
  url_room_id: string,
  raw: ClientMsg,
): Promise<string | null> {
  if (
    raw.kind !== 'hello' ||
    typeof raw.handle !== 'string' ||
    !raw.handle ||
    typeof raw.passcode !== 'string' ||
    !raw.passcode
  ) {
    sendMsg(ws, {
      kind: 'error',
      code: 'hello_required',
      detail: 'first frame must be hello with handle and passcode',
    });
    closeWith(ws, 4000, 'hello_required');
    return null;
  }

  // Cheap room check first — avoids spending an argon2 cycle on a recycled room.
  const room = deps.rooms.findById(url_room_id);
  if (!room) {
    sendMsg(ws, { kind: 'room_closed', reason: 'recycled', message: 'room no longer exists' });
    closeWith(ws, 4004, 'room_closed');
    return null;
  }

  const auth = deps.identities.findHashByHandle(raw.handle);
  if (!auth) {
    sendMsg(ws, {
      kind: 'error',
      code: 'unknown_handle',
      detail: 'no identity with that handle',
    });
    closeWith(ws, 4001, 'unknown_handle');
    return null;
  }

  const ok = await deps.hashService.verify(raw.passcode, auth.passcode_hash);
  if (!ok) {
    sendMsg(ws, {
      kind: 'error',
      code: 'bad_passcode',
      detail: 'incorrect passcode for that handle',
    });
    closeWith(ws, 4006, 'bad_passcode');
    return null;
  }

  // Identity is verified. Touch last_seen and read the canonical-case handle.
  deps.identities.touchLastSeen(auth.id);
  const identity = deps.identities.findById(auth.id);
  if (!identity) {
    // Hard-deleted between findHashByHandle and findById (e.g. an erase
    // landed in this same request window). Vanishingly rare; bail safely.
    closeWith(ws, 4500, 'internal_error');
    return null;
  }

  // Resolve or create the participant for (identity, room). The participant
  // row carries the per-connection token (unused by hello, still used by
  // HTTP routes that authenticate via Bearer).
  const existing = deps.participants.findByIdentityAndRoom(identity.id, room.room_id);
  const isReconnect = existing !== null;

  let participant = existing;
  if (!participant) {
    const token = generateToken();
    participant = deps.participants.createOrReconnect({
      room_id: room.room_id,
      identity_id: identity.id,
      token,
    });
  }

  // Commit presence update + join-event append atomically so readers never
  // see the connected flag flipped without the corresponding log entry.
  // The join event's `handle` field carries the identity's public-facing
  // identity (ADR-161 Phase F).
  const tx = deps.db.transaction(() => {
    deps.participants.setConnected(participant!.participant_id, true);
    deps.sessionEvents.append({
      room_id: room.room_id,
      participant_id: participant!.participant_id,
      kind: 'join',
      payload: {
        kind: 'join',
        handle: identity.handle,
        reconnect: isReconnect,
      },
    });
  });
  tx();

  deps.connections.register(room.room_id, participant.participant_id, identity.id, ws);

  // Opening-scene parity with platform-browser + Zifmia: on the first hello
  // for a room that has never run a turn, fire a `look` so joiners see the
  // opening text without having to type anything. Fire-and-forget — errors
  // just mean the user has to type `look` manually, which is the old flow.
  deps.roomManager?.ensureInitialLook(room.room_id).catch(() => {
    /* initial look failed; user can retype */
  });

  // Acquire the world snapshot for the welcome (ADR-162 AC-3 / Decision 6).
  // - Held mirror present → serialize from it (cheap; no IPC round-trip).
  // - No held mirror → STATUS_REQUEST round-trip to the sandbox; waits up
  //   to statusTimeoutMs (default 2s).
  // - No roomManager wired (test harnesses) → fall back to an empty serialized
  //   world. The wire type requires a string; tests asserting on welcome
  //   shape don't exercise the world content.
  let welcomeWorld: string;
  try {
    if (deps.roomManager) {
      const held = deps.roomManager.getWorldSnapshot(room.room_id);
      welcomeWorld = held ?? (await deps.roomManager.requestStatusSnapshot(room.room_id));
    } else {
      welcomeWorld = '{}';
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'world snapshot unavailable';
    sendMsg(ws, { kind: 'error', code: 'turn_failed', detail });
    closeWith(ws, 4500, 'world_snapshot_unavailable');
    return null;
  }

  const { snapshot, participants, chat_backlog, transcript_backlog, dm_threads } =
    buildRoomSnapshot(
      room,
      {
        rooms: deps.rooms,
        participants: deps.participants,
        identities: deps.identities,
        saves: deps.saves,
        sessionEvents: deps.sessionEvents,
      },
      {
        participant_id: participant.participant_id,
        tier: participant.tier,
      },
      welcomeWorld,
    );

  sendMsg(ws, {
    kind: 'welcome',
    participant_id: participant.participant_id,
    room: snapshot,
    participants,
    recording_notice: getRecordingNotice(),
    chat_backlog,
    transcript_backlog,
    dm_threads,
  });

  deps.connections.broadcast(
    room.room_id,
    {
      kind: 'presence',
      participant_id: participant.participant_id,
      connected: true,
      grace_deadline: null,
    },
    { except_participant_id: participant.participant_id },
  );

  // Auto-nominate successor (ADR-153 D6): if the room currently has no
  // designated successor and the joining participant is not the PH, mark
  // them as the successor and broadcast `successor`. Runs on any hello —
  // first-join or reconnect — so a room that somehow lost its successor
  // recovers on the next eligible hello.
  if (participant.tier !== 'primary_host') {
    const all = deps.participants.listForRoom(room.room_id);
    const hasSuccessor = all.some((p) => p.is_successor);
    if (!hasSuccessor) {
      const nominateTx = deps.db.transaction(() => {
        deps.participants.setIsSuccessor(participant!.participant_id, true);
        deps.sessionEvents.append({
          room_id: room.room_id,
          // null = system actor — the auto-nomination is not user-initiated
          participant_id: null,
          kind: 'role',
          payload: {
            kind: 'role',
            op: 'nominate',
            target_participant_id: participant!.participant_id,
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
