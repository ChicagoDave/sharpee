/**
 * Per-room input lock state (in-memory).
 *
 * Public interface: {@link LockManager}, {@link createLockManager},
 * {@link LockState}, {@link AcquireResult}.
 * Bounded context: WebSocket real-time arbitration (ADR-153 Decision 7 —
 * lock-on-typing model).
 *
 * The lock is the single source of truth for "who may currently type in
 * this room." It is:
 *   - acquired on the first `draft_delta` while free
 *   - updated (last_keystroke_at bumped) on subsequent `draft_delta`s from
 *     the holder
 *   - released on empty-text `draft_delta`, explicit `release_lock`,
 *     `submit_command` completion, Co-Host `force_release`, or 60s AFK
 *
 * Keystrokes are never persisted — this state is ephemeral per process.
 * On restart, all locks are implicitly null.
 */

const DEFAULT_AFK_TIMEOUT_MS = 60_000;

export interface LockState {
  holder_id: string | null;
  /** Epoch ms when the lock was first acquired in the current hold. */
  acquired_at: number | null;
  /** Epoch ms of the most recent draft_delta from the holder. */
  last_keystroke_at: number | null;
  /** Monotonic per-hold sequence; reset to 0 on each acquisition. */
  draft_seq: number;
}

export interface AcquireResult {
  /** True if the caller is now the holder (either freshly acquired or re-acquired-by-same). */
  acquired: boolean;
  /** Participant currently holding the lock after this call. */
  holder_id: string | null;
  /** Sequence number of this frame (the server's view). */
  draft_seq: number;
}

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export interface LockManager {
  /** Current state for `room_id`. Returns a fresh snapshot; callers may not mutate. */
  getState(room_id: string): LockState;

  /**
   * Attempt to acquire or update the lock for `participant_id` in `room_id`.
   *
   * If the lock is free: acquire it (records acquired_at, resets draft_seq to `seq`,
   * sets last_keystroke_at = now) and return `{ acquired: true, holder_id, draft_seq }`.
   *
   * If the caller already holds the lock: update last_keystroke_at = now.
   * If `seq` is older than the stored draft_seq the call is ignored and the
   * existing draft_seq is returned; otherwise draft_seq is bumped to `seq`.
   *
   * If another participant holds the lock: return `{ acquired: false, holder_id, draft_seq }`
   * without mutating state.
   */
  acquireOrUpdate(room_id: string, participant_id: string, seq: number): AcquireResult;

  /**
   * Release the lock if `participant_id` is the current holder. Returns true
   * if a release actually occurred. No-op + false if no one holds the lock
   * or another participant holds it.
   */
  release(room_id: string, participant_id: string): boolean;

  /**
   * Unconditional release — used by force_release, AFK timeout, and
   * submit_command completion (all of which bypass holder ownership checks).
   * Returns the participant_id that held the lock before the release, or null
   * if no one held it.
   */
  forceRelease(room_id: string): string | null;

  /**
   * Iterate every room that currently has a holder. Used by AFK timer ticks.
   * Returns pairs of (room_id, state snapshot).
   */
  listHeld(): Array<{ room_id: string; state: LockState }>;

  /**
   * Whether the holder in `room_id` has been idle at least `afk_timeout_ms`.
   * Returns false if no one holds the lock.
   */
  isAfk(room_id: string, afk_timeout_ms?: number): boolean;

  /** Test/diagnostic — drop all state. */
  clear(): void;
}

/**
 * Construct a fresh lock manager.
 *
 * @param clock  Optional clock injection — tests substitute a mock clock to
 *               avoid real setTimeout/Date.now dependencies.
 */
export function createLockManager(clock: Clock = systemClock): LockManager {
  const states = new Map<string, LockState>();

  function freshState(): LockState {
    return {
      holder_id: null,
      acquired_at: null,
      last_keystroke_at: null,
      draft_seq: 0,
    };
  }

  function getOrInit(room_id: string): LockState {
    let s = states.get(room_id);
    if (!s) {
      s = freshState();
      states.set(room_id, s);
    }
    return s;
  }

  return {
    getState(room_id) {
      const s = states.get(room_id) ?? freshState();
      return { ...s };
    },

    acquireOrUpdate(room_id, participant_id, seq) {
      const s = getOrInit(room_id);
      const now = clock.now();

      if (s.holder_id === null) {
        s.holder_id = participant_id;
        s.acquired_at = now;
        s.last_keystroke_at = now;
        s.draft_seq = seq;
        return { acquired: true, holder_id: participant_id, draft_seq: seq };
      }

      if (s.holder_id === participant_id) {
        s.last_keystroke_at = now;
        // Ignore out-of-order seqs (N-7): keep the existing draft_seq.
        if (seq > s.draft_seq) {
          s.draft_seq = seq;
        }
        return { acquired: true, holder_id: participant_id, draft_seq: s.draft_seq };
      }

      return { acquired: false, holder_id: s.holder_id, draft_seq: s.draft_seq };
    },

    release(room_id, participant_id) {
      const s = states.get(room_id);
      if (!s || s.holder_id === null) return false;
      if (s.holder_id !== participant_id) return false;
      s.holder_id = null;
      s.acquired_at = null;
      s.last_keystroke_at = null;
      s.draft_seq = 0;
      return true;
    },

    forceRelease(room_id) {
      const s = states.get(room_id);
      if (!s || s.holder_id === null) return null;
      const prior = s.holder_id;
      s.holder_id = null;
      s.acquired_at = null;
      s.last_keystroke_at = null;
      s.draft_seq = 0;
      return prior;
    },

    listHeld() {
      const out: Array<{ room_id: string; state: LockState }> = [];
      for (const [room_id, s] of states) {
        if (s.holder_id !== null) {
          out.push({ room_id, state: { ...s } });
        }
      }
      return out;
    },

    isAfk(room_id, afk_timeout_ms = DEFAULT_AFK_TIMEOUT_MS) {
      const s = states.get(room_id);
      if (!s || s.holder_id === null || s.last_keystroke_at === null) return false;
      return clock.now() - s.last_keystroke_at >= afk_timeout_ms;
    },

    clear() {
      states.clear();
    },
  };
}

export const AFK_TIMEOUT_MS = DEFAULT_AFK_TIMEOUT_MS;
