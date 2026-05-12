/**
 * @module @sharpee/zifmia/server/compaction
 * @purpose Phase 4d compaction worker. Reclaims unreachable per-turn
 *   snapshots so a long-lived room doesn't accumulate gigabytes of
 *   gzipped world snapshots that nothing reads.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Gating:
 *   - Off by default in v1. Operators opt in via
 *     `ZIFMIA_COMPACTION_ENABLED=true`. When disabled, the worker is
 *     a no-op shell that returns immediately from `stop()`.
 *   - Interval comes from `ZIFMIA_COMPACTION_INTERVAL_MS` (positive
 *     integer); default 5 minutes (`DEFAULT_COMPACTION_INTERVAL_MS`).
 *     A misconfigured value warns once and falls back to the default.
 *
 * Concurrency:
 *   - Each tick calls `adapter.compactRoomSaveBlobs(roomId)` for
 *     every room sequentially. The adapter implementation is atomic
 *     per-room, so a concurrent `appendSaveBlob` from a turn does
 *     not race with the compactor's `MAX(turn)` read.
 *   - Ticks do not overlap: if a tick is still running when the
 *     interval fires, the next fire is skipped (a running flag is
 *     held across the full sweep).
 *   - `stop()` waits for the in-flight tick to drain so callers can
 *     close cleanly without orphaning a sweep.
 */

import type { StorageAdapter } from '../storage/adapter';

/** Default sweep interval: 5 minutes. Tuned for "rarely useful but
 * always cheap when nothing is wrong" — long-lived rooms that
 * actually need compaction will see results within this window, and
 * test/short-lived rooms pay almost nothing. */
export const DEFAULT_COMPACTION_INTERVAL_MS = 5 * 60 * 1000;

export interface CompactionWorkerOptions {
  /** Adapter on which to invoke `compactRoomSaveBlobs`. */
  adapter: StorageAdapter;
  /** Master switch. When `false`, the worker is a no-op handle. */
  enabled: boolean;
  /** Tick period in milliseconds. Must be a positive integer. */
  intervalMs?: number;
  /** Optional logger sink for errors during a tick. Defaults to
   * `console.error` so failures aren't silently swallowed. */
  onError?: (err: unknown) => void;
  /** Test seam: lets the unit test schedule the next tick deterministically.
   * Defaults to `setInterval`/`clearInterval`. */
  scheduler?: {
    setInterval(handler: () => void, ms: number): number;
    clearInterval(token: number): void;
  };
}

export interface CompactionWorkerHandle {
  /** True when the worker has a live timer scheduled. */
  readonly running: boolean;
  /** Run one sweep immediately. Returns the per-room deletion counts.
   * Useful for tests and for ops-triggered manual GC. */
  sweepNow(): Promise<{ rooms: number; deleted: number }>;
  /** Stop the timer and wait for any in-flight sweep to drain. */
  stop(): Promise<void>;
}

/** Resolve `ZIFMIA_COMPACTION_ENABLED` against truthy strings. */
export function parseCompactionEnabled(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/** Resolve `ZIFMIA_COMPACTION_INTERVAL_MS`; falls back on garbage. */
export function parseCompactionInterval(
  raw: string | undefined,
  warn?: (msg: string) => void,
): number {
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_COMPACTION_INTERVAL_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    String(parsed) !== raw.trim()
  ) {
    warn?.(
      `ZIFMIA_COMPACTION_INTERVAL_MS='${raw}' is not a positive integer; falling back to ${DEFAULT_COMPACTION_INTERVAL_MS}`,
    );
    return DEFAULT_COMPACTION_INTERVAL_MS;
  }
  return parsed;
}

export function startCompactionWorker(
  options: CompactionWorkerOptions,
): CompactionWorkerHandle {
  const interval = options.intervalMs ?? DEFAULT_COMPACTION_INTERVAL_MS;
  if (!Number.isInteger(interval) || interval <= 0) {
    throw new Error(
      `compaction: intervalMs must be a positive integer, got ${interval}`,
    );
  }
  const scheduler = options.scheduler ?? {
    setInterval: (h, ms) => setInterval(h, ms) as unknown as number,
    clearInterval: (t) => clearInterval(t as unknown as NodeJS.Timeout),
  };
  const onError =
    options.onError ??
    ((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[zifmia] compaction tick failed:', err);
    });

  if (!options.enabled) {
    // No-op handle: stop() is immediate; sweepNow is still callable
    // (operators / tests may want to run a manual sweep even when
    // periodic compaction is off).
    return {
      get running() {
        return false;
      },
      async sweepNow() {
        return sweep(options.adapter, onError);
      },
      async stop() {
        /* no-op */
      },
    };
  }

  let inFlight: Promise<{ rooms: number; deleted: number }> | null = null;
  let stopped = false;

  const tick = (): void => {
    if (stopped) return;
    if (inFlight) return; // skip overlapping ticks
    inFlight = sweep(options.adapter, onError).finally(() => {
      inFlight = null;
    });
  };

  const token = scheduler.setInterval(tick, interval);

  return {
    get running() {
      return !stopped;
    },
    async sweepNow() {
      if (inFlight) await inFlight;
      const result = await sweep(options.adapter, onError);
      return result;
    },
    async stop() {
      stopped = true;
      scheduler.clearInterval(token);
      if (inFlight) {
        await inFlight.catch(() => undefined);
      }
    },
  };
}

/**
 * Single sweep across every room. Errors are logged per-room and the
 * sweep continues — one bad room's blob doesn't block GC for the
 * rest of the server.
 */
async function sweep(
  adapter: StorageAdapter,
  onError: (err: unknown) => void,
): Promise<{ rooms: number; deleted: number }> {
  const rooms = await adapter.listRooms();
  let totalDeleted = 0;
  let roomsSwept = 0;
  for (const room of rooms) {
    try {
      const result = await adapter.compactRoomSaveBlobs(room.id);
      totalDeleted += result.deleted;
      roomsSwept += 1;
    } catch (err) {
      onError(err);
    }
  }
  return { rooms: roomsSwept, deleted: totalDeleted };
}
