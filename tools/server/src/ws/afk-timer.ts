/**
 * AFK auto-release timer.
 *
 * Public interface: {@link AfkTimer}, {@link createAfkTimer},
 * {@link AfkTimerDeps}.
 * Bounded context: lock-on-typing runtime (ADR-153 Decision 7 — AFK release).
 *
 * A single global sweep timer scans every room that currently has a lock
 * holder (via {@link LockManager.listHeld}) and releases any that have been
 * idle beyond the threshold. The plan document describes this as a
 * "per-room setInterval," but since LockManager already tracks all rooms
 * centrally, a global sweep accomplishes the same behavior without wiring
 * a timer lifecycle into room create/delete paths.
 *
 * The `tick()` method is exposed so integration tests can drive sweeps
 * deterministically without patching real timers; production paths call
 * `start()` to schedule `setInterval`.
 */

import type { SessionEventsRepository } from '../repositories/session-events.js';
import type { ConnectionManager } from './connection-manager.js';
import type { LockManager } from './lock-manager.js';

const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

export interface AfkTimerDeps {
  locks: LockManager;
  connections: ConnectionManager;
  sessionEvents: SessionEventsRepository;
}

export interface AfkTimerOptions {
  /** Sweep interval in ms (default 60_000). Tests may pass a smaller value. */
  intervalMs?: number;
  /** AFK threshold passed through to LockManager.isAfk. Defaults to LockManager's own default. */
  afkTimeoutMs?: number;
}

export interface AfkTimer {
  /** Begin periodic sweeps. Safe to call multiple times — second call is a no-op. */
  start(): void;
  /** Clear the interval if one is scheduled. Safe to call if never started. */
  stop(): void;
  /**
   * Run one sweep pass immediately. Used directly by tests; also what the
   * scheduled interval invokes. Returns the number of rooms that were
   * force-released on this tick.
   */
  tick(): number;
}

/**
 * Construct an AFK sweep timer bound to the given lock manager and
 * broadcast / persistence dependencies.
 */
export function createAfkTimer(deps: AfkTimerDeps, options: AfkTimerOptions = {}): AfkTimer {
  const intervalMs = options.intervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const afkTimeoutMs = options.afkTimeoutMs;

  let handle: ReturnType<typeof setInterval> | null = null;

  function tick(): number {
    let releasedCount = 0;
    for (const { room_id } of deps.locks.listHeld()) {
      if (!deps.locks.isAfk(room_id, afkTimeoutMs)) continue;

      const prior = deps.locks.forceRelease(room_id);
      if (prior === null) continue; // raced away between isAfk and forceRelease

      deps.sessionEvents.append({
        room_id,
        participant_id: null,
        kind: 'role',
        payload: {
          kind: 'role',
          op: 'force_release',
          target_participant_id: prior,
        },
      });

      deps.connections.broadcast(room_id, { kind: 'lock_state', holder_id: null });
      releasedCount++;
    }
    return releasedCount;
  }

  return {
    start(): void {
      if (handle !== null) return;
      handle = setInterval(tick, intervalMs);
      // Don't keep the Node event loop alive just for this timer — tests
      // and shutdown paths rely on the server being cleanly stoppable.
      if (typeof handle.unref === 'function') handle.unref();
    },

    stop(): void {
      if (handle === null) return;
      clearInterval(handle);
      handle = null;
    },

    tick,
  };
}

export const AFK_SWEEP_INTERVAL_MS = DEFAULT_SWEEP_INTERVAL_MS;
