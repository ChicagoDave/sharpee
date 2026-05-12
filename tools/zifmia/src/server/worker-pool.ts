/**
 * @module @sharpee/zifmia/server/worker-pool
 * @purpose In-process concurrency cap for turn execution. "Worker" =
 *   semaphore slot (NOT a Node Worker thread). One pool per server
 *   instance bounds the number of `executeTurnStatelessly` calls that
 *   run simultaneously, so per-container CPU + SQLite WAL contention
 *   stays bounded under load.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Invariants:
 *  - `inFlight` never exceeds `capacity`.
 *  - Every accepted task either resolves or rejects exactly once; the
 *    slot is released in either case (release-in-finally).
 *  - FIFO across the wait queue: the longest-waiting task runs next.
 *  - `capacity` is fixed for the pool's lifetime and is always >= 1.
 *
 * Wired at the `POST /rooms/:id/command` route boundary in
 * `command.ts`. The per-room lease (`adapter.acquireRoomLease`) stays
 * inside the slot so we never burn a slot waiting on a busy room.
 */

import * as os from 'os';

export interface WorkerPool {
  /** Pool size — concurrent slots. Fixed at construction. */
  readonly capacity: number;
  /** Currently-running task count (0 .. capacity). */
  readonly inFlight: number;
  /** Number of tasks waiting for a slot. */
  readonly queued: number;
  /**
   * Run `task` under the pool. If a slot is free, runs immediately;
   * otherwise FIFO-queues until one frees. Returns the task's result.
   * Slot is released even if `task` throws.
   */
  run<T>(task: () => Promise<T>): Promise<T>;
}

interface PendingTask {
  resume: () => void;
}

/**
 * Build a `WorkerPool` with the given concurrency cap. `capacity` must
 * be a positive integer; callers should size it via
 * {@link parseWorkerCount} so env-derived values are validated.
 */
export function createPool(capacity: number): WorkerPool {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error(
      `worker-pool: capacity must be a positive integer, got ${capacity}`,
    );
  }

  let inFlight = 0;
  const waiters: PendingTask[] = [];

  function tryAdmitNext(): void {
    if (waiters.length === 0) return;
    if (inFlight >= capacity) return;
    const next = waiters.shift()!;
    next.resume();
  }

  async function acquireSlot(): Promise<void> {
    if (inFlight < capacity) {
      inFlight += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      waiters.push({ resume: resolve });
    });
    inFlight += 1;
  }

  function releaseSlot(): void {
    inFlight -= 1;
    tryAdmitNext();
  }

  return {
    capacity,
    get inFlight() {
      return inFlight;
    },
    get queued() {
      return waiters.length;
    },
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquireSlot();
      try {
        return await task();
      } finally {
        releaseSlot();
      }
    },
  };
}

export interface ParseWorkerCountInput {
  /**
   * Raw env value (typically `process.env.ZIFMIA_WORKER_COUNT`). Pass
   * `undefined` to use the default.
   */
  envValue?: string | undefined;
  /**
   * Override for `os.cpus().length` — tests inject a fixed value. When
   * omitted, falls back to `os.cpus().length`.
   */
  cpus?: number;
  /** Optional warn sink for invalid env values. Defaults to no-op. */
  warn?: (message: string) => void;
}

/**
 * Resolve the effective worker count. Order of precedence:
 *  1. `ZIFMIA_WORKER_COUNT` if it parses to a positive integer.
 *  2. `Math.max(1, cpus - 1)` (the ADR-175 §OQ-2 default).
 *
 * Invalid env values fall through to the default and emit a single
 * `warn(...)` call; the resolved capacity is always >= 1.
 */
export function parseWorkerCount(input: ParseWorkerCountInput = {}): number {
  const cpus = input.cpus ?? os.cpus().length;
  const fallback = Math.max(1, cpus - 1);
  const raw = input.envValue;
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== raw.trim()) {
    input.warn?.(
      `ZIFMIA_WORKER_COUNT='${raw}' is not a positive integer; falling back to ${fallback}`,
    );
    return fallback;
  }
  return parsed;
}
