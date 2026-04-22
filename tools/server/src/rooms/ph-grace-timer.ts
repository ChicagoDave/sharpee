/**
 * Primary Host grace timer.
 *
 * Public interface: {@link PhGraceTimer}, {@link createPhGraceTimer},
 * {@link Clock}, {@link createRealClock}, {@link createMockClock}.
 *
 * Bounded context: room lifecycle (ADR-153 Decision 6 — cascading succession;
 * 5-minute grace window).
 *
 * When the Primary Host disconnects, the presence handler calls
 * `start(room_id)`. Five minutes later — unless `cancel(room_id)` has fired —
 * the timer calls the `onFire` callback with the room id. The callback is
 * expected to check whether the PH is still disconnected and, if so, invoke
 * {@link performSuccession}. The grace timer itself is dumb: one setTimeout
 * per room, keyed by room_id, overwriting any prior pending timer.
 *
 * Time is injected via the {@link Clock} abstraction so boundary tests
 * (T+4:59s vs T+5:01s) can drive time deterministically without relying on
 * vitest's fake-timer internals.
 */

export interface ClockHandle {
  readonly id: number;
}

/** Minimal clock abstraction: schedule a callback; cancel it by handle. */
export interface Clock {
  schedule(cb: () => void, delayMs: number): ClockHandle;
  cancel(handle: ClockHandle): void;
}

/** Production clock wrapping setTimeout/clearTimeout. Each handle unrefs so tests can exit. */
export function createRealClock(): Clock {
  let nextId = 1;
  const liveHandles = new Map<number, NodeJS.Timeout>();
  return {
    schedule(cb, delayMs): ClockHandle {
      const id = nextId++;
      const t = setTimeout(() => {
        liveHandles.delete(id);
        cb();
      }, delayMs);
      if (typeof t.unref === 'function') t.unref();
      liveHandles.set(id, t);
      return { id };
    },
    cancel(handle): void {
      const t = liveHandles.get(handle.id);
      if (t) {
        clearTimeout(t);
        liveHandles.delete(handle.id);
      }
    },
  };
}

/**
 * Test clock: tracks virtual time; `advance(ms)` fires any scheduled
 * callbacks whose deadline has passed. Callbacks run in order of deadline
 * (ties broken by insertion order). Post-advance, `now()` reflects the new
 * virtual time.
 */
export interface MockClock extends Clock {
  now(): number;
  advance(ms: number): void;
  pendingCount(): number;
}

export function createMockClock(initialTimeMs: number = 0): MockClock {
  let virtualNow = initialTimeMs;
  let nextId = 1;
  interface Entry {
    id: number;
    deadline: number;
    cb: () => void;
    seq: number;
  }
  const entries: Entry[] = [];
  let seq = 0;

  return {
    schedule(cb, delayMs): ClockHandle {
      const id = nextId++;
      entries.push({ id, deadline: virtualNow + delayMs, cb, seq: seq++ });
      return { id };
    },
    cancel(handle): void {
      const idx = entries.findIndex((e) => e.id === handle.id);
      if (idx >= 0) entries.splice(idx, 1);
    },
    now(): number {
      return virtualNow;
    },
    advance(ms): void {
      const targetTime = virtualNow + ms;
      // Fire callbacks whose deadline <= targetTime, in deadline order.
      // A callback may schedule another timer; include those if their new
      // deadline is still within the advance window.
      while (true) {
        const due = entries.filter((e) => e.deadline <= targetTime);
        if (due.length === 0) break;
        due.sort((a, b) => a.deadline - b.deadline || a.seq - b.seq);
        const next = due[0]!;
        const idx = entries.indexOf(next);
        entries.splice(idx, 1);
        virtualNow = next.deadline;
        next.cb();
      }
      virtualNow = targetTime;
    },
    pendingCount(): number {
      return entries.length;
    },
  };
}

// ---------- Grace timer ----------

export interface PhGraceTimerDeps {
  /** Called when the timer fires. Receives the room_id the timer was started for. */
  onFire: (room_id: string) => void;
  clock?: Clock;
}

export interface PhGraceTimerOptions {
  /** Timeout in ms before fire. Default 5 * 60 * 1000 (5 minutes). */
  timeoutMs?: number;
}

export interface PhGraceTimer {
  /**
   * Schedule a grace fire for `room_id` in `timeoutMs`. If a timer was
   * already pending for this room, the prior one is cancelled (this matches
   * the real-world case where a PH disconnects, reconnects, and then
   * disconnects again — the second disconnect restarts the clock).
   */
  start(room_id: string): void;

  /**
   * Cancel the pending timer for `room_id`, if any.
   * Returns true if a timer was cancelled, false if there was none.
   */
  cancel(room_id: string): boolean;

  /** Room ids with a pending timer. */
  pending(): string[];

  /** Cancel every pending timer. Used at server shutdown. */
  cancelAll(): void;
}

export const DEFAULT_PH_GRACE_TIMEOUT_MS = 5 * 60 * 1000;

export function createPhGraceTimer(
  deps: PhGraceTimerDeps,
  options: PhGraceTimerOptions = {}
): PhGraceTimer {
  const clock = deps.clock ?? createRealClock();
  const timeoutMs = options.timeoutMs ?? DEFAULT_PH_GRACE_TIMEOUT_MS;

  const pending = new Map<string, ClockHandle>();

  return {
    start(room_id): void {
      const existing = pending.get(room_id);
      if (existing) clock.cancel(existing);

      const handle = clock.schedule(() => {
        pending.delete(room_id);
        deps.onFire(room_id);
      }, timeoutMs);
      pending.set(room_id, handle);
    },

    cancel(room_id): boolean {
      const existing = pending.get(room_id);
      if (!existing) return false;
      clock.cancel(existing);
      pending.delete(room_id);
      return true;
    },

    pending(): string[] {
      return [...pending.keys()];
    },

    cancelAll(): void {
      for (const h of pending.values()) clock.cancel(h);
      pending.clear();
    },
  };
}
