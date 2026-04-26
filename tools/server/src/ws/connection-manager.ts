/**
 * Per-room WebSocket connection registry.
 *
 * Public interface: {@link ConnectionManager}, {@link createConnectionManager}.
 * Bounded context: runtime real-time state (ADR-153 Decision 15 — bare `ws`,
 * per-room broadcast written directly).
 *
 * This is a runtime-only cache of live sockets. It never creates rooms or
 * participants; the DB is the source of truth for both. When the process
 * restarts, the registry is empty until clients reconnect.
 *
 * Invariants:
 *   - a WebSocket appears in at most one (room_id, participant_id) slot.
 *   - removing a socket by ws or by participant_id both clean up the reverse map.
 *   - broadcast(room_id, …) is a no-op if the room has no active sockets.
 *   - every registered participant has a known `identity_id` so the registry
 *     can answer "close every live socket owned by this identity" — the
 *     primitive used by the erase route (ADR-161) to terminate sessions
 *     bound to an erased identity with close code 4007.
 */

import type { WebSocket } from 'ws';
import type { ServerMsg } from '../wire/browser-server.js';

export interface ConnectedSocket {
  room_id: string;
  participant_id: string;
  ws: WebSocket;
}

export interface ConnectionManager {
  /**
   * Bind a socket to (room_id, participant_id, identity_id). The identity
   * binding lets erase close every live socket owned by an identity in one
   * call — see {@link closeIdentitySockets}.
   */
  register(
    room_id: string,
    participant_id: string,
    identity_id: string,
    ws: WebSocket,
  ): void;
  /** Remove by participant_id. Returns the room_id it was in, or null. */
  unregisterParticipant(participant_id: string): string | null;
  /** Remove by socket. Returns { room_id, participant_id } or null. */
  unregisterSocket(ws: WebSocket): { room_id: string; participant_id: string } | null;
  broadcast(room_id: string, msg: ServerMsg, opts?: { except_participant_id?: string }): void;
  send(participant_id: string, msg: ServerMsg): boolean;
  /**
   * Close every socket in a room with a WebSocket application close code
   * and reason. Each ws.close() triggers its own `close` handler which
   * removes the entry from the registry, so no explicit cleanup is needed.
   * Returns the number of sockets that were told to close.
   */
  closeRoom(room_id: string, code: number, reason: string): number;
  /**
   * Close every socket bound to `identity_id` with the given application
   * close code and reason. Each ws.close() triggers its own `close`
   * handler which removes the entry from the registry, so no explicit
   * cleanup is needed. Returns the number of sockets that were told to
   * close (0 when the identity has no live sockets — not an error).
   *
   * Used by ADR-161's erase route to terminate WS sessions bound to a
   * just-deleted identity with code 4007 `identity_erased`.
   */
  closeIdentitySockets(identity_id: string, code: number, reason: string): number;
  getConnectedCount(room_id: string): number;
  getParticipantSocket(participant_id: string): WebSocket | null;
  /** Reverse lookup: which participant/room does this socket represent? */
  getSocketMeta(ws: WebSocket): { room_id: string; participant_id: string } | null;
  /** Test/diagnostic helper — total sockets across all rooms. */
  size(): number;
}

