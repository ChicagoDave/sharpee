/**
 * RecycleSweeper — 14-day idle-room recycler per ADR-177 §Carries
 * forward.
 *
 * Public interface: {@link RecycleSweeper}, {@link createRecycleSweeper},
 * {@link DEFAULT_RECYCLE_MS}, {@link DEFAULT_RECYCLE_CHECK_INTERVAL_MS}.
 * Owner: zifmia server, succession domain.
 *
 * Periodically scans `rooms` for entries with
 * `deleted_at IS NULL AND last_activity_at < now() - recycleMs` and
 * marks them deleted. Tests inject `scheduleInterval` + a manual
 * trigger so the sweep is deterministic.
 */

import type { RoomsRepository } from '../rooms/repository.js';

export const DEFAULT_RECYCLE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const DEFAULT_RECYCLE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export interface RecycleIntervalHandle {
  cancel(): void;
}

export interface CreateRecycleSweeperOptions {
  rooms: RoomsRepository;
  /** Idle threshold in ms. Default 14 days. */
  recycleMs?: number;
  /** How often to scan. Default 1 hour. */
  checkIntervalMs?: number;
  /** Inject `Date.now`-equivalent for tests. */
  now?: () => number;
  /** Inject the interval scheduler (tests use a manual driver). */
  scheduleInterval?: (ms: number, cb: () => void) => RecycleIntervalHandle;
  /** Disable the auto interval; only manual `sweep()` works. */
  manualOnly?: boolean;
}

export interface RecycleSweeper {
  /** Run one sweep now; return the count of rooms marked deleted. */
  sweep(): number;
  /** Tear down the interval (server shutdown). */
  dispose(): void;
}

function defaultScheduleInterval(ms: number, cb: () => void): RecycleIntervalHandle {
  const id = setInterval(cb, ms);
  if (typeof id === 'object' && id !== null && 'unref' in id) {
    (id as { unref: () => void }).unref();
  }
  return { cancel: () => clearInterval(id) };
}

export function createRecycleSweeper(options: CreateRecycleSweeperOptions): RecycleSweeper {
  const recycleMs = options.recycleMs ?? DEFAULT_RECYCLE_MS;
  const checkIntervalMs = options.checkIntervalMs ?? DEFAULT_RECYCLE_CHECK_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const scheduleInterval = options.scheduleInterval ?? defaultScheduleInterval;

  let handle: RecycleIntervalHandle | null = null;

  function sweep(): number {
    const cutoff = now() - recycleMs;
    return options.rooms.sweepIdle(cutoff);
  }

  if (!options.manualOnly) {
    handle = scheduleInterval(checkIntervalMs, () => {
      try {
        sweep();
      } catch {
        // Sweep failures should not crash the server; the next tick
        // tries again.
      }
    });
  }

  return {
    sweep,
    dispose() {
      if (handle) handle.cancel();
      handle = null;
    }
  };
}
