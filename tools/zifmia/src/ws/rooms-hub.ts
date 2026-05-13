/**
 * RoomsHub — per-room broadcast registry + presence + lock ownership.
 *
 * Public interface: {@link RoomsHub}, {@link createRoomsHub},
 * {@link RoomSocket}.
 * Owner: zifmia server, WS layer. In-memory only; no persistence.
 *
 * Contract per ADR-177 §3:
 *   - Subscribers (sockets) are registered post-hello with a known
 *     `participant_id`. The hub broadcasts every frame to all sockets
 *     in the same `room_id`, submitter included.
 *   - Presence: registration emits `presence { connected: true }`;
 *     unregistration emits `presence { connected: false }`. Multiple
 *     sockets for the same `participant_id` are coalesced — the hub
 *     only emits the connected/disconnected transition when the count
 *     crosses zero (so re-auth on the same identity doesn't spam the
 *     room).
 *   - Lock: each room has at most one `RoomLock`. The hub creates it
 *     lazily on first registration; auto-expiry broadcasts via the
 *     `onExpiry` callback.
 *   - Cross-instance fan-out (Redis pub/sub) is out of scope; the
 *     hub assumes a single Node process per server. Multi-instance
 *     is a separate ADR if scale demands it.
 */

import { randomUUID } from 'node:crypto';
import type { ServerFrame, PresenceFrame, LockStateFrame } from './types.js';
import {
  createRoomLock,
  type RoomLock,
  type LockSchedulerOptions,
  type LockState
} from './lock.js';

export interface RoomSocket {
  /** Identifier used for broadcast dedup logging (not the participant id). */
  readonly socketId: string;
  /** Participant the socket is bound to (post-hello). */
  readonly participantId: string;
  /** Identity behind the participant (used by chat broadcasts). */
  readonly identityId: string;
  /** The handle for outgoing chat:message frames. */
  readonly handle: string;
  /** Room id this socket is subscribed to. */
  readonly roomId: string;
  /** Send a frame to this socket. */
  send(frame: ServerFrame): void;
  /** Server-initiated close (used on identity erase — code 4007). */
  close(code: number, reason?: string): void;
}

export interface PresenceTransition {
  readonly roomId: string;
  readonly participantId: string;
  readonly connected: boolean;
}
export type PresenceListener = (input: PresenceTransition) => void;

export interface RoomsHub {
  /** Register a post-hello socket. Returns the entry that was inserted. */
  register(socket: RoomSocket): void;
  /** Unregister (called on socket close). */
  unregister(socket: RoomSocket): void;
  /** Broadcast a frame to every socket subscribed to `roomId`. */
  broadcast(roomId: string, frame: ServerFrame): void;
  /** Lock for `roomId` (lazy-allocated). */
  lock(roomId: string): RoomLock;
  /** Current connected participant ids in the room. */
  connectedParticipants(roomId: string): readonly string[];
  /** Close all sockets attached to `participantId` (across rooms). Used by identity-erase teardown in later phases. */
  closeForParticipant(participantId: string, code: number): void;
  /** Close all sockets attached to `identityId`. Used by Phase-5 identity erase (close code 4007). */
  closeForIdentity(identityId: string, code: number): void;
  /** Close all sockets in a room. Used by Phase-6 /delete (close code 4004). */
  closeForRoom(roomId: string, code: number): void;
  /** Filtered broadcast — sends a frame only to sockets whose `predicate` returns true. */
  broadcastWhere(roomId: string, predicate: (s: RoomSocket) => boolean, frame: ServerFrame): void;
  /** Subscribe to presence transitions (called AFTER the auto-broadcast). Used by the succession service to start/cancel grace timers. */
  onPresence(listener: PresenceListener): void;
  /** Tear down all locks and timers (server shutdown). */
  dispose(): void;
}

interface RoomBucket {
  sockets: Set<RoomSocket>;
  /** participant_id → socket-count; multi-socket participants get one presence emit. */
  presence: Map<string, number>;
  lock: RoomLock;
}

export interface CreateRoomsHubOptions {
  /** Forwarded to every lock; default 400ms per AC-10 (or test value). */
  lockExpiryMs?: number;
  /** Forwarded to every lock; test fixtures pin time. */
  now?: () => number;
  /** Forwarded to every lock; test fixtures inject scheduler. */
  scheduleExpiry?: LockSchedulerOptions['scheduleExpiry'];
}

