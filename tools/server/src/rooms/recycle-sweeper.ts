/**
 * Idle-room recycle sweeper.
 *
 * Public interface: {@link RecycleSweeper}, {@link createRecycleSweeper}.
 * Bounded context: room lifecycle (ADR-153 Decision 12, AC6).
 *
 * Every {@link RecycleSweeperOptions.intervalMs} (default 60 s) the sweeper
 * asks the rooms repository for every unpinned room whose `last_activity_at`
 * is older than `now - idleRecycleDays days`. For each candidate it:
 *
 *   1. tears down the sandbox (SHUTDOWN + delayed SIGKILL)
 *   2. cascade-deletes the room row — FK cascade removes participants,
 *      session_events, saves in a single transaction
 *   3. broadcasts `room_closed { reason: 'recycled' }` to any still-connected
 *      socket (unlikely, but the close is best-effort)
 *   4. closes every socket in the room with code 4007
 *
 * A process-level boolean guard prevents overlapping sweeps — in Node this
 * is defensive only (all per-candidate ops are sync better-sqlite3 calls),
 * but matches the ADR's explicit reentrancy requirement.
 *
 * The {@link Clock} abstraction is shared with ph-grace-timer so tests can
 * drive virtual time through {@link createMockClock}.
 */

import type { RoomsRepository } from '../repositories/rooms.js';
import type { SandboxRegistry } from '../sandbox/sandbox-registry.js';
import type { ConnectionManager } from '../ws/connection-manager.js';
import { createRealClock, type Clock } from './ph-grace-timer.js';

/** Application close code attached to every socket during idle recycle. */
export const ROOM_RECYCLED_CLOSE_CODE = 4007;

/** Default sweep period — once per minute. */
export const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

export interface RecycleSweeperDeps {
  rooms: RoomsRepository;
  sandboxes: SandboxRegistry;
  connections: ConnectionManager;
  /** Scheduler. Tests inject a mock; production defaults to setTimeout. */
  clock?: Clock;
  /** Returns "now" for the recycle query. Tests override for boundary cases. */
  now?: () => Date;
}

export interface RecycleSweeperOptions {
  /** Rooms idle longer than this are candidates. Operator-configurable. */
  idleRecycleDays: number;
  /** Milliseconds between automatic sweeps. Default 60 s. */
  intervalMs?: number;
}

export interface RecycleSweeper {
  /** Schedule the first sweep. Subsequent sweeps chain via clock.schedule. */
  start(): void;
  /** Cancel any pending scheduled sweep. Does not interrupt a sweep in flight. */
  stop(): void;
  /**
   * Run one sweep synchronously. Returns the number of rooms that were
   * recycled. Returns 0 without mutation if a sweep is already in flight.
   */
  sweep(): number;
  /** True while a sweep call is running. */
  isRunning(): boolean;
}

/**
 * Construct a sweeper. Call {@link RecycleSweeper.start} to begin periodic
 * sweeps; call {@link RecycleSweeper.stop} at server shutdown.
 */
export function createRecycleSweeper(
  deps: RecycleSweeperDeps,
  options: RecycleSweeperOptions
): RecycleSweeper {
  const clock = deps.clock ?? createRealClock();
  const now = deps.now ?? (() => new Date());
  const intervalMs = options.intervalMs ?? DEFAULT_SWEEP_INTERVAL_MS;
  const idleDays = options.idleRecycleDays;

  let scheduled: ReturnType<Clock['schedule']> | null = null;
  let running = false;

  function sweepOnce(): number {
    if (running) return 0;
    running = true;
    try {
      const candidates = deps.rooms.listRecycleCandidates(
        now().toISOString(),
        idleDays
      );
      for (const room of candidates) {
        deps.sandboxes.tearDown(room.room_id);
        deps.rooms.delete(room.room_id);
        deps.connections.broadcast(room.room_id, {
          kind: 'room_closed',
          reason: 'recycled',
        });
        deps.connections.closeRoom(
          room.room_id,
          ROOM_RECYCLED_CLOSE_CODE,
          'room_recycled'
        );
      }
      return candidates.length;
    } finally {
      running = false;
    }
  }

  function scheduleNext(): void {
    scheduled = clock.schedule(() => {
      scheduled = null;
      try {
        sweepOnce();
      } finally {
        scheduleNext();
      }
    }, intervalMs);
  }

  return {
    start(): void {
      if (scheduled) return; // already started; guard against double-start
      scheduleNext();
    },

    stop(): void {
      if (scheduled) {
        clock.cancel(scheduled);
        scheduled = null;
      }
    },

    sweep(): number {
      return sweepOnce();
    },

    isRunning(): boolean {
      return running;
    },
  };
}
