/**
 * Stream Independence Tests — AC-3 at the derivation-algorithm level (ADR-293 D3).
 *
 * AC-3: adding a new point leaves every existing point's stream unchanged.
 * Asserted here by recording each existing point's drawn sequence, declaring a new
 * point, re-deriving and re-drawing, and diffing — plus the order-independence
 * property that makes it hold (a stream depends on name + master seed only).
 */

import { describe, it, expect } from 'vitest';
import { definePoint } from '../../src/random/choice-point';
import { deriveStreamSeed } from '../../src/random/seed-derivation';
import { createSeededRandom } from '../../src/random/seeded-random';

const MASTER_SEED = 20260801;

/** Draw a fixed sequence from a point's derived stream, as engine will in Phase 2. */
function recordSequence(pointName: string, draws = 10): number[] {
  const stream = createSeededRandom(deriveStreamSeed(MASTER_SEED, pointName));
  return Array.from({ length: draws }, () => stream.next());
}

describe('AC-3: adding a point leaves every existing point’s stream unchanged', () => {
  it('existing points draw identical sequences before and after a new point is declared', () => {
    const existingNames = [
      'test-independence.thief.steal',
      'test-independence.melee.blow.hero',
      'test-independence.parrot.squawk',
    ];
    existingNames.forEach((name) => definePoint(name, { classes: ['yes', 'no'] }));
    const before = existingNames.map((name) => recordSequence(name));

    definePoint('test-independence.added-later', { classes: ['yes', 'no'] });
    const after = existingNames.map((name) => recordSequence(name));

    expect(after).toEqual(before);
  });

  it('derivation is registration-order independent — the seed exists before any declaration', () => {
    // Derive first, declare afterwards: the derived seed must not change.
    const derivedBeforeDeclaration = deriveStreamSeed(
      MASTER_SEED,
      'test-independence.declared-after-derivation'
    );

    definePoint('test-independence.declared-after-derivation');

    expect(
      deriveStreamSeed(MASTER_SEED, 'test-independence.declared-after-derivation')
    ).toBe(derivedBeforeDeclaration);
  });

  it('distinct points draw distinct sequences from the same master seed', () => {
    const a = recordSequence('test-independence.point-a');
    const b = recordSequence('test-independence.point-b');

    expect(a).not.toEqual(b);
  });
});
