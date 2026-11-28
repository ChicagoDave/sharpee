// packages/world-model/tests/unit/traits/identity-plural.test.ts
//
// ADR-190: IdentityTrait carries an optional author plural override, and it must
// survive world save/restore (so a story's irregular plurals persist).

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { TraitType } from '../../../src/traits/trait-types';
// Installs the registry-backed trait rehydrator, as the package barrel does at
// load, so a restored trait is a live IdentityTrait and its `isPlural` getter
// survives (entities/trait-rehydrator.ts).
import '../../../src/traits/implementations';

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

describe('IdentityTrait.isPlural (ADR-409 D8)', () => {
  it('is true exactly when the name is its plural', () => {
    expect(new IdentityTrait({ name: 'jars', singular: 'jar', plural: 'jars' }).isPlural).toBe(true);
    expect(new IdentityTrait({ name: 'jar', singular: 'jar', plural: 'jars' }).isPlural).toBe(false);
    expect(new IdentityTrait({ name: 'goose', plural: 'geese' }).isPlural).toBe(false);
  });

  it('is false when no plural is set, which is how a TypeScript entity reads as singular', () => {
    expect(new IdentityTrait({ name: 'lamp' }).isPlural).toBe(false);
  });

  it('follows a rename, because it is computed and never stored', () => {
    const trait = new IdentityTrait({ name: 'jar', singular: 'jar', plural: 'jars' });
    trait.name = 'jars';
    expect(trait.isPlural).toBe(true);
  });

  it('holds across save/restore, with the forms and their origin', () => {
    const world = new WorldModel();
    const jars = world.createEntity('jars', 'item');
    jars.add(
      new IdentityTrait({
        name: 'jars',
        singular: 'jar',
        plural: 'jars',
        nameFormOrigin: 'worked-out',
        akaForms: [{ word: 'crocks', form: 'crock' }]
      })
    );

    const restored = new WorldModel();
    restored.loadJSON(world.toJSON());

    const identity = restored.getEntity(jars.id)!.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity.isPlural).toBe(true);
    expect(identity.singular).toBe('jar');
    expect(identity.nameFormOrigin).toBe('worked-out');
    expect(identity.akaForms).toEqual([{ word: 'crocks', form: 'crock' }]);
  });
});
