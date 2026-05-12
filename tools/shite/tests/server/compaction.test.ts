/**
 * @module tests/server/compaction.test
 * @purpose Unit tests for the Phase 4d compaction worker. Behavior
 *   covered: enabled-flag gating, manual `sweepNow`, periodic ticks
 *   via injected scheduler, overlap-skip, error containment, env
 *   parsing.
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — when `enabled: false`, no timer is scheduled; `sweepNow`
 *    still works (manual GC).
 *  - DOES — when `enabled: true`, a tick periodically invokes
 *    `compactRoomSaveBlobs` for every room.
 *  - DOES — a slow in-flight tick suppresses the next overlapping
 *    tick (no concurrent sweeps).
 *  - DOES — per-room errors are reported via `onError` and do not
 *    abort the sweep.
 *  - DOES — `stop()` drains the in-flight tick before resolving.
 *  - REJECTS WHEN — `intervalMs` is non-positive.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  DEFAULT_COMPACTION_INTERVAL_MS,
  parseCompactionEnabled,
  parseCompactionInterval,
  startCompactionWorker,
} from '../../src/server/compaction';

interface Fixture {
  adapter: SqliteAdapter;
  roomIdA: string;
  roomIdB: string;
}

async function seedTwoRooms(): Promise<Fixture> {
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const owner = await adapter.createIdentity({
    handle: 'compaction-owner',
    passcodeHash: 'scrypt$32768$8$1$xxx$yyy',
  });
  const a = await adapter.createRoom({
    storyId: 'fixture',
    bundleVersion: '1.0.0',
    title: 'A',
    public: true,
    createdBy: owner.id,
  });
  const b = await adapter.createRoom({
    storyId: 'fixture',
    bundleVersion: '1.0.0',
    title: 'B',
    public: true,
    createdBy: owner.id,
  });
  for (const roomId of [a.id, b.id]) {
    for (let turn = 1; turn <= 4; turn++) {
      await adapter.appendSaveBlob({
        roomId,
        turn,
        formatVersion: 3,
        bundleVersion: '1.0.0',
        payload: new Uint8Array([turn]),
      });
    }
  }
  return { adapter, roomIdA: a.id, roomIdB: b.id };
}

/**
 * Deterministic scheduler that records the registered handler and
 * exposes a `tick()` method so tests advance the worker without real
 * timers.
 */
function makeFakeScheduler() {
  let handler: (() => void) | null = null;
  let nextToken = 1;
  let interval: number | null = null;
  return {
    api: {
      setInterval(h: () => void, ms: number) {
        handler = h;
        interval = ms;
        return nextToken++;
      },
      clearInterval(_t: number) {
        handler = null;
        interval = null;
      },
    },
    tick(): void {
      if (handler) handler();
    },
    get hasHandler(): boolean {
      return handler !== null;
    },
    get intervalMs(): number | null {
      return interval;
    },
  };
}

