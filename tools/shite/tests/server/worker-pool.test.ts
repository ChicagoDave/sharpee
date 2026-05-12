/**
 * @module tests/server/worker-pool.test
 * @purpose Unit tests for `WorkerPool`: bounded concurrency, FIFO
 *   queue, slot release on throw, env parsing.
 * @owner Zifmia server tests.
 *
 * Behavior Statement (rule 12):
 *  - DOES — caps simultaneous `task()` invocations at `capacity`.
 *  - DOES — releases the slot when `task` settles (resolve or reject).
 *  - DOES — runs queued tasks in FIFO order.
 *  - DOES — `parseWorkerCount` returns the positive-integer env value
 *    when valid; otherwise falls back to `max(1, cpus - 1)` and warns.
 *  - REJECTS WHEN — `createPool(n)` with non-positive-int `n` throws.
 */

import { describe, expect, it, vi } from 'vitest';

import { createPool, parseWorkerCount } from '../../src/server/worker-pool';

/** Returns `{ promise, resolve }` for deterministic task control. */
function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Yield to the microtask queue so awaits inside `run` progress. */
async function tick(times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('createPool', () => {
  it('rejects non-positive-integer capacity', () => {
    expect(() => createPool(0)).toThrow(/positive integer/);
    expect(() => createPool(-1)).toThrow(/positive integer/);
    expect(() => createPool(1.5)).toThrow(/positive integer/);
    expect(() => createPool(Number.NaN)).toThrow(/positive integer/);
  });

  it('returns task result and releases slot afterwards', async () => {
    const pool = createPool(1);
    const result = await pool.run(async () => 42);
    expect(result).toBe(42);
    expect(pool.inFlight).toBe(0);
    expect(pool.queued).toBe(0);
  });

  it('caps inFlight at capacity', async () => {
    const pool = createPool(2);
    const g1 = deferred();
    const g2 = deferred();
    const g3 = deferred();

    const p1 = pool.run(() => g1.promise);
    const p2 = pool.run(() => g2.promise);
    const p3 = pool.run(() => g3.promise);
    await tick(2);

    expect(pool.inFlight).toBe(2);
    expect(pool.queued).toBe(1);

    g1.resolve(undefined);
    await p1;
    await tick(2);

    // Slot freed by p1; p3 takes it.
    expect(pool.inFlight).toBe(2);
    expect(pool.queued).toBe(0);

    g2.resolve(undefined);
    g3.resolve(undefined);
    await Promise.all([p2, p3]);
    expect(pool.inFlight).toBe(0);
  });

  it('admits waiters in FIFO order', async () => {
    const pool = createPool(1);
    const head = deferred();
    const order: number[] = [];

    const headPromise = pool.run(async () => {
      order.push(0);
      await head.promise;
    });
    const p1 = pool.run(async () => {
      order.push(1);
    });
    const p2 = pool.run(async () => {
      order.push(2);
    });
    const p3 = pool.run(async () => {
      order.push(3);
    });
    await tick(2);
    expect(pool.queued).toBe(3);

    head.resolve(undefined);
    await Promise.all([headPromise, p1, p2, p3]);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it('releases slot when task throws and next waiter runs', async () => {
    const pool = createPool(1);
    const g1 = deferred();

    const p1 = pool.run(async () => {
      await g1.promise;
      throw new Error('boom');
    });
    const p2 = pool.run(async () => 'after');
    await tick(2);

    expect(pool.inFlight).toBe(1);
    expect(pool.queued).toBe(1);

    g1.reject(new Error('boom'));
    await expect(p1).rejects.toThrow('boom');
    await expect(p2).resolves.toBe('after');
    expect(pool.inFlight).toBe(0);
    expect(pool.queued).toBe(0);
  });

  it('inFlight at task entry never exceeds capacity', async () => {
    const pool = createPool(3);
    const gates = [deferred(), deferred(), deferred(), deferred(), deferred()];
    const observedInFlight: number[] = [];

    const promises = gates.map((g) =>
      pool.run(async () => {
        observedInFlight.push(pool.inFlight);
        await g.promise;
      }),
    );
    await tick(4);

    // First three admitted concurrently (inFlight increments are
    // synchronous on the fast path; each first-admit sees the post-
    // increment value of the burst, which is the steady-state 3).
    expect(pool.inFlight).toBe(3);
    expect(observedInFlight.length).toBe(3);
    for (const v of observedInFlight) expect(v).toBeLessThanOrEqual(3);

    gates[0].resolve(undefined);
    await tick(6);
    // Slot freed → 4th admitted; cap preserved.
    expect(observedInFlight.length).toBe(4);
    expect(observedInFlight[3]).toBeLessThanOrEqual(3);
    expect(pool.inFlight).toBeLessThanOrEqual(3);

    gates[1].resolve(undefined);
    await tick(6);
    expect(observedInFlight.length).toBe(5);
    expect(observedInFlight[4]).toBeLessThanOrEqual(3);

    gates[2].resolve(undefined);
    gates[3].resolve(undefined);
    gates[4].resolve(undefined);
    await Promise.all(promises);
    expect(pool.inFlight).toBe(0);
    expect(pool.queued).toBe(0);
  });
});

describe('parseWorkerCount', () => {
  it('returns max(1, cpus - 1) when env is unset', () => {
    expect(parseWorkerCount({ envValue: undefined, cpus: 8 })).toBe(7);
    expect(parseWorkerCount({ envValue: '', cpus: 4 })).toBe(3);
    expect(parseWorkerCount({ envValue: '   ', cpus: 4 })).toBe(3);
  });

  it('floors fallback at 1 for single-cpu machines', () => {
    expect(parseWorkerCount({ envValue: undefined, cpus: 1 })).toBe(1);
    expect(parseWorkerCount({ envValue: undefined, cpus: 0 })).toBe(1);
  });

  it('honors a positive-integer env value', () => {
    expect(parseWorkerCount({ envValue: '1', cpus: 8 })).toBe(1);
    expect(parseWorkerCount({ envValue: '16', cpus: 4 })).toBe(16);
  });

  it('falls back to default on invalid env values and warns once', () => {
    const warn = vi.fn();
    expect(parseWorkerCount({ envValue: '0', cpus: 8, warn })).toBe(7);
    expect(parseWorkerCount({ envValue: '-3', cpus: 8, warn })).toBe(7);
    expect(parseWorkerCount({ envValue: '2.5', cpus: 8, warn })).toBe(7);
    expect(parseWorkerCount({ envValue: 'eight', cpus: 8, warn })).toBe(7);
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toMatch(/ZIFMIA_WORKER_COUNT/);
  });

  it('does not warn for unset env', () => {
    const warn = vi.fn();
    parseWorkerCount({ envValue: undefined, cpus: 4, warn });
    parseWorkerCount({ envValue: '', cpus: 4, warn });
    expect(warn).not.toHaveBeenCalled();
  });
});
