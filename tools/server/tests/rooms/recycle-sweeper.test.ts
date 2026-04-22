/**
 * recycleSweeper unit tests (B-4).
 *
 * Behavior Statement — recycleSweeper
 *   DOES: for each room in rooms.listRecycleCandidates(now, idleDays):
 *           - sandboxes.tearDown(room_id) is called
 *           - rooms.delete(room_id) cascades DB rows
 *           - room_closed{reason:'recycled'} broadcast
 *           - connections.closeRoom(room_id, 4007, 'room_recycled') called
 *   WHEN: automatic interval tick, or a manual sweep() call.
 *   BECAUSE: ADR-153 Decision 12, AC6 — unpinned rooms idle past threshold
 *            are reclaimed; join codes return to the pool via cascade delete.
 *   REJECTS WHEN: sweep re-entered while running → returns 0, no mutation.
 *
 * Threshold semantics are enforced by the repository query (SQL); these
 * tests focus on the sweeper's orchestration — ensuring the repo is asked
 * the right question, and that its results fan out correctly.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecycleSweeper,
  ROOM_RECYCLED_CLOSE_CODE,
  DEFAULT_SWEEP_INTERVAL_MS,
} from '../../src/rooms/recycle-sweeper.js';
import {
  createMockClock,
  type MockClock,
} from '../../src/rooms/ph-grace-timer.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
import type { SandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import type { Room } from '../../src/repositories/types.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

/* ---------- fakes ---------- */

interface BroadcastCall {
  room_id: string;
  msg: ServerMsg;
}

interface CloseRoomCall {
  room_id: string;
  code: number;
  reason: string;
}

function fakeConnections(): {
  mgr: ConnectionManager;
  broadcasts: BroadcastCall[];
  closes: CloseRoomCall[];
} {
  const broadcasts: BroadcastCall[] = [];
  const closes: CloseRoomCall[] = [];
  const mgr: ConnectionManager = {
    register: () => {},
    unregisterParticipant: () => null,
    unregisterSocket: () => null,
    broadcast: (room_id, msg) => {
      broadcasts.push({ room_id, msg });
    },
    send: () => false,
    closeRoom: (room_id, code, reason) => {
      closes.push({ room_id, code, reason });
      return 2;
    },
    getConnectedCount: () => 0,
    getParticipantSocket: () => null,
    getSocketMeta: () => null,
    size: () => 0,
  };
  return { mgr, broadcasts, closes };
}

interface ListCandidatesCall {
  now: string;
  idle_days: number;
}

function fakeRooms(candidatesByCall: Room[][]): {
  repo: RoomsRepository;
  listCalls: ListCandidatesCall[];
  deleteCalls: string[];
} {
  const listCalls: ListCandidatesCall[] = [];
  const deleteCalls: string[] = [];
  let callIdx = 0;
  const repo: RoomsRepository = {
    create: () => {
      throw new Error('not used');
    },
    findById: () => null,
    findByJoinCode: () => null,
    updateLastActivity: () => {},
    setPinned: () => {},
    updatePrimaryHost: () => {},
    delete: (room_id) => {
      deleteCalls.push(room_id);
    },
    listRecycleCandidates: (now, idle_days) => {
      listCalls.push({ now, idle_days });
      const batch = candidatesByCall[callIdx] ?? [];
      callIdx++;
      return batch.map((r) => ({ ...r }));
    },
  };
  return { repo, listCalls, deleteCalls };
}

function fakeSandboxes(): { reg: SandboxRegistry; tearDownCalls: string[] } {
  const tearDownCalls: string[] = [];
  const reg: SandboxRegistry = {
    getOrSpawn: () => {
      throw new Error('not used');
    },
    get: () => null,
    tearDown: (room_id) => {
      tearDownCalls.push(room_id);
    },
    tearDownAll: () => {},
    size: () => 0,
  };
  return { reg, tearDownCalls };
}

