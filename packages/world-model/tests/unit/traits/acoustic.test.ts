/**
 * Tests for acoustic traits — `AcousticTrait` (whole-wall) and
 * `AcousticDampenerTrait` (obstructor) — per ADR-172 Phase 2.
 *
 * Verifies:
 *  - Trait shapes carry the documented data (tier / contribution).
 *  - TraitType identifiers register correctly so `entity.has()` /
 *    `entity.get()` resolve them.
 *  - `AcousticTrait` composes onto a wall entity via `createWall`'s
 *    whole-wall trait slot.
 *  - `AcousticDampenerTrait` composes onto an obstructor entity in a
 *    room; the wall's per-side `obstructedBy` references it; the
 *    obstructor-protocol query helpers from ADR-173 Phase 5 surface
 *    its trait correctly.
 *  - `ACOUSTIC_TIER_COSTS` matches the ADR-172 tier→cost table.
 *
 * Phase 2 ships *trait shapes only*. Propagation logic (Phase 3) lives
 * in `@sharpee/engine` and is tested separately.
 *
 * Owner context: `@sharpee/world-model` — wall / spatial primitives.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { TraitType } from '../../../src/traits/trait-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import {
  AcousticTrait,
  AcousticDampenerTrait,
  ACOUSTIC_TIER_COSTS,
} from '../../../src/traits/acoustic';
import { findTraitOnObstructor } from '../../../src/traits/obstructor-protocol';

function makeRoom(world: WorldModel, name: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait());
  return room;
}

describe('AcousticTrait', () => {
  it('carries the tier as a constructor argument', () => {
    const trait = new AcousticTrait('thick');
    expect(trait.tier).toBe('thick');
  });

  it('exposes the canonical TraitType.ACOUSTIC identifier on instance and class', () => {
    const trait = new AcousticTrait('default');
    expect(trait.type).toBe(TraitType.ACOUSTIC);
    expect(AcousticTrait.type).toBe(TraitType.ACOUSTIC);
    expect(TraitType.ACOUSTIC).toBe('if.trait.acoustic');
  });

  it('declares the whole-wall slot per ADR-173 taxonomy', () => {
    expect(AcousticTrait.slot).toBe('whole-wall');
  });

  it('composes onto a generic IFEntity via add()/get()/has()', () => {
    const world = new WorldModel();
    const ent = world.createEntity('wall-stub', EntityType.OBJECT);
    ent.add(new AcousticTrait('thin'));

    expect(ent.has(TraitType.ACOUSTIC)).toBe(true);
    const trait = ent.get<AcousticTrait>(TraitType.ACOUSTIC);
    expect(trait?.tier).toBe('thin');
  });

  it('attaches to a wall via createWall whole-wall slot and is retrievable', () => {
    const world = new WorldModel();
    const parlor = makeRoom(world, 'Parlor');
    const library = makeRoom(world, 'Library');

    const wall = world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thick')],
      sides: {
        [parlor.id]: { adjective: 'oak' },
        [library.id]: { adjective: 'brick' },
      },
    });

    expect(wall.has(TraitType.ACOUSTIC)).toBe(true);
    const trait = wall.get<AcousticTrait>(TraitType.ACOUSTIC);
    expect(trait?.tier).toBe('thick');
  });
});

describe('ACOUSTIC_TIER_COSTS', () => {
  it('matches the ADR-172 tier→cost table (2 / 4 / 6 / ∞)', () => {
    expect(ACOUSTIC_TIER_COSTS.thin).toBe(2);
    expect(ACOUSTIC_TIER_COSTS.default).toBe(4);
    expect(ACOUSTIC_TIER_COSTS.thick).toBe(6);
    expect(ACOUSTIC_TIER_COSTS.soundproof).toBe(Number.POSITIVE_INFINITY);
  });

  it('orders strictly by tier (thin < default < thick < soundproof)', () => {
    expect(ACOUSTIC_TIER_COSTS.thin).toBeLessThan(ACOUSTIC_TIER_COSTS.default);
    expect(ACOUSTIC_TIER_COSTS.default).toBeLessThan(ACOUSTIC_TIER_COSTS.thick);
    expect(ACOUSTIC_TIER_COSTS.thick).toBeLessThan(ACOUSTIC_TIER_COSTS.soundproof);
  });

  it('is frozen — platform default; stories override via their own table', () => {
    expect(Object.isFrozen(ACOUSTIC_TIER_COSTS)).toBe(true);
  });
});

describe('AcousticDampenerTrait', () => {
  it('carries a positive contribution (dampening — tapestry / foam panel)', () => {
    const trait = new AcousticDampenerTrait(2);
    expect(trait.contribution).toBe(2);
  });

  it('carries a negative contribution (more permeable — peephole / vent)', () => {
    const trait = new AcousticDampenerTrait(-2);
    expect(trait.contribution).toBe(-2);
  });

  it('exposes the canonical TraitType.ACOUSTIC_DAMPENER identifier', () => {
    const trait = new AcousticDampenerTrait(0);
    expect(trait.type).toBe(TraitType.ACOUSTIC_DAMPENER);
    expect(AcousticDampenerTrait.type).toBe(TraitType.ACOUSTIC_DAMPENER);
    expect(TraitType.ACOUSTIC_DAMPENER).toBe('if.trait.acoustic_dampener');
  });

  it('declares the obstructor slot per ADR-173 protocol', () => {
    expect(AcousticDampenerTrait.slot).toBe('obstructor');
  });

  it('composes onto an obstructor entity via add()/get()/has()', () => {
    const world = new WorldModel();
    const tapestry = world.createEntity('tapestry', EntityType.OBJECT);
    tapestry.add(new AcousticDampenerTrait(2));

    expect(tapestry.has(TraitType.ACOUSTIC_DAMPENER)).toBe(true);
    const trait = tapestry.get<AcousticDampenerTrait>(TraitType.ACOUSTIC_DAMPENER);
    expect(trait?.contribution).toBe(2);
  });

  // Composition with the wall + obstructor protocol from ADR-173 Phase 5
  // — this is the integration the propagation algorithm (Phase 3) will
  // consume. We exercise it here so that any breakage in the protocol
  // wiring shows up as a Phase 2 test failure rather than later.
  it('surfaces through findTraitOnObstructor when referenced via wall.obstructedBy', () => {
    const world = new WorldModel();
    const parlor = makeRoom(world, 'Parlor');
    const library = makeRoom(world, 'Library');

    const tapestry = world.createEntity('tapestry', EntityType.OBJECT);
    tapestry.add(new AcousticDampenerTrait(2));
    world.moveEntity(tapestry.id, parlor.id);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: tapestry.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    const trait = findTraitOnObstructor<AcousticDampenerTrait>(
      wall,
      parlor.id,
      TraitType.ACOUSTIC_DAMPENER,
      world,
    );
    expect(trait?.contribution).toBe(2);
  });
});
