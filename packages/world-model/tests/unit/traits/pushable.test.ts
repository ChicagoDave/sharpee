/**
 * PushableTrait — a marker (ADR-378 D6a): the thing says it can be pushed,
 * the way says whether a push moves it. The trait constructs with no fields
 * and attaches like any trait.
 */

import { describe, it, expect } from 'vitest';
import { PushableTrait } from '../../../src/traits/pushable/pushableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('PushableTrait', () => {
  it('constructs with no fields', () => {
    const trait = new PushableTrait();
    expect(trait.type).toBe(TraitType.PUSHABLE);
    expect(PushableTrait.type).toBe(TraitType.PUSHABLE);
    expect(Object.keys(trait)).toEqual(['type']);
  });

  it('attaches to an entity and is found by type', () => {
    const world = new WorldModel();
    const trolley = world.createEntity('mail trolley', 'object');
    const trait = new PushableTrait();
    trolley.add(trait);
    expect(trolley.hasTrait(TraitType.PUSHABLE)).toBe(true);
    expect(trolley.getTrait(TraitType.PUSHABLE)).toBe(trait);
  });
});