function makeRoom(room_id: string, overrides: Partial<Room> = {}): Room {
  return {
    room_id,
    join_code: 'J' + room_id.slice(0, 5).toUpperCase(),
    title: 'Room ' + room_id,
    story_slug: 'zork',
    pinned: false,
    last_activity_at: '2026-04-01T00:00:00.000Z',
    created_at: '2026-03-30T00:00:00.000Z',
    primary_host_id: 'ph-' + room_id,
    ...overrides,
  };
}

/* ---------- tests ---------- */

describe('recycleSweeper', () => {
  const FIXED_NOW = new Date('2026-04-21T12:00:00.000Z');

  let clock: MockClock;
  let conns: ReturnType<typeof fakeConnections>;
  let sandboxes: ReturnType<typeof fakeSandboxes>;

  beforeEach(() => {
    clock = createMockClock(0);
    conns = fakeConnections();
    sandboxes = fakeSandboxes();
  });

  function buildSweeper(rooms: ReturnType<typeof fakeRooms>) {
    return createRecycleSweeper(
      {
        rooms: rooms.repo,
        sandboxes: sandboxes.reg,
        connections: conns.mgr,
        clock,
        now: () => FIXED_NOW,
      },
      { idleRecycleDays: 14 }
    );
  }

  it('sweep: asks rooms repo for candidates using the injected now + idleDays', () => {
    const rooms = fakeRooms([[]]);
    const sweeper = buildSweeper(rooms);

    sweeper.sweep();

    expect(rooms.listCalls).toEqual([
      { now: FIXED_NOW.toISOString(), idle_days: 14 },
    ]);
  });

  it('sweep: for each candidate, tears down sandbox, deletes room, broadcasts room_closed, closes sockets', () => {
    const r1 = makeRoom('r1');
    const r2 = makeRoom('r2');
    const rooms = fakeRooms([[r1, r2]]);
    const sweeper = buildSweeper(rooms);

    const count = sweeper.sweep();

    expect(count).toBe(2);
    expect(sandboxes.tearDownCalls).toEqual(['r1', 'r2']);
    expect(rooms.deleteCalls).toEqual(['r1', 'r2']);
    expect(conns.broadcasts).toEqual([
      { room_id: 'r1', msg: { kind: 'room_closed', reason: 'recycled' } },
      { room_id: 'r2', msg: { kind: 'room_closed', reason: 'recycled' } },
    ]);
    expect(conns.closes).toEqual([
      { room_id: 'r1', code: ROOM_RECYCLED_CLOSE_CODE, reason: 'room_recycled' },
      { room_id: 'r2', code: ROOM_RECYCLED_CLOSE_CODE, reason: 'room_recycled' },
    ]);
  });

  it('sweep: no candidates → no side effects, returns 0', () => {
    const rooms = fakeRooms([[]]);
    const sweeper = buildSweeper(rooms);

    const count = sweeper.sweep();

    expect(count).toBe(0);
    expect(sandboxes.tearDownCalls).toEqual([]);
    expect(rooms.deleteCalls).toEqual([]);
    expect(conns.broadcasts).toEqual([]);
    expect(conns.closes).toEqual([]);
  });

  it('start: schedules first sweep after intervalMs and re-arms on each tick', () => {
    const rooms = fakeRooms([[makeRoom('r1')], [], [makeRoom('r2')]]);
    const sweeper = buildSweeper(rooms);

    sweeper.start();
    expect(rooms.listCalls).toHaveLength(0); // nothing fired yet
    expect(clock.pendingCount()).toBe(1);

    // Tick 1
    clock.advance(DEFAULT_SWEEP_INTERVAL_MS);
    expect(rooms.listCalls).toHaveLength(1);
    expect(rooms.deleteCalls).toEqual(['r1']);

    // Tick 2 (no candidates)
    clock.advance(DEFAULT_SWEEP_INTERVAL_MS);
    expect(rooms.listCalls).toHaveLength(2);
    expect(rooms.deleteCalls).toEqual(['r1']);

    // Tick 3
    clock.advance(DEFAULT_SWEEP_INTERVAL_MS);
    expect(rooms.listCalls).toHaveLength(3);
    expect(rooms.deleteCalls).toEqual(['r1', 'r2']);

    sweeper.stop();
    expect(clock.pendingCount()).toBe(0);
  });

  it('stop: cancels the pending scheduled sweep; no more ticks fire', () => {
    const rooms = fakeRooms([[makeRoom('r1')]]);
    const sweeper = buildSweeper(rooms);

    sweeper.start();
    expect(clock.pendingCount()).toBe(1);

    sweeper.stop();
    expect(clock.pendingCount()).toBe(0);

    clock.advance(DEFAULT_SWEEP_INTERVAL_MS * 3);
    expect(rooms.listCalls).toEqual([]);
    expect(rooms.deleteCalls).toEqual([]);
  });

  it('re-entrant sweep: while one sweep is running, a second sweep() call returns 0 and no-ops', () => {
    // Trigger re-entrance by having the first sweep call into our mock,
    // which in turn calls sweep() again from inside listRecycleCandidates.
    let reentryResult = -1;
    let reentered = false;

    const rooms: RoomsRepository = {
      create: () => {
        throw new Error('not used');
      },
      findById: () => null,
      findByJoinCode: () => null,
      updateLastActivity: () => {},
      setPinned: () => {},
      updatePrimaryHost: () => {},
      delete: () => {},
      listRecycleCandidates: () => {
        if (!reentered) {
          reentered = true;
          // Re-enter mid-sweep (e.g. a rogue timer firing the sweep synchronously)
          reentryResult = sweeper.sweep();
        }
        return [];
      },
    };

    const sweeper = createRecycleSweeper(
      {
        rooms,
        sandboxes: sandboxes.reg,
        connections: conns.mgr,
        clock,
        now: () => FIXED_NOW,
      },
      { idleRecycleDays: 14 }
    );

    sweeper.sweep();

    expect(reentered).toBe(true);
    expect(reentryResult).toBe(0); // re-entrant call bailed
    expect(sweeper.isRunning()).toBe(false); // outer call finished cleanly
  });

  it('start: idempotent — calling start twice does not double-schedule', () => {
    const rooms = fakeRooms([[], []]);
    const sweeper = buildSweeper(rooms);

    sweeper.start();
    sweeper.start();
    expect(clock.pendingCount()).toBe(1);

    clock.advance(DEFAULT_SWEEP_INTERVAL_MS);
    expect(rooms.listCalls).toHaveLength(1);

    sweeper.stop();
  });

  it('teardown + delete + broadcast + close ordering for a candidate', () => {
    const step: string[] = [];
    const r1 = makeRoom('r1');

    const rooms: RoomsRepository = {
      create: () => {
        throw new Error('not used');
      },
      findById: () => null,
      findByJoinCode: () => null,
      updateLastActivity: () => {},
      setPinned: () => {},
      updatePrimaryHost: () => {},
      delete: () => {
        step.push('delete');
      },
      listRecycleCandidates: () => [r1],
    };
    const sandbox: SandboxRegistry = {
      getOrSpawn: () => {
        throw new Error('not used');
      },
      get: () => null,
      tearDown: () => {
        step.push('tearDown');
      },
      tearDownAll: () => {},
      size: () => 0,
    };
    const mgr: ConnectionManager = {
      ...conns.mgr,
      broadcast: () => {
        step.push('broadcast');
      },
      closeRoom: () => {
        step.push('closeRoom');
        return 0;
      },
    };

    const sweeper = createRecycleSweeper(
      {
        rooms,
        sandboxes: sandbox,
        connections: mgr,
        clock,
        now: () => FIXED_NOW,
      },
      { idleRecycleDays: 14 }
    );

    sweeper.sweep();

    expect(step).toEqual(['tearDown', 'delete', 'broadcast', 'closeRoom']);
  });
});
