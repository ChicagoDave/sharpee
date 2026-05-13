/**
 * Per-room typing-seat lock per ADR-177 AC-10.
 *
 * Public interface: {@link RoomLock}, {@link createRoomLock},
 * {@link LOCK_EXPIRY_MS_DEFAULT}, {@link LOCK_HEARTBEAT_MS_DEFAULT}.
 * Owner: zifmia server, WS layer. Pure state machine; no I/O.
 *
 * Contract:
 *   - One holder at a time per room (the `participant_id`).
 *   - `acquire(holder)` from the current holder refreshes `expiresAt`
 *     (heartbeat). From a different holder, the call is rejected.
 *     From `null`, the call grants the lock.
 *   - `release(holder)` from the current holder clears the lock.
 *   - After `expiryMs` of no acquire, an auto-release timer fires and
 *     the lock clears; the caller registers an `onExpiry` callback to
 *     drive the broadcast.
 *   - `forceRelease()` is the moderation hammer (PH/CoHost via the
 *     /force-release HTTP route — ADR-177 §4); the lock holder's
 *     identity is forgotten regardless of who they were.
 *
 * Heartbeat margin: default 400ms expiry / 200ms heartbeat per AC-10
 * (revised in the advisory-fix pass to provide a 2× margin tolerating
 * one missed heartbeat on flaky connections).
 *
 * All state changes flow through methods that return `LockChange`
 * tuples — the caller (RoomsHub) decides when to broadcast. Tests can
 * inject `now` and `scheduleExpiry` so the timer is deterministic.
 */

export const LOCK_EXPIRY_MS_DEFAULT = 400;
export const LOCK_HEARTBEAT_MS_DEFAULT = 200;

export interface LockState {
  readonly holder: string | null;
  readonly expiresAt: number | null;
}

export type LockAcquireOutcome =
  | { ok: true; broadcast: boolean; state: LockState }
  | { ok: false; state: LockState };

export type LockReleaseOutcome =
  | { ok: true; broadcast: boolean; state: LockState };

export interface LockTimerHandle {
  cancel(): void;
}

export interface LockSchedulerOptions {
  now?: () => number;
  /** Schedule a callback to fire after `ms`. Test fixtures pass a manual scheduler. */
  scheduleExpiry?: (ms: number, cb: () => void) => LockTimerHandle;
  /** Override the 400ms expiry default (tests use small values). */
  expiryMs?: number;
}

function defaultScheduleExpiry(ms: number, cb: () => void): LockTimerHandle {
  const id = setTimeout(cb, ms);
  // Don't keep the Node event loop alive solely for lock expiry — the
  // server's listen() owns the loop's lifetime.
  if (typeof id === 'object' && id !== null && 'unref' in id) {
    (id as { unref: () => void }).unref();
  }
  return {
    cancel: () => clearTimeout(id)
  };
}

export interface RoomLock {
  /** Snapshot of current state. */
  state(): LockState;
  /** Attempt to acquire (or heartbeat-refresh). */
  acquire(holder: string): LockAcquireOutcome;
  /** Release if `holder` is the current holder. */
  release(holder: string): LockReleaseOutcome;
  /** Moderation: clear the lock regardless of holder. */
  forceRelease(): LockReleaseOutcome;
  /** Register a listener for auto-expiry events. The hub broadcasts on this. */
  onExpiry(cb: (state: LockState) => void): void;
  /** Tear down the timer (server shutdown). */
  dispose(): void;
}

/**
 * Construct a RoomLock. Each room gets its own instance owned by the
 * RoomsHub. `onExpiry` is wired by the hub to dispatch `lock:state`
 * broadcasts.
 */
export function createRoomLock(options: LockSchedulerOptions = {}): RoomLock {
  const now = options.now ?? Date.now;
  const scheduleExpiry = options.scheduleExpiry ?? defaultScheduleExpiry;
  const expiryMs = options.expiryMs ?? LOCK_EXPIRY_MS_DEFAULT;

  let state: LockState = { holder: null, expiresAt: null };
  let timer: LockTimerHandle | null = null;
  let onExpiryCb: ((state: LockState) => void) | null = null;

  const cancelTimer = () => {
    if (timer) {
      timer.cancel();
      timer = null;
    }
  };

  const scheduleNext = () => {
    cancelTimer();
    timer = scheduleExpiry(expiryMs, () => {
      timer = null;
      state = { holder: null, expiresAt: null };
      onExpiryCb?.(state);
    });
  };

  return {
    state: () => state,

    acquire(holder) {
      if (state.holder === holder) {
        // Heartbeat: refresh expiry; do NOT rebroadcast (the holder
        // hasn't changed and clients only care about meaningful state
        // transitions, per AC-10 "rebroadcasts lock:state only when
        // the holder or expiry meaningfully changes").
        state = { holder, expiresAt: now() + expiryMs };
        scheduleNext();
        return { ok: true, broadcast: false, state };
      }
      if (state.holder !== null) {
        return { ok: false, state };
      }
      state = { holder, expiresAt: now() + expiryMs };
      scheduleNext();
      return { ok: true, broadcast: true, state };
    },

    release(holder) {
      if (state.holder !== holder) {
        return { ok: true, broadcast: false, state };
      }
      cancelTimer();
      state = { holder: null, expiresAt: null };
      return { ok: true, broadcast: true, state };
    },

    forceRelease() {
      if (state.holder === null) {
        return { ok: true, broadcast: false, state };
      }
      cancelTimer();
      state = { holder: null, expiresAt: null };
      return { ok: true, broadcast: true, state };
    },

    onExpiry(cb) {
      onExpiryCb = cb;
    },

    dispose() {
      cancelTimer();
      onExpiryCb = null;
    }
  };
}