export function createRoomsHub(options: CreateRoomsHubOptions = {}): RoomsHub {
  const buckets = new Map<string, RoomBucket>();
  const presenceListeners: PresenceListener[] = [];

  function notifyPresence(input: PresenceTransition): void {
    for (const listener of presenceListeners) {
      try {
        listener(input);
      } catch {
        // Listener faults must not break the broadcast pipeline.
      }
    }
  }

  function getBucket(roomId: string): RoomBucket {
    let bucket = buckets.get(roomId);
    if (!bucket) {
      const lock = createRoomLock({
        expiryMs: options.lockExpiryMs,
        now: options.now,
        scheduleExpiry: options.scheduleExpiry
      });
      lock.onExpiry((state) => {
        const frame: LockStateFrame = {
          type: 'lock:state',
          roomId,
          holder: state.holder,
          expiresAt: state.expiresAt
        };
        broadcastInternal(roomId, frame);
      });
      bucket = { sockets: new Set(), presence: new Map(), lock };
      buckets.set(roomId, bucket);
    }
    return bucket;
  }

  function broadcastInternal(roomId: string, frame: ServerFrame): void {
    const bucket = buckets.get(roomId);
    if (!bucket) return;
    const payload = JSON.stringify(frame);
    for (const sock of bucket.sockets) {
      try {
        sock.send(JSON.parse(payload));
      } catch {
        // Swallow per-socket failures — a broken socket gets cleaned up
        // by its own close handler; one slow consumer does not block
        // the broadcast.
      }
    }
  }

  return {
    register(socket) {
      const bucket = getBucket(socket.roomId);
      bucket.sockets.add(socket);
      const prev = bucket.presence.get(socket.participantId) ?? 0;
      bucket.presence.set(socket.participantId, prev + 1);
      if (prev === 0) {
        const frame: PresenceFrame = {
          type: 'presence',
          roomId: socket.roomId,
          participantId: socket.participantId,
          connected: true
        };
        broadcastInternal(socket.roomId, frame);
        notifyPresence({ roomId: socket.roomId, participantId: socket.participantId, connected: true });
      }
    },

    unregister(socket) {
      const bucket = buckets.get(socket.roomId);
      if (!bucket) return;
      if (!bucket.sockets.delete(socket)) return;
      const prev = bucket.presence.get(socket.participantId) ?? 0;
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        bucket.presence.delete(socket.participantId);
        const frame: PresenceFrame = {
          type: 'presence',
          roomId: socket.roomId,
          participantId: socket.participantId,
          connected: false
        };
        broadcastInternal(socket.roomId, frame);
        // If the disconnecting participant held the lock, release it.
        const lockState: LockState = bucket.lock.state();
        if (lockState.holder === socket.participantId) {
          const outcome = bucket.lock.forceRelease();
          if (outcome.broadcast) {
            broadcastInternal(socket.roomId, {
              type: 'lock:state',
              roomId: socket.roomId,
              holder: null,
              expiresAt: null
            });
          }
        }
        notifyPresence({ roomId: socket.roomId, participantId: socket.participantId, connected: false });
      } else {
        bucket.presence.set(socket.participantId, next);
      }
    },

    broadcast(roomId, frame) {
      broadcastInternal(roomId, frame);
    },

    lock(roomId) {
      return getBucket(roomId).lock;
    },

    connectedParticipants(roomId) {
      const bucket = buckets.get(roomId);
      return bucket ? Array.from(bucket.presence.keys()) : [];
    },

    closeForParticipant(participantId, code) {
      for (const bucket of buckets.values()) {
        for (const sock of bucket.sockets) {
          if (sock.participantId === participantId) sock.close(code);
        }
      }
    },

    closeForIdentity(identityId, code) {
      for (const bucket of buckets.values()) {
        for (const sock of bucket.sockets) {
          if (sock.identityId === identityId) sock.close(code);
        }
      }
    },

    closeForRoom(roomId, code) {
      const bucket = buckets.get(roomId);
      if (!bucket) return;
      for (const sock of [...bucket.sockets]) {
        sock.close(code);
      }
    },

    broadcastWhere(roomId, predicate, frame) {
      const bucket = buckets.get(roomId);
      if (!bucket) return;
      const payload = JSON.stringify(frame);
      for (const sock of bucket.sockets) {
        if (!predicate(sock)) continue;
        try {
          sock.send(JSON.parse(payload));
        } catch {
          // ignore per-socket failures
        }
      }
    },

    onPresence(listener) {
      presenceListeners.push(listener);
    },

    dispose() {
      for (const bucket of buckets.values()) {
        bucket.lock.dispose();
      }
      buckets.clear();
    }
  };
}

/** Convenience id generator for sockets (debug logs / dedup). */
export function newSocketId(): string {
  return randomUUID();
}
