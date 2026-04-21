/**
 * LockManager unit tests.
 *
 * Behavior Statement — createLockManager
 *   DOES:
 *     - acquires a lock for the first participant to call acquireOrUpdate
 *       on a free room (records holder_id, acquired_at, last_keystroke_at,
 *       draft_seq).
 *     - bumps last_keystroke_at when the current holder pings again.
 *     - bumps draft_seq only when the incoming seq is greater than stored
 *       (N-7 ordering — older frames are ignored).
 *     - returns the existing holder without mutating state when a different
 *       participant tries to acquire a held lock.
 *     - releases the lock only for the current holder in release().
 *     - unconditionally releases in forceRelease() (and returns the prior
 *       holder so callers can log it).
 *     - reports isAfk(room) true iff the lock is held and the holder has
 *       been idle at least the threshold.
 *   WHEN: called from draft_delta / release_lock / force_release / submit
 *         handlers and from the AFK timer tick.
 *   BECAUSE: only one participant may type at a time (ADR-153 Decision 7);
 *            every lock transition must flow through one source of truth.
 *   REJECTS WHEN:
 *     - acquire while another holds → returns acquired=false, no mutation.
 *     - release by a non-holder     → returns false, no mutation.
 *     - forceRelease when no holder → returns null (callers skip broadcast).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  AFK_TIMEOUT_MS,
  createLockManager,
  type Clock,
  type LockManager,
} from '../../src/ws/lock-manager.js';

class MockClock implements Clock {
  private t = 1_700_000_000_000; // arbitrary fixed baseline
  now(): number {
    return this.t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
  set(ms: number): void {
    this.t = ms;
  }
}

describe('LockManager', () => {
  let clock: MockClock;
  let lm: LockManager;
  const ROOM = 'room-A';
  const A = 'participant-A';
  const B = 'participant-B';

  beforeEach(() => {
    clock = new MockClock();
    lm = createLockManager(clock);
  });

  it('initial state: holder is null, draft_seq is 0', () => {
    const s = lm.getState(ROOM);
    expect(s.holder_id).toBeNull();
    expect(s.acquired_at).toBeNull();
    expect(s.last_keystroke_at).toBeNull();
    expect(s.draft_seq).toBe(0);
  });

  it('first acquireOrUpdate on a free room acquires the lock for the caller', () => {
    const result = lm.acquireOrUpdate(ROOM, A, 1);

    expect(result.acquired).toBe(true);
    expect(result.holder_id).toBe(A);
    expect(result.draft_seq).toBe(1);

    const s = lm.getState(ROOM);
    expect(s.holder_id).toBe(A);
    expect(s.acquired_at).toBe(clock.now());
    expect(s.last_keystroke_at).toBe(clock.now());
    expect(s.draft_seq).toBe(1);
  });

  it('acquireOrUpdate by the current holder bumps last_keystroke_at and advances draft_seq', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    clock.advance(500);
    const result = lm.acquireOrUpdate(ROOM, A, 2);

    expect(result.acquired).toBe(true);
    expect(result.holder_id).toBe(A);
    expect(result.draft_seq).toBe(2);

    const s = lm.getState(ROOM);
    expect(s.last_keystroke_at).toBe(clock.now());
    expect(s.draft_seq).toBe(2);
  });

  it('acquireOrUpdate by the holder with an older seq is ignored (N-7 ordering)', () => {
    lm.acquireOrUpdate(ROOM, A, 5);
    clock.advance(100);
    const result = lm.acquireOrUpdate(ROOM, A, 3);

    // last_keystroke_at still updates (the draft arrived, it was just out of order).
    expect(result.acquired).toBe(true);
    expect(result.holder_id).toBe(A);
    expect(result.draft_seq).toBe(5);

    const s = lm.getState(ROOM);
    expect(s.draft_seq).toBe(5);
    expect(s.last_keystroke_at).toBe(clock.now());
  });

  it('acquireOrUpdate by a different participant while held returns the existing holder and does not mutate', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    const before = lm.getState(ROOM);

    const result = lm.acquireOrUpdate(ROOM, B, 1);

    expect(result.acquired).toBe(false);
    expect(result.holder_id).toBe(A);

    const after = lm.getState(ROOM);
    expect(after).toEqual(before);
  });

  it('release by the holder clears the lock', () => {
    lm.acquireOrUpdate(ROOM, A, 3);
    expect(lm.release(ROOM, A)).toBe(true);

    const s = lm.getState(ROOM);
    expect(s.holder_id).toBeNull();
    expect(s.acquired_at).toBeNull();
    expect(s.last_keystroke_at).toBeNull();
    expect(s.draft_seq).toBe(0);
  });

  it('release by a non-holder returns false and leaves the lock intact', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    const before = lm.getState(ROOM);

    expect(lm.release(ROOM, B)).toBe(false);
    expect(lm.getState(ROOM)).toEqual(before);
  });

  it('release on a free room is a no-op and returns false', () => {
    expect(lm.release(ROOM, A)).toBe(false);
    expect(lm.getState(ROOM).holder_id).toBeNull();
  });

  it('forceRelease returns the prior holder and clears state', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    const prior = lm.forceRelease(ROOM);

    expect(prior).toBe(A);
    expect(lm.getState(ROOM).holder_id).toBeNull();
  });

  it('forceRelease on a free room returns null', () => {
    expect(lm.forceRelease(ROOM)).toBeNull();
  });

  it('subsequent acquire after release starts a fresh hold (seq resets, acquired_at resets)', () => {
    lm.acquireOrUpdate(ROOM, A, 7);
    lm.release(ROOM, A);
    clock.advance(1_000);

    const result = lm.acquireOrUpdate(ROOM, B, 1);

    expect(result.acquired).toBe(true);
    expect(result.holder_id).toBe(B);
    expect(result.draft_seq).toBe(1);
    const s = lm.getState(ROOM);
    expect(s.holder_id).toBe(B);
    expect(s.acquired_at).toBe(clock.now());
  });

  it('isAfk returns false when no one holds the lock', () => {
    expect(lm.isAfk(ROOM)).toBe(false);
  });

  it('isAfk returns false when the holder is under the threshold', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    clock.advance(AFK_TIMEOUT_MS - 1);
    expect(lm.isAfk(ROOM)).toBe(false);
  });

  it('isAfk returns true exactly at the threshold and beyond', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    clock.advance(AFK_TIMEOUT_MS);
    expect(lm.isAfk(ROOM)).toBe(true);
    clock.advance(60_000);
    expect(lm.isAfk(ROOM)).toBe(true);
  });

  it('isAfk resets when the holder pings again', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    clock.advance(AFK_TIMEOUT_MS - 5);
    expect(lm.isAfk(ROOM)).toBe(false);

    lm.acquireOrUpdate(ROOM, A, 2);
    clock.advance(10);
    expect(lm.isAfk(ROOM)).toBe(false);
  });

  it('isAfk honors a custom threshold override', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    clock.advance(1_000);
    expect(lm.isAfk(ROOM, 500)).toBe(true);
    expect(lm.isAfk(ROOM, 2_000)).toBe(false);
  });

  it('listHeld returns only rooms with a current holder', () => {
    lm.acquireOrUpdate('room-1', A, 1);
    lm.acquireOrUpdate('room-2', B, 1);
    lm.acquireOrUpdate('room-3', A, 1);
    lm.release('room-2', B);

    const held = lm.listHeld();
    const ids = held.map((h) => h.room_id).sort();
    expect(ids).toEqual(['room-1', 'room-3']);

    for (const h of held) {
      expect(h.state.holder_id).not.toBeNull();
    }
  });

  it('listHeld is a snapshot — mutating the returned state does not affect the manager', () => {
    lm.acquireOrUpdate(ROOM, A, 1);
    const held = lm.listHeld();
    held[0]!.state.holder_id = 'tampered';

    expect(lm.getState(ROOM).holder_id).toBe(A);
  });

  it('state is isolated per room', () => {
    lm.acquireOrUpdate('room-1', A, 1);
    lm.acquireOrUpdate('room-2', B, 1);

    expect(lm.getState('room-1').holder_id).toBe(A);
    expect(lm.getState('room-2').holder_id).toBe(B);
  });

  it('clear() drops all state', () => {
    lm.acquireOrUpdate('room-1', A, 1);
    lm.acquireOrUpdate('room-2', B, 1);
    lm.clear();

    expect(lm.listHeld()).toEqual([]);
    expect(lm.getState('room-1').holder_id).toBeNull();
    expect(lm.getState('room-2').holder_id).toBeNull();
  });
});
