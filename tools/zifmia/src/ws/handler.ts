/**
 * WebSocket connection handler per ADR-177 §3.
 *
 * Public interface: {@link registerWebSocketRoute}.
 * Owner: zifmia server, WS layer.
 *
 * Protocol:
 *   1. Client connects to `/ws/rooms/:id` (path id is informational;
 *      the authoritative `roomId` arrives in the hello frame).
 *   2. Server starts a 5s hello timeout.
 *   3. First frame must be `hello { roomId, handle }`. Any other frame
 *      first → close 4005.
 *   4. Server resolves identity → participant via
 *      `(room_id, identity_id)`. Failure → 4001 / 4003 / 4004.
 *   5. Server sends `hello:ack { participantId, tier, lockHolder }`,
 *      registers the socket in the hub (which emits
 *      `presence { connected: true }`), and begins accepting:
 *        - chat:send → chat:message broadcast (+ touchLastActivity)
 *        - lock:acquire → lock:state broadcast iff state changed
 *        - lock:release → lock:state broadcast iff holder released
 *
 * Reconnect idempotency (AC-11): the participant lookup is by
 * `(room_id, identity_id)`. If the participants row exists, the
 * socket reuses the same `participant_id`. No row is created on hello
 * — joining is the HTTP `/api/rooms/:id/join` route's job.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { IdentityRepository } from '../identity/repository.js';
import type { RoomsRepository } from '../rooms/repository.js';
import type { ParticipantsRepository } from '../rooms/participants.js';
import type { RoomsHub, RoomSocket } from './rooms-hub.js';
import type { SessionEventsRepository } from '../sessions/events-repo.js';
import {
  CLOSE_CODES,
  parseClientFrame,
  type ChatMessageFrame,
  type HelloAckFrame,
  type LockStateFrame,
  type ServerFrame
} from './types.js';

export interface WebSocketRouteDeps {
  identities: IdentityRepository;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  hub: RoomsHub;
  sessionEvents?: SessionEventsRepository;
  /** ms to wait for the first frame; default 5000 per §3. */
  helloTimeoutMs?: number;
  /** Clock injection (touchLastActivity timestamps + chat ts). */
  now?: () => number;
}

const HELLO_TIMEOUT_MS_DEFAULT = 5000;

