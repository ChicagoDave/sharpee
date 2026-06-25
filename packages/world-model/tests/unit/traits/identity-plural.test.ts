// packages/world-model/tests/unit/traits/identity-plural.test.ts
//
// ADR-190: IdentityTrait carries an optional author plural override, and it must
// survive world save/restore (so a story's irregular plurals persist).

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { TraitType } from '../../../src/traits/trait-types';

describe('IdentityTrait.plural (ADR-190)', () => {
  it('stores an author plural override', () => {
    const world = new WorldModel();
    const goose = world.createEntity('goose', 'item');
    goose.add(new IdentityTrait({ name: 'goose', plural: 'geese' }));

    expect((goose.get(TraitType.IDENTITY) as IdentityTrait).plural).toBe('geese');
  });

  it('round-trips the plural through save/restore', () => {
    const world = new WorldModel();
    const goose = world.createEntity('goose', 'item');
    goose.add(new IdentityTrait({ name: 'goose', plural: 'geese' }));

    const restored = new WorldModel();
    restored.loadJSON(world.toJSON());

    const restoredGoose = restored.getEntity(goose.id)!;
    expect((restoredGoose.get(TraitType.IDENTITY) as IdentityTrait).plural).toBe('geese');
  });
});
