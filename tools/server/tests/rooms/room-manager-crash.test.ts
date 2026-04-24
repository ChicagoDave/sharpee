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
 *
 * Test-double posture (No-Stub-Under-Test, see docs/work/stub-antipattern.md):
 * the inline fake sandbox below drives crash events a real Deno sandbox
 * would never emit on command. Scoped to this file; injected via
 * `createSandboxRegistry(factory)` — not a shared fixture.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Database } from 'better-sqlite3';
import { createRoomManager } from '../../src/rooms/room-manager.js';
import { createSandboxRegistry } from '../../src/sandbox/sandbox-registry.js';
import type { SandboxProcess } from '../../src/sandbox/sandbox-process.js';
import type {
  SandboxToServerMessage,
  ServerToSandboxMessage,
} from '../../src/wire/server-sandbox.js';
import type { RoomsRepository } from '../../src/repositories/rooms.js';
import type { SessionEventsRepository } from '../../src/repositories/session-events.js';
import type { StoryScanner } from '../../src/stories/scanner.js';
import type { ConnectionManager } from '../../src/ws/connection-manager.js';
import type { ServerMsg } from '../../src/wire/browser-server.js';

// room-manager.spawnFor awaits getCompiledBundle before getOrSpawn. These
// unit tests don't exercise a real bundle; short-circuit to a stub path.
vi.mock('../../src/sandbox/story-cache.js', () => ({
  getCompiledBundle: vi.fn(async (sourcePath: string) => `${sourcePath}.bundle`),
}));

const ROOM = 'room-crash';

// ---------- In-file test double ----------

class InlineFakeSandbox extends EventEmitter {
  readonly sent: ServerToSandboxMessage[] = [];

  send(msg: ServerToSandboxMessage): void {
    this.sent.push(msg);
  }

  shutdown(): void {}
  kill(): void {}

  emitReady(): void {
    this.emit('ready', {
      kind: 'READY',
      story_metadata: { title: 'fake-story' },
    });
  }

  emitMessage(msg: SandboxToServerMessage): void {
    this.emit('message', msg);
  }

  emitCrash(info: { exitCode: number | null; signal: null; stderr: string }): void {
    this.emit('crash', info);
  }
}

function createInlineFakeFactory(): {
  factory: (opts: { room_id: string }) => SandboxProcess;
  getFake: (room_id: string) => InlineFakeSandbox | undefined;
} {
  // Keyed by room_id; re-spawns overwrite, matching registry behavior —
  // the second test asserts the factory returns a fresh instance for the
  // same room on a post-crash getOrSpawn.
  const fakes = new Map<string, InlineFakeSandbox>();
  const factory = (opts: { room_id: string }): SandboxProcess => {
    const fake = new InlineFakeSandbox();
    fakes.set(opts.room_id, fake);
    return fake as unknown as SandboxProcess;
  };
  return { factory, getFake: (room_id) => fakes.get(room_id) };
}

// ---------- Collaborator fakes ----------

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

// Yield enough for the mocked `await getCompiledBundle` chain to resolve
// through room-manager's spawnFor before the test drives the fake.
const tick = () => new Promise<void>((r) => setImmediate(r));

async function waitForFake(
  factory: ReturnType<typeof createInlineFakeFactory>,
  room_id: string,
  predicate?: (f: InlineFakeSandbox) => boolean
): Promise<InlineFakeSandbox> {
  for (let i = 0; i < 200; i++) {
    const f = factory.getFake(room_id);
    if (f && (!predicate || predicate(f))) return f;
    await tick();
  }
  throw new Error(`fake sandbox ${room_id} never matched`);
}

describe('room-manager crashAttached guard', () => {
  let conns: ReturnType<typeof fakeConnections>;
  let sandboxFactory: ReturnType<typeof createInlineFakeFactory>;

  beforeEach(() => {
    conns = fakeConnections();
    sandboxFactory = createInlineFakeFactory();
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

    // Wait for the fake to register (past the mocked `await getCompiledBundle`).
    const fake = await waitForFake(sandboxFactory, ROOM);

    // Unblock them past entry.ready; each will send COMMAND and wait for OUTPUT.
    fake.emitReady();
    await tick();

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
    const fake1 = await waitForFake(sandboxFactory, ROOM);
    fake1.emitReady();
    await tick();
    fake1.emitCrash({ exitCode: 1, signal: null, stderr: 'first' });
    await first.catch(() => {});

    // Registry will return a fresh entry on next getOrSpawn because the
    // previous entry.status is now 'crashed'. The fake factory creates a
    // new InlineFakeSandbox for the same room_id on that call — wait until
    // the registered instance is a DIFFERENT reference from fake1.
    const second = mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' });
    const fake2 = await waitForFake(sandboxFactory, ROOM, (f) => f !== fake1);
    expect(fake2).not.toBe(fake1);
    fake2.emitReady();
    await tick();
    fake2.emitCrash({ exitCode: 1, signal: null, stderr: 'second' });
    await second.catch(() => {});

    const crashBroadcasts = conns.calls.filter(
      (c) => c.msg.kind === 'error' && (c.msg as { code: string }).code === 'runtime_crash'
    );
    expect(crashBroadcasts).toHaveLength(2);
  });
});