export function registerWebSocketRoute(app: FastifyInstance, deps: WebSocketRouteDeps): void {
  const helloTimeoutMs = deps.helloTimeoutMs ?? HELLO_TIMEOUT_MS_DEFAULT;
  const now = deps.now ?? Date.now;

  app.get('/ws/rooms/:id', { websocket: true }, (socket: WebSocket) => {
    let socketEntry: RoomSocket | null = null;
    let helloTimer: NodeJS.Timeout | null = setTimeout(() => {
      helloTimer = null;
      socket.close(CLOSE_CODES.HELLO_TIMEOUT, 'hello_timeout');
    }, helloTimeoutMs);

    function clearHelloTimer(): void {
      if (helloTimer) {
        clearTimeout(helloTimer);
        helloTimer = null;
      }
    }

    function sendFrame(frame: ServerFrame): void {
      try {
        socket.send(JSON.stringify(frame));
      } catch {
        // Socket already closed; nothing to do.
      }
    }

    socket.on('message', (data: Buffer | string) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      const frame = parseClientFrame(raw);

      // ─── Pre-hello: ONLY hello is accepted. ─────────────────────────
      if (socketEntry === null) {
        if (!frame || frame.type !== 'hello') {
          clearHelloTimer();
          socket.close(CLOSE_CODES.HELLO_REQUIRED, 'hello_required');
          return;
        }
        clearHelloTimer();

        const identity = deps.identities.getByHandle(frame.handle);
        if (!identity) {
          socket.close(CLOSE_CODES.UNKNOWN_HANDLE, 'unknown_handle');
          return;
        }
        const room = deps.rooms.getRoom(frame.roomId);
        if (!room || room.deleted_at !== null) {
          socket.close(CLOSE_CODES.ROOM_NOT_FOUND, 'room_not_found');
          return;
        }
        const participant = deps.participants.getByRoomAndIdentity(frame.roomId, identity.id);
        if (!participant) {
          socket.close(CLOSE_CODES.NOT_IN_ROOM, 'not_in_room');
          return;
        }

        // hello:ack BEFORE registering so the client receives ack
        // ahead of any presence broadcast triggered by the
        // registration. (Browsers update local roster on presence;
        // ack confirms attachment.)
        const lockState = deps.hub.lock(frame.roomId).state();
        const ack: HelloAckFrame = {
          type: 'hello:ack',
          participantId: participant.id,
          tier: participant.tier,
          lockHolder: lockState.holder
        };
        sendFrame(ack);

        const entry: RoomSocket = {
          socketId: randomUUID(),
          participantId: participant.id,
          identityId: identity.id,
          handle: identity.handle,
          roomId: frame.roomId,
          send: (f) => sendFrame(f),
          close: (code, reason) => {
            try {
              socket.close(code, reason ?? '');
            } catch { /* already closed */ }
          }
        };
        socketEntry = entry;
        deps.hub.register(entry);
        return;
      }

      // ─── Post-hello: route by frame type. ───────────────────────────
      if (!frame) return; // ignore malformed frames silently — no exit

      switch (frame.type) {
        case 'hello':
          // Duplicate hello is a protocol violation; close the socket.
          socket.close(CLOSE_CODES.HELLO_REQUIRED, 'duplicate_hello');
          return;

        case 'chat:send': {
          if (typeof frame.text !== 'string' || frame.text.length === 0) return;
          // AC-12 enforcement: muted participants' chat:send is dropped
          // server-side. No broadcast, no audit, no error frame — the
          // client already knows it's muted (via mute_state) and the
          // intent is silent suppression.
          {
            const fresh = deps.participants.getById(socketEntry.participantId);
            if (fresh?.muted) return;
          }
          const message: ChatMessageFrame = {
            type: 'chat:message',
            id: randomUUID(),
            roomId: socketEntry.roomId,
            fromId: socketEntry.identityId,
            fromHandle: socketEntry.handle,
            text: frame.text,
            ts: now()
          };
          deps.hub.broadcast(socketEntry.roomId, message);
          deps.sessionEvents?.append({
            roomId: socketEntry.roomId,
            participantId: socketEntry.participantId,
            kind: 'chat',
            payload: {
              id: message.id,
              fromId: message.fromId,
              fromHandle: message.fromHandle,
              text: message.text,
              ts: message.ts
            }
          });
          deps.rooms.touchLastActivity(socketEntry.roomId);
          return;
        }

        case 'lock:acquire': {
          // AC-12 enforcement: muted participants cannot acquire the
          // typing lock. Reject silently — no broadcast, no error.
          {
            const fresh = deps.participants.getById(socketEntry.participantId);
            if (fresh?.muted) return;
          }
          const outcome = deps.hub.lock(socketEntry.roomId).acquire(socketEntry.participantId);
          if (outcome.ok && outcome.broadcast) {
            const lf: LockStateFrame = {
              type: 'lock:state',
              roomId: socketEntry.roomId,
              holder: outcome.state.holder,
              expiresAt: outcome.state.expiresAt
            };
            deps.hub.broadcast(socketEntry.roomId, lf);
          }
          // Rejected acquire (different holder): no broadcast, no
          // explicit "denied" frame — the client already sees the
          // existing holder via the last lock:state broadcast.
          return;
        }

        case 'lock:release': {
          const outcome = deps.hub.lock(socketEntry.roomId).release(socketEntry.participantId);
          if (outcome.broadcast) {
            const lf: LockStateFrame = {
              type: 'lock:state',
              roomId: socketEntry.roomId,
              holder: null,
              expiresAt: null
            };
            deps.hub.broadcast(socketEntry.roomId, lf);
          }
          return;
        }
      }
    });

    socket.on('close', () => {
      clearHelloTimer();
      if (socketEntry) {
        deps.hub.unregister(socketEntry);
        socketEntry = null;
      }
    });
  });
}
