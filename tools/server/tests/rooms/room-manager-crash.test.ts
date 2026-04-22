/**
 * room-manager — crashAttached guard unit tests.
 *
 * Behavior Statement — crashAttached guard
 *   DOES:
 *     - Attaches exactly one `once('crash', ...)` listener per sandbox
 *       regardless of how many submitCommand calls target the same room.
 *     - Produces exactly one `runtime_crash` broadcast per crash event.
 *     - Clears the guard on crash so a subsequent respawn re-wires and the
 *       next crash is still observable.
 *   WHEN: multiple submitCommand calls share a single sandbox entry, then
 *         the sandbox emits `crash`.
 *   BECAUSE: SandboxRegistry.getOrSpawn is idempotent per room; attaching a
 *            crash listener on every submitCommand would stack N listeners
 *            and broadcast runtime_crash N times on a single crash.
 *   REJECTS WHEN: n/a — internal invariant.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from 'better-sqlite3';
import { createRoomManager } from '../../src/rooms/room-manager.js';
import { createSandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import { createFakeSandboxFactory } from '../helpers/fake-sandbox.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type { StoryScanner } from '../../src/stories/scanner.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

const ROOM = 'room-crash';

type BroadcastCall = { room_id: string; msg: ServerMsg };

function fakeConnections(): {
  mgr: ConnectionManager;
  calls: BroadcastCall[];
} {
  const calls: BroadcastCall[] = [];
  const mgr: Partial<ConnectionManager> = {
    broadcast(room_id: string, msg: ServerMsg) {
      calls.push({ room_id, msg });
    },
    register: vi.fn(),
    unregister: vi.fn(),
    forRoom: () => [],
    closeRoom: vi.fn(),
  };
  return { mgr: mgr as ConnectionManager, calls };
}

function fakeRooms(): RoomsRepository {
  return {
    findById: (_id: string) => ({
      room_id: ROOM,
      join_code: 'CODE',
      story_slug: 'zork',
      primary_host_id: 'ph',
      locked_by: null,
      locked_at: null,
      created_at: '2026-04-21T00:00:00Z',
      last_activity_at: '2026-04-21T00:00:00Z',
      pinned: 0,
    }),
    updateLastActivity: vi.fn(),
    create: vi.fn(),
    deleteWithCascade: vi.fn(),
    setPinned: vi.fn(),
    listIdleSince: () => [],
    listAll: () => [],
  } as unknown as RoomsRepository;
}

function fakeSessionEvents(): SessionEventsRepository {
  return {
    append: vi.fn(),
    listForRoom: () => [],
    listSince: () => [],
  } as unknown as SessionEventsRepository;
}

function fakeStories(): StoryScanner {
  return {
    findBySlug: (_slug: string) => ({
      slug: 'zork',
      title: 'Zork',
      version: '1.0.0',
      path: '/tmp/zork.js',
    }),
    list: () => [],
  } as unknown as StoryScanner;
}

function fakeDb(): Database {
  // room-manager only uses db.transaction() on the happy output path; the
  // crash path never calls it. Provide a stub so the type is satisfied.
  return {
    transaction: (fn: () => void) => () => fn(),
  } as unknown as Database;
}

describe('room-manager crashAttached guard', () => {
  let conns: ReturnType<typeof fakeConnections>;
  let sandboxFactory: ReturnType<typeof createFakeSandboxFactory>;

  beforeEach(() => {
    conns = fakeConnections();
    sandboxFactory = createFakeSandboxFactory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('three parallel submitCommand calls + one crash → exactly one runtime_crash broadcast', async () => {
    const registry = createSandboxRegistry(sandboxFactory.factory);
    const mgr = createRoomManager({
      db: fakeDb(),
      rooms: fakeRooms(),
      sessionEvents: fakeSessionEvents(),
      stories: fakeStories(),
      sandboxes: registry,
      connections: conns.mgr,
      // Short timeout so the three hung turn promises settle quickly.
      turnTimeoutMs: 50,
    });

    // Kick off three submits in parallel. Each calls spawnFor internally;
    // without the guard, each attaches its own 'crash' listener.
    const p1 = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });
    const p2 = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });
    const p3 = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });

    // Let the three calls reach their `await entry.ready`.
    await Promise.resolve();
    const fake = sandboxFactory.getFake(ROOM)!;
    expect(fake).toBeDefined();

    // Unblock them past entry.ready; each will send COMMAND and wait for OUTPUT.
    fake.emitReady();
    await Promise.resolve();

    // One crash event — should broadcast runtime_crash exactly once.
    fake.emitCrash({ exitCode: 1, signal: null, stderr: 'boom' });

    // Drain turn_failed broadcasts from the three timed-out submits.
    await Promise.allSettled([p1, p2, p3]);

    const crashBroadcasts = conns.calls.filter(
      (c) => c.msg.kind === 'error' && (c.msg as { code: string }).code === 'runtime_crash'
    );
    expect(crashBroadcasts).toHaveLength(1);
    expect(crashBroadcasts[0]!.room_id).toBe(ROOM);
    expect(crashBroadcasts[0]!.msg).toMatchObject({
      kind: 'error',
      code: 'runtime_crash',
    });
  });

  it('crash → respawn → second crash: guard re-arms, two broadcasts total', async () => {
    const registry = createSandboxRegistry(sandboxFactory.factory);
    const mgr = createRoomManager({
      db: fakeDb(),
      rooms: fakeRooms(),
      sessionEvents: fakeSessionEvents(),
      stories: fakeStories(),
      sandboxes: registry,
      connections: conns.mgr,
      turnTimeoutMs: 50,
    });

    // First sandbox, first crash.
    const first = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });
    await Promise.resolve();
    const fake1 = sandboxFactory.getFake(ROOM)!;
    fake1.emitReady();
    await Promise.resolve();
    fake1.emitCrash({ exitCode: 1, signal: null, stderr: 'first' });
    await first.catch(() => {});

    // Registry will return a fresh entry on next getOrSpawn because the
    // previous entry.status is now 'crashed'. The fake factory creates a
    // new FakeSandbox for the same room_id on that call.
    const second = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });
    await Promise.resolve();
    const fake2 = sandboxFactory.getFake(ROOM)!;
    // Sanity: factory returned a brand new fake (different instance) for the respawn.
    expect(fake2).not.toBe(fake1);
    fake2.emitReady();
    await Promise.resolve();
    fake2.emitCrash({ exitCode: 1, signal: null, stderr: 'second' });
    await second.catch(() => {});

    const crashBroadcasts = conns.calls.filter(
      (c) => c.msg.kind === 'error' && (c.msg as { code: string }).code === 'runtime_crash'
    );
    expect(crashBroadcasts).toHaveLength(2);
  });
});