export function createConnectionManager(): ConnectionManager {
  const byRoom = new Map<string, Map<string, WebSocket>>();
  const byParticipant = new Map<
    string,
    { room_id: string; identity_id: string; ws: WebSocket }
  >();
  const bySocket = new WeakMap<WebSocket, { room_id: string; participant_id: string }>();
  const byIdentity = new Map<string, Set<string>>();

  function detachIdentity(identity_id: string, participant_id: string): void {
    const set = byIdentity.get(identity_id);
    if (!set) return;
    set.delete(participant_id);
    if (set.size === 0) byIdentity.delete(identity_id);
  }

  function send(participant_id: string, msg: ServerMsg): boolean {
    const entry = byParticipant.get(participant_id);
    if (!entry) return false;
    try {
      entry.ws.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  return {
    register(room_id, participant_id, identity_id, ws) {
      // If the participant is already registered (e.g. stale socket from a
      // prior connection), evict the prior entry before recording the new one.
      const prior = byParticipant.get(participant_id);
      if (prior) {
        const priorRoom = byRoom.get(prior.room_id);
        priorRoom?.delete(participant_id);
        bySocket.delete(prior.ws);
        detachIdentity(prior.identity_id, participant_id);
      }

      let room = byRoom.get(room_id);
      if (!room) {
        room = new Map();
        byRoom.set(room_id, room);
      }
      room.set(participant_id, ws);
      byParticipant.set(participant_id, { room_id, identity_id, ws });
      bySocket.set(ws, { room_id, participant_id });

      let pidSet = byIdentity.get(identity_id);
      if (!pidSet) {
        pidSet = new Set();
        byIdentity.set(identity_id, pidSet);
      }
      pidSet.add(participant_id);
    },

    unregisterParticipant(participant_id) {
      const entry = byParticipant.get(participant_id);
      if (!entry) return null;
      byParticipant.delete(participant_id);
      bySocket.delete(entry.ws);
      detachIdentity(entry.identity_id, participant_id);
      const room = byRoom.get(entry.room_id);
      if (room) {
        room.delete(participant_id);
        if (room.size === 0) byRoom.delete(entry.room_id);
      }
      return entry.room_id;
    },

    unregisterSocket(ws) {
      const meta = bySocket.get(ws);
      if (!meta) return null;
      const entry = byParticipant.get(meta.participant_id);
      byParticipant.delete(meta.participant_id);
      bySocket.delete(ws);
      if (entry) detachIdentity(entry.identity_id, meta.participant_id);
      const room = byRoom.get(meta.room_id);
      if (room) {
        room.delete(meta.participant_id);
        if (room.size === 0) byRoom.delete(meta.room_id);
      }
      return meta;
    },

    broadcast(room_id, msg, opts = {}) {
      const room = byRoom.get(room_id);
      if (!room) return;
      const except = opts.except_participant_id;
      const payload = JSON.stringify(msg);
      for (const [pid, ws] of room) {
        if (pid === except) continue;
        try {
          ws.send(payload);
        } catch {
          // Socket in a bad state; leave cleanup to the close handler.
        }
      }
    },

    send,

    closeRoom(room_id, code, reason) {
      const room = byRoom.get(room_id);
      if (!room) return 0;
      // Snapshot the list — the close handler on each socket races with us to
      // mutate byRoom/byParticipant/bySocket as sockets close.
      const sockets = [...room.values()];
      for (const ws of sockets) {
        try {
          ws.close(code, reason);
        } catch {
          /* socket already in bad state — leave to per-socket close handler */
        }
      }
      return sockets.length;
    },

    closeIdentitySockets(identity_id, code, reason) {
      const pids = byIdentity.get(identity_id);
      if (!pids) return 0;
      // Snapshot the participant ids and resolve to sockets first; the close
      // handler races us to mutate byIdentity/byParticipant/byRoom/bySocket
      // as sockets close.
      const sockets: WebSocket[] = [];
      for (const pid of pids) {
        const entry = byParticipant.get(pid);
        if (entry) sockets.push(entry.ws);
      }
      for (const ws of sockets) {
        try {
          ws.close(code, reason);
        } catch {
          /* socket already in bad state — leave to per-socket close handler */
        }
      }
      return sockets.length;
    },

    getConnectedCount(room_id) {
      return byRoom.get(room_id)?.size ?? 0;
    },

    getParticipantSocket(participant_id) {
      return byParticipant.get(participant_id)?.ws ?? null;
    },

    getSocketMeta(ws) {
      return bySocket.get(ws) ?? null;
    },

    size() {
      return byParticipant.size;
    },
  };
}
