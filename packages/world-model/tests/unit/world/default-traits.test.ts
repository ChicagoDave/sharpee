// packages/world-model/tests/unit/world/default-traits.test.ts
//
// ADR-189 acceptance criteria for the entity-type default-trait registry.
// AC-7 (IFEntity.add replace-on-same-type) is covered in
// tests/unit/entities/if-entity.test.ts.

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { EntityType } from '../../../src/entities/entity-types';
import { TraitType } from '../../../src/traits/trait-types';
import { SceneryTrait } from '../../../src/traits/scenery';
import { DEFAULT_TRAITS } from '../../../src/world/default-trait-registry';

describe('ADR-189: entity-type default-trait registry', () => {
  it('AC-1: a SCENERY entity gets a SceneryTrait by construction', () => {
    const world = new WorldModel();
    const rock = world.createEntity('boulder', EntityType.SCENERY);

    expect(rock.has(TraitType.SCENERY)).toBe(true);
    expect(rock.get(TraitType.SCENERY)).toBeInstanceOf(SceneryTrait);
  });

  it('AC-3: an author-added SceneryTrait overwrites the registry default (no duplicate)', () => {
    const world = new WorldModel();
    const rock = world.createEntity('boulder', EntityType.SCENERY);

    const defaultTrait = rock.get(TraitType.SCENERY);
    const custom = new SceneryTrait();
    rock.add(custom);

    // The author's trait wins; there is exactly one scenery trait.
    expect(rock.get(TraitType.SCENERY)).toBe(custom);
    expect(rock.get(TraitType.SCENERY)).not.toBe(defaultTrait);
    expect(rock.getTraits().filter((t) => t.type === TraitType.SCENERY)).toHaveLength(1);
  });

  it('AC-4: { defaultTraits: false } produces a bare SCENERY entity (no SceneryTrait)', () => {
    const world = new WorldModel();
    const rock = world.createEntity('boulder', EntityType.SCENERY, { defaultTraits: false });

    expect(rock.has(TraitType.SCENERY)).toBe(false);
  });

  it('AC-5: two SCENERY entities have distinct SceneryTrait instances', () => {
    const world = new WorldModel();
    const a = world.createEntity('rock a', EntityType.SCENERY);
    const b = world.createEntity('rock b', EntityType.SCENERY);

    expect(a.get(TraitType.SCENERY)).not.toBe(b.get(TraitType.SCENERY));
  });

  it('AC-6: SCENERY is the only mapping; other types get no default scenery trait', () => {
    expect(DEFAULT_TRAITS.size).toBe(1);
    expect(DEFAULT_TRAITS.has(EntityType.SCENERY)).toBe(true);

    const world = new WorldModel();
    const item = world.createEntity('coin', EntityType.ITEM);
    const room = world.createEntity('hall', EntityType.ROOM);

    expect(item.has(TraitType.SCENERY)).toBe(false);
    expect(room.has(TraitType.SCENERY)).toBe(false);
  });
});
