/**
 * PullableTrait — a marker (GH #706, as ADR-378 D6a made PushableTrait): the
 * thing says it can be pulled, and its own clause says what a pull does. The
 * trait constructs with no fields and attaches like any trait.
 */

import { describe, it, expect } from 'vitest';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('PullableTrait', () => {
  it('constructs with no fields', () => {
    const trait = new PullableTrait();
    expect(trait.type).toBe(TraitType.PULLABLE);
    expect(PullableTrait.type).toBe(TraitType.PULLABLE);
    expect(Object.keys(trait)).toEqual(['type']);
  });

  it('attaches to an entity and is found by type', () => {
    const world = new WorldModel();
    const rope = world.createEntity('bell rope', 'object');
    const trait = new PullableTrait();
    rope.add(trait);
    expect(rope.hasTrait(TraitType.PULLABLE)).toBe(true);
    expect(rope.getTrait(TraitType.PULLABLE)).toBe(trait);
  });
});
