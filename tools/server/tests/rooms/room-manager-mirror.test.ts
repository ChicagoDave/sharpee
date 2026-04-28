/**
 * room-manager — world-mirror lifecycle (ADR-162) unit tests.
 *
 * Behavior Statement — RoomManager world mirror
 *   DOES:
 *     - On every OUTPUT and RESTORED frame from the room's sandbox,
 *       replaces `worldMirrors[room_id]` with a fresh `WorldModel`
 *       hydrated from `frame.world`.
 *     - On STATUS reply during `requestStatusSnapshot`, hydrates the
 *       mirror with `frame.world` and returns the JSON string.
 *     - `getWorldMirror` returns the held mirror narrowed to its
 *       read-only surface, or null.
 *     - `getWorldSnapshot` re-serializes the held mirror via
 *       `mirror.toJSON()`, or returns null.
 *     - `closeRoom` deletes the held mirror so a future spawn starts fresh.
 *   WHEN: the sandbox emits OUTPUT/RESTORED/STATUS, or a caller invokes
 *         `getWorldMirror`/`getWorldSnapshot`/`requestStatusSnapshot`/
 *         `closeRoom`.
 *   BECAUSE: ADR-162 AC-3 (welcome carries non-stale snapshot via
 *            STATUS_REQUEST round-trip) and AC-4 (server holds a per-room
 *            mirror updated on each turn).
 *   REJECTS WHEN:
 *     - hydration receives malformed JSON or a JSON shape `loadJSON`
 *       rejects → log + retain prior mirror; no error surfaces to the
 *       caller (ADR-162 AC-9).
 *     - STATUS_REQUEST gets no STATUS reply within `statusTimeoutMs` →
 *       returns a rejected promise (caller's responsibility to surface).
 *     - STATUS_REQUEST gets ERROR(phase: 'turn') → returns a rejected
 *       promise carrying the sandbox's detail.
 *
 * Test-double posture: this file uses the same inline-fake-sandbox
 * pattern as room-manager-crash.test.ts. The fakes drive frames a real
 * sandbox could legitimately produce; the production code path under
 * test (mirror hydrate / serialize / clear) runs unstubbed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Database } from 'better-sqlite3';
import { WorldModel } from '@sharpee/world-model';
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

vi.mock('../../src/sandbox/story-cache.js', () => ({
  getCompiledBundle: vi.fn(async (sourcePath: string) => `${sourcePath}.bundle`),
}));

const ROOM = 'room-mirror';

// Build a valid serialized world by round-tripping a freshly-constructed
// WorldModel. Avoids hard-coding the (private) toJSON shape in fixtures.
function makeWorldJson(): string {
  return new WorldModel().toJSON();
}

class InlineFakeSandbox extends EventEmitter {
  readonly sent: ServerToSandboxMessage[] = [];

  send(msg: ServerToSandboxMessage): void {
    this.sent.push(msg);
  }
  shutdown(): void {}
  kill(): void {}
  emitReady(): void {
    this.emit('ready', { kind: 'READY', story_metadata: { title: 'fake-story' } });
  }
  emitMessage(msg: SandboxToServerMessage): void {
    this.emit('message', msg);
  }
}

function createInlineFakeFactory(): {
  factory: (opts: { room_id: string }) => SandboxProcess;
  getFake: (room_id: string) => InlineFakeSandbox | undefined;
} {
  const fakes = new Map<string, InlineFakeSandbox>();
  const factory = (opts: { room_id: string }): SandboxProcess => {
    const fake = new InlineFakeSandbox();
    fakes.set(opts.room_id, fake);
    return fake as unknown as SandboxProcess;
  };
  return { factory, getFake: (room_id) => fakes.get(room_id) };
}

function fakeConnections(): ConnectionManager {
  return {
    broadcast: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    forRoom: () => [],
    closeRoom: vi.fn(),
  } as unknown as ConnectionManager;
}

function fakeRooms(): RoomsRepository {
  return {
    findById: () => ({
      room_id: ROOM,
      join_code: 'CODE',
      story_slug: 'zork',
      primary_host_id: 'ph',
      locked_by: null,
      locked_at: null,
      created_at: '2026-04-27T00:00:00Z',
      last_activity_at: '2026-04-27T00:00:00Z',
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
    findBySlug: () => ({ slug: 'zork', title: 'Zork', version: '1.0.0', path: '/tmp/zork.js' }),
    list: () => [],
  } as unknown as StoryScanner;
}

function fakeDb(): Database {
  return { transaction: (fn: () => void) => () => fn() } as unknown as Database;
}

const tick = () => new Promise<void>((r) => setImmediate(r));

async function waitForFake(
  factory: ReturnType<typeof createInlineFakeFactory>,
  room_id: string,
): Promise<InlineFakeSandbox> {
  for (let i = 0; i < 200; i++) {
    const f = factory.getFake(room_id);
    if (f) return f;
    await tick();
  }
  throw new Error(`fake sandbox ${room_id} never created`);
}

describe('room-manager world mirror (ADR-162)', () => {
  let sandboxFactory: ReturnType<typeof createInlineFakeFactory>;
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sandboxFactory = createInlineFakeFactory();
    consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrSpy.mockRestore();
    vi.clearAllMocks();
  });

  function build() {
    const registry = createSandboxRegistry(sandboxFactory.factory);
    return createRoomManager({
      db: fakeDb(),
      rooms: fakeRooms(),
      sessionEvents: fakeSessionEvents(),
      stories: fakeStories(),
      sandboxes: registry,
      connections: fakeConnections(),
      turnTimeoutMs: 200,
      statusTimeoutMs: 200,
    });
  }

  it('cold start: getWorldMirror and getWorldSnapshot return null', () => {
    const mgr = build();
    expect(mgr.getWorldMirror(ROOM)).toBeNull();
    expect(mgr.getWorldSnapshot(ROOM)).toBeNull();
  });

  it('OUTPUT hydrates the mirror; getWorldMirror exposes a usable WorldModel', async () => {
    const mgr = build();
    // Fire-and-forget submitCommand so spawnFor wires the mirror listener;
    // the turn promise rejects on timeout but the listener stays attached.
    void mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' }).catch(() => {});
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();

    const world_json = makeWorldJson();
    fake.emitMessage({
      kind: 'OUTPUT',
      turn_id: 'tid',
      text_blocks: [],
      events: [],
      world: world_json,
    });
    await tick();

    const mirror = mgr.getWorldMirror(ROOM);
    expect(mirror).not.toBeNull();
    // The hydrated mirror exposes the read-only query surface; calling one
    // of those methods on the held instance must not throw.
    expect(() => mirror!.getAllEntities()).not.toThrow();

    const snap = mgr.getWorldSnapshot(ROOM);
    expect(typeof snap).toBe('string');
    expect(snap!.length).toBeGreaterThan(0);
  });

  it('RESTORED hydrates the mirror just like OUTPUT', async () => {
    const mgr = build();
    void mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' }).catch(() => {});
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();

    fake.emitMessage({
      kind: 'RESTORED',
      save_id: 's-1',
      text_blocks: [],
      world: makeWorldJson(),
    });
    await tick();

    expect(mgr.getWorldMirror(ROOM)).not.toBeNull();
    expect(mgr.getWorldSnapshot(ROOM)).toContain('{');
  });

  it('AC-9: malformed snapshot is logged and discarded; prior mirror retained', async () => {
    const mgr = build();
    void mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' }).catch(() => {});
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();

    // Establish a known-good mirror.
    const goodWorld = makeWorldJson();
    fake.emitMessage({
      kind: 'OUTPUT',
      turn_id: 't1',
      text_blocks: [],
      events: [],
      world: goodWorld,
    });
    await tick();
    const beforeSnap = mgr.getWorldSnapshot(ROOM);
    expect(beforeSnap).not.toBeNull();

    // Drive a malformed OUTPUT.
    fake.emitMessage({
      kind: 'OUTPUT',
      turn_id: 't2',
      text_blocks: [],
      events: [],
      world: 'this is not json {{{',
    });
    await tick();

    // The prior mirror is retained — snapshot unchanged from before the
    // malformed frame; an error was logged.
    const afterSnap = mgr.getWorldSnapshot(ROOM);
    expect(afterSnap).toBe(beforeSnap);
    expect(consoleErrSpy).toHaveBeenCalled();
    const errMsg = consoleErrSpy.mock.calls[0]?.[0] as string;
    expect(errMsg).toMatch(/mirror hydration failed/);
  });

  it('STATUS_REQUEST → STATUS hydrates the mirror and returns the world JSON', async () => {
    const mgr = build();
    const promise = mgr.requestStatusSnapshot(ROOM);

    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();
    await tick();

    // Sandbox should have received exactly one STATUS_REQUEST.
    expect(fake.sent.some((m) => m.kind === 'STATUS_REQUEST')).toBe(true);

    const world_json = makeWorldJson();
    fake.emitMessage({ kind: 'STATUS', world: world_json });

    const result = await promise;
    expect(result).toBe(world_json);
    expect(mgr.getWorldMirror(ROOM)).not.toBeNull();
  });

  it('STATUS_REQUEST rejects on timeout when sandbox does not reply', async () => {
    const mgr = build();
    const promise = mgr.requestStatusSnapshot(ROOM);
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();
    // Intentionally never emit STATUS — let the 200ms timeout fire.
    await expect(promise).rejects.toThrow(/timed out/i);
    expect(mgr.getWorldMirror(ROOM)).toBeNull();
  });

  it('STATUS_REQUEST rejects when sandbox emits ERROR(phase: turn)', async () => {
    const mgr = build();
    const promise = mgr.requestStatusSnapshot(ROOM);
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();
    // Yield so the post-`await entry.ready` Promise body in
    // requestStatusSnapshot runs and the onMessage listener attaches
    // before we drive the ERROR frame.
    await tick();
    fake.emitMessage({
      kind: 'ERROR',
      phase: 'turn',
      detail: 'world.toJSON() failed: simulated',
    });
    await expect(promise).rejects.toThrow(/world.toJSON\(\) failed: simulated/);
  });

  it('closeRoom clears the held mirror', async () => {
    const mgr = build();
    void mgr.submitCommand({ room_id: ROOM, actor_id: 'alice', text: 'look' }).catch(() => {});
    const fake = await waitForFake(sandboxFactory, ROOM);
    fake.emitReady();
    fake.emitMessage({
      kind: 'OUTPUT',
      turn_id: 't1',
      text_blocks: [],
      events: [],
      world: makeWorldJson(),
    });
    await tick();
    expect(mgr.getWorldMirror(ROOM)).not.toBeNull();

    mgr.closeRoom(ROOM);

    expect(mgr.getWorldMirror(ROOM)).toBeNull();
    expect(mgr.getWorldSnapshot(ROOM)).toBeNull();
  });
});
