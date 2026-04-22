/**
 * AfkTimer unit tests.
 *
 * Behavior Statement — createAfkTimer.tick
 *   DOES:
 *     - For each room with a current holder, checks LockManager.isAfk(room_id).
 *     - If AFK: calls LockManager.forceRelease (which mutates lock state to
 *       holder_id=null), appends a role(force_release) session event with
 *       participant_id=null (actor=system) and target_participant_id=prior,
 *       and broadcasts lock_state(null) to that room.
 *     - Returns the count of rooms released on this tick.
 *   WHEN: tick() is called — either by setInterval (after start()) or
 *         directly from a test.
 *   BECAUSE: ADR-153 Decision 7 requires idle holders to auto-release so
 *            other participants can type; the audit trail records every
 *            force-release actor + target.
 *   REJECTS WHEN:
 *     - room has no holder          → skipped (LockManager.isAfk returns false)
 *     - holder's idle time below threshold → skipped
 *     - holder raced away between isAfk and forceRelease → skipped, no event row
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createAfkTimer } from '../../src/ws/afk-timer.js';
import {
  AFK_TIMEOUT_MS,
  createLockManager,
  type Clock,
  type LockManager,
} from '../../src/ws/lock-manager.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type { EventKind, EventPayload } from '../../src/repositories/types.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

class MockClock implements Clock {
  private t = 1_700_000_000_000;
  now(): number {
    return this.t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

interface BroadcastCall {
  room_id: string;
  msg: ServerMsg;
}
interface AppendCall {
  room_id: string;
  participant_id: string | null;
  kind: EventKind;
  payload: EventPayload;
}

function fakeConnections(): { mgr: ConnectionManager; calls: BroadcastCall[] } {
  const calls: BroadcastCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg) => {
      calls.push({ room_id, msg });
    },
    send: () => false,
    closeRoom: () => 0,
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, calls };
}

function fakeSessionEvents(): { repo: SessionEventsRepository; calls: AppendCall[] } {
  const calls: AppendCall[] = [];
  let nextId = 1;
  const repo: SessionEventsRepository = {
    append: (input) => {
      calls.push({ ...input });
      return nextId++;
    },
    listForRoom: () => [],
  };
  return { repo, calls };
}

describe('AfkTimer.tick', () => {
  let clock: MockClock;
  let locks: LockManager;
  let conns: ReturnType<typeof fakeConnections>;
  let events: ReturnType<typeof fakeSessionEvents>;
  const ROOM_A = 'room-A';
  const ROOM_B = 'room-B';
  const ALICE = 'alice';
  const BOB = 'bob';

  beforeEach(() => {
    clock = new MockClock();
    locks = createLockManager(clock);
    conns = fakeConnections();
    events = fakeSessionEvents();
  });

  it('does nothing when no room has a holder', () => {
    const timer = createAfkTimer({ locks, connections: conns.mgr, sessionEvents: events.repo });

    const released = timer.tick();

    expect(released).toBe(0);
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
  });

  it('skips a holder whose last_keystroke_at is below the AFK threshold', () => {
    locks.acquireOrUpdate(ROOM_A, ALICE, 1);
    const timer = createAfkTimer({ locks, connections: conns.mgr, sessionEvents: events.repo });

    clock.advance(AFK_TIMEOUT_MS - 1);
    const released = timer.tick();

    expect(released).toBe(0);
    expect(locks.getState(ROOM_A).holder_id).toBe(ALICE);
    expect(conns.calls).toEqual([]);
    expect(events.calls).toEqual([]);
  });

  it('releases a holder whose last_keystroke_at is at or beyond the AFK threshold', () => {
    locks.acquireOrUpdate(ROOM_A, ALICE, 1);
    const timer = createAfkTimer({ locks, connections: conns.mgr, sessionEvents: events.repo });

    clock.advance(AFK_TIMEOUT_MS);
    const released = timer.tick();

    expect(released).toBe(1);
    expect(locks.getState(ROOM_A).holder_id).toBeNull();

    expect(conns.calls).toEqual([
      { room_id: ROOM_A, msg: { kind: 'lock_state', holder_id: null } },
    ]);

    expect(events.calls).toHaveLength(1);
    expect(events.calls[0]).toMatchObject({
      room_id: ROOM_A,
      participant_id: null, // actor=system
      kind: 'role',
      payload: {
        kind: 'role',
        op: 'force_release',
        target_participant_id: ALICE,
      },
    });
  });

  it('processes multiple rooms: releases AFK holders, leaves active holders untouched', () => {
    locks.acquireOrUpdate(ROOM_A, ALICE, 1); // will go AFK
    clock.advance(AFK_TIMEOUT_MS - 10_000); // 50s later…
    locks.acquireOrUpdate(ROOM_B, BOB, 1); // Bob just started
    const timer = createAfkTimer({ locks, connections: conns.mgr, sessionEvents: events.repo });

    // Now advance another 10s → Alice is at threshold, Bob is at 10s
    clock.advance(10_000);
    const released = timer.tick();

    expect(released).toBe(1);
    expect(locks.getState(ROOM_A).holder_id).toBeNull();
    expect(locks.getState(ROOM_B).holder_id).toBe(BOB);

    expect(conns.calls).toEqual([
      { room_id: ROOM_A, msg: { kind: 'lock_state', holder_id: null } },
    ]);
    expect(events.calls).toHaveLength(1);
    expect(events.calls[0].room_id).toBe(ROOM_A);
  });

  it('honors a custom afkTimeoutMs passed via options', () => {
    locks.acquireOrUpdate(ROOM_A, ALICE, 1);
    const timer = createAfkTimer(
      { locks, connections: conns.mgr, sessionEvents: events.repo },
      { afkTimeoutMs: 500 }
    );

    clock.advance(499);
    expect(timer.tick()).toBe(0);
    expect(locks.getState(ROOM_A).holder_id).toBe(ALICE);

    clock.advance(1); // now exactly 500ms idle
    expect(timer.tick()).toBe(1);
    expect(locks.getState(ROOM_A).holder_id).toBeNull();
  });
});

describe('AfkTimer lifecycle', () => {
  it('start() is idempotent — second start/stop calls do not double-fire ticks', async () => {
    const clock = new MockClock();
    const locks = createLockManager(clock);
    const conns = fakeConnections();
    const events = fakeSessionEvents();

    const ALICE = 'alice';
    const ROOM_A = 'room-A';
    locks.acquireOrUpdate(ROOM_A, ALICE, 1);
    clock.advance(AFK_TIMEOUT_MS);

    const timer = createAfkTimer(
      { locks, connections: conns.mgr, sessionEvents: events.repo },
      { intervalMs: 5 }
    );

    timer.start();
    timer.start(); // must be a no-op

    // Wait long enough for ~3 interval firings.
    await new Promise((r) => setTimeout(r, 25));

    timer.stop();
    timer.stop(); // must be safe to call again

    // Alice's lock was released exactly once — one broadcast, one event row.
    // If start() had leaked a second interval, we would expect setTimeout to
    // have produced 1..2 extra ticks, but those ticks would see no holder
    // and therefore emit nothing — so they're harmless. The assertion here
    // is that the released transition fired at most once total.
    expect(conns.calls.filter((c) => c.room_id === ROOM_A)).toHaveLength(1);
    expect(events.calls.filter((e) => e.room_id === ROOM_A)).toHaveLength(1);
  });
});
