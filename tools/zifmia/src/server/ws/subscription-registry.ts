/**
 * @module @sharpee/zifmia/server/ws/subscription-registry
 * @purpose Tracks which WebSocket connections are subscribed to which
 *   rooms. The HTTP turn route and Phase 3d.ii/iii features (chat,
 *   presence, locks) consult this registry to fan out events to the
 *   right set of connections.
 * @owner Zifmia server (tools/zifmia/server/ws).
 *
 * Invariants:
 *
 * - The registry is per-process (`Map`-backed). Multi-process
 *   deployment lands in Phase 7; until then a single Zifmia container
 *   holds the canonical fan-out set.
 * - Every `add` is paired with a `remove` on connection close — the
 *   WebSocket route's `close` handler MUST call `removeAll(conn)` to
 *   prevent leaks. The registry never mutates without an explicit
 *   add/remove call.
 * - A connection may subscribe to many rooms; a room may have many
 *   subscribers. Both directions are indexed so cleanup is O(rooms-
 *   per-conn) on disconnect.
 */

import type { ClientConnection } from './connection';

export class SubscriptionRegistry {
  /**
   * Forward index: which connections care about a given room. Used to
   * fan out broadcasts (turn:broadcast, chat:message, lock:state) to
   * the right subscribers.
   */
  private readonly roomSubscribers = new Map<string, Set<ClientConnection>>();

  /**
   * Reverse index: which rooms a given connection is subscribed to.
   * Used to clean up subscriptions when a connection closes without
   * needing to walk every room.
   */
  private readonly connectionRooms = new Map<ClientConnection, Set<string>>();

  /**
   * Add `conn` as a subscriber of `roomId`. Idempotent — re-subscribing
   * is a no-op and `subscribersOf(roomId)` continues to report each
   * connection exactly once.
   */
  add(conn: ClientConnection, roomId: string): void {
    let subs = this.roomSubscribers.get(roomId);
    if (!subs) {
      subs = new Set();
      this.roomSubscribers.set(roomId, subs);
    }
    subs.add(conn);

    let rooms = this.connectionRooms.get(conn);
    if (!rooms) {
      rooms = new Set();
      this.connectionRooms.set(conn, rooms);
    }
    rooms.add(roomId);
  }

  /**
   * Remove `conn` from `roomId`'s subscriber set. Idempotent — calling
   * with an unsubscribed `conn` is a no-op.
   */
  remove(conn: ClientConnection, roomId: string): void {
    const subs = this.roomSubscribers.get(roomId);
    if (subs) {
      subs.delete(conn);
      if (subs.size === 0) this.roomSubscribers.delete(roomId);
    }
    const rooms = this.connectionRooms.get(conn);
    if (rooms) {
      rooms.delete(roomId);
      if (rooms.size === 0) this.connectionRooms.delete(conn);
    }
  }

  /**
   * Drop every subscription this connection holds. Called by the WS
   * route's `close` handler so the per-connection state is released
   * exactly when the socket goes away.
   */
  removeAll(conn: ClientConnection): void {
    const rooms = this.connectionRooms.get(conn);
    if (!rooms) return;
    for (const roomId of rooms) {
      const subs = this.roomSubscribers.get(roomId);
      if (subs) {
        subs.delete(conn);
        if (subs.size === 0) this.roomSubscribers.delete(roomId);
      }
    }
    this.connectionRooms.delete(conn);
  }

  /** Read-only view of subscribers for a room. Returns an empty
   * iterator when the room has none. */
  subscribersOf(roomId: string): Iterable<ClientConnection> {
    return this.roomSubscribers.get(roomId) ?? [];
  }

  /** Test/diagnostic helper — `roomId → subscriberCount`. */
  snapshot(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [roomId, subs] of this.roomSubscribers) {
      out.set(roomId, subs.size);
    }
    return out;
  }

  /**
   * Count connections from a specific identity subscribed to a room.
   *
   * Presence broadcasts fire on the 0→1 transition (joined) and the
   * 1→0 transition (left); a single identity opening a second tab is
   * a 1→2 transition and emits nothing. The caller measures the count
   * before and after add/remove and compares.
   *
   * O(subscribers-of-room). Acceptable for v1 — rooms hold tens, not
   * thousands. Phase 7 may add an identity-indexed map if rooms grow.
   */
  connectionCountForIdentityInRoom(roomId: string, identityId: string): number {
    const subs = this.roomSubscribers.get(roomId);
    if (!subs) return 0;
    let count = 0;
    for (const conn of subs) {
      if (conn.identity.id === identityId) count++;
    }
    return count;
  }

  /**
   * Returns whether `conn` is subscribed to `roomId`. Used by chat
   * handling to enforce that a participant must be in the room before
   * sending — no shotgun broadcasting to arbitrary rooms.
   */
  isSubscribed(conn: ClientConnection, roomId: string): boolean {
    const rooms = this.connectionRooms.get(conn);
    return rooms?.has(roomId) ?? false;
  }

  /**
   * One entry per unique identity currently subscribed to `roomId`.
   * Used to build the `presence:roster` payload delivered to a joiner.
   * Order is insertion-order of the underlying `Set<ClientConnection>` —
   * not a stable contract, but deterministic enough for tests.
   */
  participantsOf(
    roomId: string,
  ): Array<{ identityId: string; handle: string }> {
    const subs = this.roomSubscribers.get(roomId);
    if (!subs) return [];
    const seen = new Set<string>();
    const out: Array<{ identityId: string; handle: string }> = [];
    for (const conn of subs) {
      if (seen.has(conn.identity.id)) continue;
      seen.add(conn.identity.id);
      out.push({
        identityId: conn.identity.id,
        handle: conn.identity.handle,
      });
    }
    return out;
  }
}