describe('startCompactionWorker', () => {
  let fx: Fixture;

  beforeEach(async () => {
    fx = await seedTwoRooms();
  });

  afterEach(async () => {
    await fx.adapter.close();
  });

  it('rejects non-positive intervalMs', () => {
    expect(() =>
      startCompactionWorker({
        adapter: fx.adapter,
        enabled: true,
        intervalMs: 0,
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      startCompactionWorker({
        adapter: fx.adapter,
        enabled: true,
        intervalMs: -100,
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      startCompactionWorker({
        adapter: fx.adapter,
        enabled: true,
        intervalMs: 1.5,
      }),
    ).toThrow(/positive integer/);
  });

  it('does not schedule a timer when enabled is false', async () => {
    const scheduler = makeFakeScheduler();
    const handle = startCompactionWorker({
      adapter: fx.adapter,
      enabled: false,
      intervalMs: 1000,
      scheduler: scheduler.api,
    });
    expect(scheduler.hasHandler).toBe(false);
    expect(handle.running).toBe(false);
    await handle.stop();
  });

  it('sweepNow runs a manual sweep even when disabled', async () => {
    const handle = startCompactionWorker({
      adapter: fx.adapter,
      enabled: false,
      intervalMs: 1000,
    });
    const result = await handle.sweepNow();
    expect(result.rooms).toBe(2);
    expect(result.deleted).toBe(6); // 3 per room (turns 1,2,3 deleted; turn 4 kept as latest)
    expect(await fx.adapter.listSaveBlobTurns(fx.roomIdA)).toEqual([4]);
    expect(await fx.adapter.listSaveBlobTurns(fx.roomIdB)).toEqual([4]);
    await handle.stop();
  });

  it('schedules a recurring tick when enabled, invoking compaction on each fire', async () => {
    const scheduler = makeFakeScheduler();
    const handle = startCompactionWorker({
      adapter: fx.adapter,
      enabled: true,
      intervalMs: 1000,
      scheduler: scheduler.api,
    });
    expect(scheduler.hasHandler).toBe(true);
    expect(scheduler.intervalMs).toBe(1000);
    expect(handle.running).toBe(true);

    // First tick: clears intermediate turns.
    scheduler.tick();
    // Let the in-flight async sweep settle.
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    expect(await fx.adapter.listSaveBlobTurns(fx.roomIdA)).toEqual([4]);
    expect(await fx.adapter.listSaveBlobTurns(fx.roomIdB)).toEqual([4]);

    // Second tick: idempotent, nothing more to delete.
    scheduler.tick();
    await new Promise<void>((r) => setImmediate(r));
    expect(await fx.adapter.listSaveBlobTurns(fx.roomIdA)).toEqual([4]);

    await handle.stop();
    expect(handle.running).toBe(false);
  });

  it('skips overlapping ticks while a sweep is still in flight', async () => {
    const scheduler = makeFakeScheduler();

    // Wrap the adapter with a slow `compactRoomSaveBlobs` so we can
    // observe the overlap-skip without timing flakiness.
    let inFlightConcurrency = 0;
    let observedMaxConcurrency = 0;
    let callCount = 0;
    const realCompact = fx.adapter.compactRoomSaveBlobs.bind(fx.adapter);
    const slowAdapter: typeof fx.adapter = Object.create(fx.adapter);
    (slowAdapter as unknown as { compactRoomSaveBlobs: typeof realCompact }).compactRoomSaveBlobs =
      async (roomId: string) => {
        callCount += 1;
        inFlightConcurrency += 1;
        observedMaxConcurrency = Math.max(observedMaxConcurrency, inFlightConcurrency);
        await new Promise<void>((r) => setTimeout(r, 25));
        try {
          return await realCompact(roomId);
        } finally {
          inFlightConcurrency -= 1;
        }
      };
    (slowAdapter as unknown as { listRooms: SqliteAdapter['listRooms'] }).listRooms =
      fx.adapter.listRooms.bind(fx.adapter);

    const handle = startCompactionWorker({
      adapter: slowAdapter,
      enabled: true,
      intervalMs: 1000,
      scheduler: scheduler.api,
    });

    // Fire three ticks in fast succession. The first starts a slow
    // sweep; the second and third should both be skipped because the
    // first hasn't drained yet.
    scheduler.tick();
    scheduler.tick();
    scheduler.tick();

    // Wait for the in-flight sweep to drain.
    await new Promise<void>((r) => setTimeout(r, 200));

    // First tick swept 2 rooms; second/third were skipped → still 2 calls.
    expect(callCount).toBe(2);
    expect(observedMaxConcurrency).toBeLessThanOrEqual(1);

    await handle.stop();
  });

  it('reports per-room errors via onError without aborting the sweep', async () => {
    const onError = vi.fn();
    const realCompact = fx.adapter.compactRoomSaveBlobs.bind(fx.adapter);
    let calls = 0;
    const errAdapter: typeof fx.adapter = Object.create(fx.adapter);
    (errAdapter as unknown as { compactRoomSaveBlobs: typeof realCompact }).compactRoomSaveBlobs =
      async (roomId: string) => {
        calls += 1;
        if (calls === 1) throw new Error('simulated failure');
        return realCompact(roomId);
      };
    (errAdapter as unknown as { listRooms: SqliteAdapter['listRooms'] }).listRooms =
      fx.adapter.listRooms.bind(fx.adapter);

    const handle = startCompactionWorker({
      adapter: errAdapter,
      enabled: false,
      onError,
    });
    const result = await handle.sweepNow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('simulated failure');
    // Second room succeeded; result counts it as swept.
    expect(result.rooms).toBe(1);
    // Some adapter list-rooms ordering is undefined; at least the
    // healthy room got compacted.
    const turnsA = await fx.adapter.listSaveBlobTurns(fx.roomIdA);
    const turnsB = await fx.adapter.listSaveBlobTurns(fx.roomIdB);
    // Exactly one of the two rooms is still at [1,2,3,4]; the other
    // at [4]. Test doesn't care which.
    expect([turnsA, turnsB]).toContainEqual([4]);
    expect([turnsA, turnsB]).toContainEqual([1, 2, 3, 4]);
    await handle.stop();
  });

  it('stop() drains the in-flight sweep', async () => {
    const scheduler = makeFakeScheduler();
    const realCompact = fx.adapter.compactRoomSaveBlobs.bind(fx.adapter);
    let resolveSweep!: () => void;
    const gate = new Promise<void>((r) => {
      resolveSweep = r;
    });
    const slowAdapter: typeof fx.adapter = Object.create(fx.adapter);
    let observed = false;
    (slowAdapter as unknown as { compactRoomSaveBlobs: typeof realCompact }).compactRoomSaveBlobs =
      async (roomId: string) => {
        await gate;
        observed = true;
        return realCompact(roomId);
      };
    (slowAdapter as unknown as { listRooms: SqliteAdapter['listRooms'] }).listRooms =
      fx.adapter.listRooms.bind(fx.adapter);

    const handle = startCompactionWorker({
      adapter: slowAdapter,
      enabled: true,
      intervalMs: 1000,
      scheduler: scheduler.api,
    });
    scheduler.tick();
    // Begin stop while sweep is suspended.
    const stopPromise = handle.stop();
    // Now let the sweep continue; stop should resolve after it drains.
    resolveSweep();
    await stopPromise;
    expect(observed).toBe(true);
    expect(handle.running).toBe(false);
  });
});

describe('parseCompactionEnabled', () => {
  it('returns false for undefined / empty / falsy strings', () => {
    expect(parseCompactionEnabled(undefined)).toBe(false);
    expect(parseCompactionEnabled('')).toBe(false);
    expect(parseCompactionEnabled('false')).toBe(false);
    expect(parseCompactionEnabled('0')).toBe(false);
    expect(parseCompactionEnabled('no')).toBe(false);
    expect(parseCompactionEnabled('   ')).toBe(false);
  });

  it('returns true for the documented truthy strings', () => {
    expect(parseCompactionEnabled('true')).toBe(true);
    expect(parseCompactionEnabled('TRUE')).toBe(true);
    expect(parseCompactionEnabled('1')).toBe(true);
    expect(parseCompactionEnabled('yes')).toBe(true);
    expect(parseCompactionEnabled(' true ')).toBe(true);
  });
});

describe('parseCompactionInterval', () => {
  it('returns the default when env is unset', () => {
    expect(parseCompactionInterval(undefined)).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
    expect(parseCompactionInterval('')).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
  });

  it('honors a positive-integer env value', () => {
    expect(parseCompactionInterval('60000')).toBe(60000);
    expect(parseCompactionInterval('1')).toBe(1);
  });

  it('falls back and warns for garbage values', () => {
    const warn = vi.fn();
    expect(parseCompactionInterval('-1', warn)).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
    expect(parseCompactionInterval('0', warn)).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
    expect(parseCompactionInterval('not-a-number', warn)).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
    expect(parseCompactionInterval('1.5', warn)).toBe(DEFAULT_COMPACTION_INTERVAL_MS);
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toMatch(/ZIFMIA_COMPACTION_INTERVAL_MS/);
  });
});
