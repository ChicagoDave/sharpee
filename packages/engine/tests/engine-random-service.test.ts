/**
 * EngineRandomService tests (ADR-293 D3, D7, D8 — Phase A/2).
 *
 * Derived from the Behavior Statement: draws land on the named point's own
 * stream (derivation per D3), resolve guards its class contract (D8), and
 * serialize/restore round-trips stream state per point (D7). The catalog is
 * process-global, so point names here are unique to this file.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  definePoint,
  createSeededRandom,
  deriveStreamSeed
} from '@sharpee/core';
import { EngineRandomService } from '../src/engine-random-service';

const MASTER_SEED = 424242;

const yesNo = { classes: ['yes', 'no'] as const };

describe('EngineRandomService draws (D3)', () => {
  it('draws each point on its own stream, derived from (masterSeed, name)', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.derivation', yesNo);

    // Same sequence as a hand-derived stream for that name — and drawing on
    // another point in between must not perturb it (per-point isolation).
    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-engine-random.derivation')
    );
    const other = definePoint('test-engine-random.other');

    const first = service.int(point, 0, 1000000);
    service.int(other, 0, 1000000); // interleaved draw on a different point
    const second = service.int(point, 0, 1000000);

    expect(first).toBe(reference.int(0, 1000000));
    expect(second).toBe(reference.int(0, 1000000));
  });

  it('caches the stream: successive draws continue one sequence, not restart it', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.continuation');

    const draws = [
      service.int(point, 0, 1000000),
      service.int(point, 0, 1000000)
    ];

    expect(draws[0]).not.toBe(draws[1]); // astronomically unlikely to collide if continuing
    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-engine-random.continuation')
    );
    expect(draws).toEqual([reference.int(0, 1000000), reference.int(0, 1000000)]);
  });

  it('pick draws one element from the point stream and does not mutate the input', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.pick');
    const items = ['a', 'b', 'c'] as const;

    const picked = service.pick(point, items, (t) => t);

    expect(items).toContain(picked);
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

describe('EngineRandomService.resolve (D8)', () => {
  const BLOW_CLASSES = ['MISSED', 'LIGHT_WOUND', 'KILLED'] as const;

  it('runs sample against the point’s own stream and returns its classed outcome', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.blow', { classes: BLOW_CLASSES });

    // Two internal draws inside one resolve — the multi-draw shape
    // (weaponBehavior's damage roll + crit check) that forces resolve()
    // into Phase A.
    const outcome = service.resolve(
      point,
      (draw) => ({
        cls: 'LIGHT_WOUND' as const,
        value: { damage: draw.int(1, 10), critical: draw.chance(0.1) }
      }),
      () => ({ damage: 1, critical: false })
    );

    const reference = createSeededRandom(
      deriveStreamSeed(MASTER_SEED, 'test-engine-random.blow')
    );
    expect(outcome.cls).toBe('LIGHT_WOUND');
    expect(outcome.value).toEqual({
      damage: reference.int(1, 10),
      critical: reference.chance(0.1)
    });

    // Both internal draws consumed from the point's stream: the next draw
    // continues after them.
    expect(service.int(point, 0, 1000000)).toBe(reference.int(0, 1000000));
  });

  it('never calls materialize while forcing is a pass-through', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.materialize-unused', {
      classes: BLOW_CLASSES
    });
    const materialize = vi.fn(() => 0);

    service.resolve(point, () => ({ cls: 'MISSED' as const, value: 0 }), materialize);

    expect(materialize).not.toHaveBeenCalled();
  });

  it('rejects resolve on a plain draw (no classes)', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const plain = definePoint('test-engine-random.plain');

    expect(() =>
      service.resolve(plain, () => ({ cls: 'anything', value: 0 }), () => 0)
    ).toThrow(/declares no outcome classes/);
  });

  it('rejects a sampled class the point does not declare', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const point = definePoint('test-engine-random.undeclared', {
      classes: BLOW_CLASSES
    });

    expect(() =>
      service.resolve(
        point,
        () => ({ cls: 'STAGGER' as unknown as (typeof BLOW_CLASSES)[number], value: 0 }),
        () => 0
      )
    ).toThrow(/undeclared class 'STAGGER'/);
  });
});

describe('EngineRandomService persistence (D7)', () => {
  it('serialize → restore continues every drawn point exactly where it left off', () => {
    const pointA = definePoint('test-engine-random.persist-a', yesNo);
    const pointB = definePoint('test-engine-random.persist-b');

    // Unbroken run for comparison.
    const unbroken = new EngineRandomService(MASTER_SEED);
    const expected = [
      unbroken.int(pointA, 0, 1000000),
      unbroken.int(pointB, 0, 1000000),
      unbroken.int(pointA, 0, 1000000),
      unbroken.int(pointB, 0, 1000000)
    ];

    // Interrupted run: draw, serialize, restore into a FRESH service, continue.
    const before = new EngineRandomService(MASTER_SEED);
    const firstHalf = [
      before.int(pointA, 0, 1000000),
      before.int(pointB, 0, 1000000)
    ];
    const saved = before.serializeStreamStates();

    const after = new EngineRandomService(MASTER_SEED);
    after.restoreStreamStates(saved);
    const secondHalf = [
      after.int(pointA, 0, 1000000),
      after.int(pointB, 0, 1000000)
    ];

    expect([...firstHalf, ...secondHalf]).toEqual(expected);
  });

  it('serializes only points that have drawn', () => {
    const service = new EngineRandomService(MASTER_SEED);
    const drawn = definePoint('test-engine-random.only-drawn');
    definePoint('test-engine-random.never-drawn');

    service.int(drawn, 0, 100);

    const states = service.serializeStreamStates();
    expect(Object.keys(states)).toEqual(['test-engine-random.only-drawn']);
  });

  it('keeps restored-but-not-redrawn states across a subsequent save', () => {
    const service = new EngineRandomService(MASTER_SEED);
    service.restoreStreamStates({ 'test-engine-random.dormant': 987654 });

    // Save again without drawing on the dormant point: its state must survive.
    expect(service.serializeStreamStates()).toEqual({
      'test-engine-random.dormant': 987654
    });
  });

  it('reseeds points absent from the restored map by derivation, never the clock', () => {
    const point = definePoint('test-engine-random.absent-from-save');

    const service = new EngineRandomService(MASTER_SEED);
    service.restoreStreamStates({ 'test-engine-random.some-other-point': 1 });

    // Identical to a fresh derivation from the master seed — no clock involved.
    expect(service.int(point, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, 'test-engine-random.absent-from-save')
      ).int(0, 1000000)
    );
  });

  it('restore replaces prior stream state wholesale', () => {
    const point = definePoint('test-engine-random.replace-wholesale');
    const service = new EngineRandomService(MASTER_SEED);

    service.int(point, 0, 1000000); // advance the live stream
    service.restoreStreamStates({}); // restore an empty map

    // The point starts over from derivation — its advanced state was replaced.
    expect(service.int(point, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(MASTER_SEED, 'test-engine-random.replace-wholesale')
      ).int(0, 1000000)
    );
  });
});
