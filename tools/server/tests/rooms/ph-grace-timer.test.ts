/**
 * PH grace timer behavior tests.
 *
 * Behavior Statement — PhGraceTimer
 *   DOES:
 *     - start(room_id) schedules `onFire(room_id)` in `timeoutMs` (default 5min).
 *     - cancel(room_id) clears the pending schedule; returns true if anything
 *       was cancelled, false otherwise.
 *     - Re-calling start(room_id) before fire cancels the prior schedule and
 *       restarts the clock (matches "PH disconnected, reconnected, then
 *       disconnected again").
 *     - pending() returns all room_ids currently awaiting fire.
 *     - cancelAll() drops every pending schedule at server shutdown.
 *   WHEN: presence handler detects PH disconnect → start(); hello handler
 *         detects PH reconnect → cancel().
 *   BECAUSE: ADR-153 Decision 6 — 5-minute grace window before the
 *            succession chain runs.
 *   REJECTS WHEN:
 *     - cancel(room_id) on an unstarted room → returns false, no throw.
 *
 * Boundary B-3 (per plan §7 / acceptance criteria):
 *   - At T+(timeoutMs - 1) the timer has NOT fired yet.
 *   - At T+(timeoutMs + 1) it has fired exactly once.
 *   - Reconnect before timeoutMs cancels the fire.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPhGraceTimer,
  createMockClock,
  DEFAULT_PH_GRACE_TIMEOUT_MS,
  type MockClock,
  type PhGraceTimer,
} from '../../src/rooms/ph-grace-timer.js';

describe('PhGraceTimer (B-3 boundary + cancel semantics)', () => {
  let clock: MockClock;
  let timer: PhGraceTimer;
  let fires: string[];

  beforeEach(() => {
    clock = createMockClock(0);
    fires = [];
    timer = createPhGraceTimer(
      { onFire: (room_id) => fires.push(room_id), clock },
      { timeoutMs: 60_000 } // shorter window for arithmetic readability
    );
  });

  it('does not fire at T + (timeoutMs - 1)', () => {
    timer.start('room-A');
    clock.advance(60_000 - 1);
    expect(fires).toEqual([]);
    expect(timer.pending()).toEqual(['room-A']);
  });

  it('fires exactly once at T + (timeoutMs + 1)', () => {
    timer.start('room-A');
    clock.advance(60_000 + 1);
    expect(fires).toEqual(['room-A']);
    expect(timer.pending()).toEqual([]);
  });

  it('fires at T + timeoutMs exactly', () => {
    timer.start('room-A');
    clock.advance(60_000);
    expect(fires).toEqual(['room-A']);
  });

  it('cancel before fire: timer never fires; cancel returns true', () => {
    timer.start('room-A');
    const cancelled = timer.cancel('room-A');
    expect(cancelled).toBe(true);

    clock.advance(60_000 * 10);
    expect(fires).toEqual([]);
    expect(timer.pending()).toEqual([]);
  });

  it('cancel on unstarted room returns false', () => {
    expect(timer.cancel('no-such-room')).toBe(false);
  });

  it('cancel after fire: returns false (already removed on fire)', () => {
    timer.start('room-A');
    clock.advance(60_000);
    expect(fires).toEqual(['room-A']);
    expect(timer.cancel('room-A')).toBe(false);
  });

  it('restart before fire resets the clock', () => {
    timer.start('room-A');
    clock.advance(30_000); // 30s elapsed — half the window
    expect(fires).toEqual([]);

    timer.start('room-A'); // restart resets to 0
    clock.advance(30_000); // another 30s — if reset, fire shouldn't happen yet
    expect(fires).toEqual([]);

    clock.advance(30_001); // 30s + 1 more — now past the full 60_000 from restart
    expect(fires).toEqual(['room-A']);
  });

  it('per-room isolation: independent rooms fire independently', () => {
    timer.start('room-A');
    clock.advance(30_000);
    timer.start('room-B'); // room-B started 30s later
    clock.advance(30_001); // now T=60_001; room-A fired
    expect(fires).toEqual(['room-A']);
    expect(timer.pending()).toEqual(['room-B']);

    clock.advance(30_000); // T=90_001; room-B fires at 30_000 + 60_000 = 90_000
    expect(fires).toEqual(['room-A', 'room-B']);
  });

  it('cancelAll drops every pending schedule', () => {
    timer.start('room-A');
    timer.start('room-B');
    timer.start('room-C');
    expect(timer.pending().length).toBe(3);

    timer.cancelAll();
    expect(timer.pending()).toEqual([]);

    clock.advance(60_000 * 10);
    expect(fires).toEqual([]);
  });

  it('default timeout is 5 minutes (DEFAULT_PH_GRACE_TIMEOUT_MS)', () => {
    const defaultTimer = createPhGraceTimer({
      onFire: (r) => fires.push(r),
      clock,
    });
    defaultTimer.start('room-A');
    clock.advance(DEFAULT_PH_GRACE_TIMEOUT_MS - 1);
    expect(fires).toEqual([]);
    clock.advance(2);
    expect(fires).toEqual(['room-A']);
  });

  it('pending() reflects live schedules only (fired rooms removed)', () => {
    timer.start('room-A');
    timer.start('room-B');
    expect(timer.pending().sort()).toEqual(['room-A', 'room-B']);

    clock.advance(60_000); // both fire
    expect(timer.pending()).toEqual([]);
    expect(fires.sort()).toEqual(['room-A', 'room-B']);
  });
});
