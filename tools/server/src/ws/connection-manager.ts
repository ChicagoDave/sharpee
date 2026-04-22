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
 */

import type { WebSocket } from 'ws';
import type { ServerMsg } from '../wire/browser-server.js';

export interface ConnectedSocket {
  room_id: string;
  participant_id: string;
  ws: WebSocket;
}

export interface ConnectionManager {
  register(room_id: string, participant_id: string, ws: WebSocket): void;
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
  getConnectedCount(room_id: string): number;
  getParticipantSocket(participant_id: string): WebSocket | null;
  /** Reverse lookup: which participant/room does this socket represent? */
  getSocketMeta(ws: WebSocket): { room_id: string; participant_id: string } | null;
  /** Test/diagnostic helper — total sockets across all rooms. */
  size(): number;
}

export function createConnectionManager(): ConnectionManager {
  const byRoom = new Map<string, Map<string, WebSocket>>();
  const byParticipant = new Map<string, { room_id: string; ws: WebSocket }>();
  const bySocket = new WeakMap<WebSocket, { room_id: string; participant_id: string }>();

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
    register(room_id, participant_id, ws) {
      // If the participant is already registered (e.g. stale socket from a
      // prior connection), evict the prior entry before recording the new one.
      const prior = byParticipant.get(participant_id);
      if (prior) {
        const priorRoom = byRoom.get(prior.room_id);
        priorRoom?.delete(participant_id);
        bySocket.delete(prior.ws);
      }

      let room = byRoom.get(room_id);
      if (!room) {
        room = new Map();
        byRoom.set(room_id, room);
      }
      room.set(participant_id, ws);
      byParticipant.set(participant_id, { room_id, ws });
      bySocket.set(ws, { room_id, participant_id });
    },

    unregisterParticipant(participant_id) {
      const entry = byParticipant.get(participant_id);
      if (!entry) return null;
      byParticipant.delete(participant_id);
      bySocket.delete(entry.ws);
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
      byParticipant.delete(meta.participant_id);
      bySocket.delete(ws);
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
