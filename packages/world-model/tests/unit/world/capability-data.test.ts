/**
 * Data-capability semantics (ADR-129; regression findings P6, 2026-07-02).
 *
 * The three rules:
 *  1. register-once — re-registration never resets data,
 *  2. initialData is DEEP-copied (caller-detached at every nesting depth),
 *  3. registerCapability returns the LIVE stored data object (same object
 *     getCapability returns) — mutating it persists.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';

describe('WorldModel data capabilities (registerCapability semantics)', () => {
  it('returns the live stored data object — mutations persist', () => {
    const world = new WorldModel();

    const data = world.registerCapability('flooding', {
      initialData: { level: 0, isFlooded: false }
    });

    // Mutate the RETURNED object (the correct register-then-mutate pattern)
    data.level = 3;

    // POSTCONDITION: the world's stored data reflects the mutation
    expect(world.getCapability('flooding')?.level).toBe(3);
    expect(world.getCapability('flooding')).toBe(data);
  });

  it('re-registration is a no-op that returns the EXISTING live object', () => {
    const world = new WorldModel();
    const first = world.registerCapability('meta', { initialData: { seen: true } });

    const second = world.registerCapability('meta', { initialData: { seen: false, extra: 1 } });

    // Same live object; data neither reset nor merged
    expect(second).toBe(first);
    expect(world.getCapability('meta')).toEqual({ seen: true });
  });

  it('deep-copies initialData — caller mutations do not leak in at ANY depth', () => {
    const world = new WorldModel();
    const local = { level: 0, nested: { pressure: 1 } };

    world.registerCapability('dam', { initialData: local });

    // The old shallow copy detached top-level fields but SHARED nested
    // objects (Trap A′) — both writes below must now be invisible.
    local.level = 9;
    local.nested.pressure = 9;

    expect(world.getCapability('dam')?.level).toBe(0);
    expect((world.getCapability('dam')?.nested as { pressure: number }).pressure).toBe(1);
  });

  it('applies schema defaults, then initialData overrides', () => {
    const world = new WorldModel();

    const data = world.registerCapability('scored', {
      schema: {
        score: { type: 'number', default: 0 },
        rank: { type: 'string', default: 'Novice' }
      },
      initialData: { score: 10 }
    });

    expect(data.score).toBe(10);
    expect(data.rank).toBe('Novice');
  });

  it('rejects function-valued initialData fields (capability data lands in save blobs)', () => {
    const world = new WorldModel();

    // structuredClone throws on function values — the honest failure for
    // data that could never serialize. (A class instance with only
    // prototype methods clones to a plain data husk instead — losing its
    // methods — which is why runtime services must not be stored here at
    // all; see the dc.ts WeakMap rework.)
    expect(() =>
      world.registerCapability('bad', {
        initialData: { tick: () => { /* runtime callback */ } } as unknown as Record<string, unknown>
      })
    ).toThrow();
  });
});
