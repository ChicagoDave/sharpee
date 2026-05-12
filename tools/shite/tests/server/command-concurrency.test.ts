/**
 * @module tests/server/command-concurrency.test
 * @purpose Route-level test that `POST /rooms/:id/command` runs
 *   `executeTurnStatelessly` under a bounded worker pool. With pool
 *   capacity = 2 and N > 2 concurrent POSTs against N distinct rooms,
 *   max-in-flight stays at 2 and all N return TurnPackets.
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — caps simultaneous `executeTurnStatelessly` invocations to
 *    `workerPool.capacity` even when many HTTP POSTs arrive at once.
 *  - DOES — every queued request eventually returns its TurnPacket.
 *  - DOES — every successful turn appends a `save_blobs` row (the
 *    queueing wrapper does not swallow the mutation).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { createPool, type WorkerPool } from '../../src/server/worker-pool';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  clearTinyFixtureCacheForTests,
  tinyFixtureConfig,
} from '../fixtures/build-bundle';

interface InstrumentedPool extends WorkerPool {
  readonly maxObservedInFlight: number;
  readonly admitted: number;
}

/**
 * Wrap a real pool so the test can observe the peak `inFlight` value
 * sampled at every `run` entry. The inner pool enforces the cap; the
 * wrapper just records.
 */
function instrumentPool(capacity: number): InstrumentedPool {
  const inner = createPool(capacity);
  let maxObserved = 0;
  let admitted = 0;
  return {
    capacity: inner.capacity,
    get inFlight() {
      return inner.inFlight;
    },
    get queued() {
      return inner.queued;
    },
    get maxObservedInFlight() {
      return maxObserved;
    },
    get admitted() {
      return admitted;
    },
    async run<T>(task: () => Promise<T>): Promise<T> {
      return inner.run(async () => {
        admitted += 1;
        if (inner.inFlight > maxObserved) maxObserved = inner.inFlight;
        return task();
      });
    },
  };
}

interface TestCtx {
  handle: ZifmiaServerHandle;
  baseUrl: string;
  token: string;
  identityId: string;
  pool: InstrumentedPool;
  roomIds: string[];
}

const POOL_CAPACITY = 2;
const ROOM_COUNT = 5;

async function setup(): Promise<TestCtx> {
  clearTinyFixtureCacheForTests();
  const pool = instrumentPool(POOL_CAPACITY);
  const handle = await startServer({
    adapter: new SqliteAdapter({ filename: ':memory:' }),
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-test',
    workerPool: pool,
  });

  const reg = await fetch(`http://127.0.0.1:${handle.port}/identity/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'concurrency-tester', passcode: 'a valid passcode' }),
  });
  const regBody = (await reg.json()) as { id: string; sessionToken: string };

  await handle.adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'TEST-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: regBody.id,
    bundle: await buildTinyFixtureBundle(),
  });

  const roomIds: string[] = [];
  for (let i = 0; i < ROOM_COUNT; i++) {
    const room = await handle.adapter.createRoom({
      storyId: tinyFixtureConfig.id,
      bundleVersion: tinyFixtureConfig.version,
      title: `Concurrency room ${i}`,
      public: true,
      createdBy: regBody.id,
    });
    roomIds.push(room.id);
  }

  return {
    handle,
    baseUrl: `http://127.0.0.1:${handle.port}`,
    token: regBody.sessionToken,
    identityId: regBody.id,
    pool,
    roomIds,
  };
}

async function postCommand(
  ctx: TestCtx,
  roomId: string,
  command: string,
): Promise<Response> {
  return fetch(`${ctx.baseUrl}/rooms/${roomId}/command`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ctx.token}`,
    },
    body: JSON.stringify({ command }),
  });
}

describe('POST /rooms/:id/command under bounded worker pool', () => {
  let ctx: TestCtx;

  beforeEach(async () => {
    ctx = await setup();
  });

  afterEach(async () => {
    await ctx.handle.close();
  });

  it('caps in-flight executions at pool capacity and completes all requests', async () => {
    const responses = await Promise.all(
      ctx.roomIds.map((roomId) => postCommand(ctx, roomId, 'look')),
    );

    // All five POSTs returned 200 with a TurnPacket.
    for (const res of responses) {
      expect(res.status).toBe(200);
      const body = (await res.json()) as { turn: number };
      expect(body.turn).toBeGreaterThanOrEqual(1);
    }

    // Pool admitted every request exactly once.
    expect(ctx.pool.admitted).toBe(ROOM_COUNT);

    // Peak concurrency observed inside the pool never exceeded the cap.
    expect(ctx.pool.maxObservedInFlight).toBeLessThanOrEqual(POOL_CAPACITY);
    expect(ctx.pool.maxObservedInFlight).toBeGreaterThanOrEqual(1);

    // After all requests settle, no leaked slots, no queued waiters.
    expect(ctx.pool.inFlight).toBe(0);
    expect(ctx.pool.queued).toBe(0);

    // Every accepted turn produced a save_blobs row.
    for (const roomId of ctx.roomIds) {
      const turns = await ctx.handle.adapter.listSaveBlobTurns(roomId);
      expect(turns.length).toBe(1);
    }
  });

  it('releases the slot when the underlying turn execution fails', async () => {
    // Hit an unknown room — executor throws RoomNotFoundError mapped to
    // 404. The pool slot must still be released so subsequent requests
    // progress.
    const before = ctx.pool.inFlight;
    const res = await postCommand(ctx, 'no-such-room', 'look');
    expect(res.status).toBe(404);
    expect(ctx.pool.inFlight).toBe(before);
    expect(ctx.pool.queued).toBe(0);

    // A real room should still serve a turn afterwards.
    const ok = await postCommand(ctx, ctx.roomIds[0], 'look');
    expect(ok.status).toBe(200);
  });
});
