/**
 * @module @sharpee/zifmia/server/ws/lock-registry
 * @purpose Per-room single-holder typing-lock state. Tracks which
 *   WebSocket connection currently holds each room's input lock so
 *   the UI lock-on-typing pattern (ADR-175 §4) can render "<handle>
 *   is typing…" on observer clients within 200 ms.
 * @owner Zifmia server (tools/zifmia/server/ws).
 *
 * Invariants:
 *
 * - One holder per room, scoped to a specific connection (NOT to an
 *   identity). Multi-tab users get independent locks per tab — closing
 *   the typing tab implicitly releases the lock without affecting the
 *   user's other tabs.
 * - All mutations are explicit method calls. The registry never
 *   reaches into the socket lifecycle on its own; the WS route's
 *   `close` handler is responsible for `releaseAllFor(conn)` and the
 *   HTTP command route is responsible for `forceRelease(roomId)`
 *   after every turn.
 * - Process-local state. Phase 7 multi-process deployment will need a
 *   shared lock backend (Postgres advisory lock, Redis lease, etc.)
 *   but v1 is single-container per the ADR.
 */

import type { ClientConnection } from './connection';

export interface LockHolder {
  /** The connection holding the lock. Identity comparisons go through
   * `connection.identity` so the wire-side `LockStateMessage` carries
   * only `{identityId, handle}` — the connection reference is never
   * exposed outside the registry. */
  readonly connection: ClientConnection;
}

export interface AcquireResult {
  /** True when the caller now holds the lock (either fresh acquire
   * or idempotent re-acquire). False when a different connection
   * holds it. */
  acquired: boolean;
  /** True only when the acquire transitioned the room from "no
   * holder" or "different holder" to "this caller". False on
   * idempotent re-acquire (the caller already held it) and on
   * contention failures. Used to gate the `lock:state` broadcast —
   * we only broadcast when the visible state actually changed. */
  stateChanged: boolean;
  /** The holder after the call. Always populated on `acquired: true`;
   * populated with the existing holder on `acquired: false`. */
  holder: LockHolder;
}

export interface ReleaseResult {
  /** True when the caller's release transitioned the lock from held
   * to free. False when the caller didn't hold the lock (idempotent
   * no-op). */
  released: boolean;
}

export class LockRegistry {
  private readonly holders = new Map<string, LockHolder>();

  /**
   * Attempt to take the lock. Idempotent for the current holder
   * (returns acquired=true, stateChanged=false). Returns
   * acquired=false with the existing holder when someone else holds
   * the lock.
   */
  tryAcquire(conn: ClientConnection, roomId: string): AcquireResult {
    const existing = this.holders.get(roomId);
    if (!existing) {
      const holder: LockHolder = { connection: conn };
      this.holders.set(roomId, holder);
      return { acquired: true, stateChanged: true, holder };
    }
    if (existing.connection === conn) {
      // Idempotent re-acquire — no broadcast warranted.
      return { acquired: true, stateChanged: false, holder: existing };
    }
    return { acquired: false, stateChanged: false, holder: existing };
  }

  /**
   * Release the lock if held by `conn`. No-op if the lock is free
   * or held by a different connection.
   */
  release(conn: ClientConnection, roomId: string): ReleaseResult {
    const existing = this.holders.get(roomId);
    if (!existing || existing.connection !== conn) {
      return { released: false };
    }
    this.holders.delete(roomId);
    return { released: true };
  }

  /**
   * Drop the lock for `roomId` regardless of who holds it. Returns
   * the previous holder so the caller can broadcast a `lock:state`
   * with `holder: null` only when the state actually changed. Used
   * by the HTTP command route after every turn (success or
   * engine-throw).
   */
  forceRelease(roomId: string): LockHolder | null {
    const previous = this.holders.get(roomId) ?? null;
    if (previous) this.holders.delete(roomId);
    return previous;
  }

  /**
   * Release every lock currently held by `conn`. Returns the room
   * ids that were released so the caller can broadcast a
   * `lock:state { holder: null }` to each. Called from the
   * WebSocket route's `close` handler — implicit release on
   * disconnect is required for the typing-lock UX (other clients
   * must re-enable inputs within 1 s per ADR-175 §4).
   */
  releaseAllFor(conn: ClientConnection): string[] {
    const released: string[] = [];
    for (const [roomId, holder] of this.holders) {
      if (holder.connection === conn) {
        released.push(roomId);
      }
    }
    for (const roomId of released) {
      this.holders.delete(roomId);
    }
    return released;
  }

  /** Read-only view of the current holder for a room. */
  holderOf(roomId: string): LockHolder | null {
    return this.holders.get(roomId) ?? null;
  }

  /** Test/diagnostic helper — every active lock. */
  snapshot(): Map<string, LockHolder> {
    return new Map(this.holders);
  }
}
