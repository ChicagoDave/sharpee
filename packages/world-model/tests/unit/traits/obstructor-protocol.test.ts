/**
 * Tests for the generalized obstructor-protocol query helpers (ADR-173
 * Phase 5).
 *
 * Covers ADR-173 acceptance criteria AC-9 (cross-side aggregation:
 * `findTraitsOnObstructors` returns matching traits from both sides) and
 * AC-10 (no contribution: an obstructor without the requested trait
 * returns no entry, and no obstructor present returns no entry).
 *
 * Also pins the ADR's "obstruction lifts when the obstructor moves"
 * semantics — the helpers re-evaluate the obstructor's current location
 * at query time rather than reading a stored flag on the wall.
 *
 * Owner context: `@sharpee/world-model` — wall / spatial primitives.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { WallEntity } from '../../../src/entities/wall-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { TraitType } from '../../../src/traits/trait-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ITrait } from '../../../src/traits/trait';
import {
  getCurrentObstructor,
  findTraitOnObstructor,
  findTraitsOnObstructors,
} from '../../../src/traits/obstructor-protocol';

class FakeAcousticDampenerTrait implements ITrait {
  static readonly type = 'fake.acoustic_dampener';
  readonly type = FakeAcousticDampenerTrait.type;
  constructor(public readonly contribution: number) {}
}

class FakeBreachBlockerTrait implements ITrait {
  static readonly type = 'fake.breach_blocker';
  readonly type = FakeBreachBlockerTrait.type;
}

function makeRoom(world: WorldModel, name: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait());
  return room;
}

function makeObstructor(
  world: WorldModel,
  name: string,
  inRoomId: string,
  traits: ITrait[],
): IFEntity {
  const ent = world.createEntity(name, EntityType.OBJECT);
  for (const trait of traits) ent.add(trait);
  world.moveEntity(ent.id, inRoomId);
  return ent;
}

describe('obstructor-protocol — getCurrentObstructor', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;
  let bookcase: IFEntity;
  let wall: WallEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
    bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeBreachBlockerTrait(),
    ]);

    wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick' },
      },
    });
  });

  it('returns the obstructor when it is in the side`s room', () => {
    expect(getCurrentObstructor(wall, parlor.id, world)).toBe(bookcase);
  });

  it('returns undefined for a side with no obstructedBy declared', () => {
    expect(getCurrentObstructor(wall, library.id, world)).toBeUndefined();
  });

  it('returns undefined when the obstructor has been moved out of the room', () => {
    // Move bookcase out of parlor — obstruction lifts.
    world.moveEntity(bookcase.id, library.id);
    expect(getCurrentObstructor(wall, parlor.id, world)).toBeUndefined();
  });

  it('returns undefined when the obstructor entity is gone from the world', () => {
    world.removeEntity(bookcase.id);
    expect(getCurrentObstructor(wall, parlor.id, world)).toBeUndefined();
  });

  it('returns undefined when called for a room that is not one of the wall`s sides', () => {
    const study = makeRoom(world, 'Study');
    expect(getCurrentObstructor(wall, study.id, world)).toBeUndefined();
  });
});

describe('obstructor-protocol — findTraitOnObstructor', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;
  let bookcase: IFEntity;
  let wall: WallEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
    bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeBreachBlockerTrait(),
      new FakeAcousticDampenerTrait(2),
    ]);

    wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick' },
      },
    });
  });

  it('returns the matching trait when the obstructor carries it', () => {
    const trait = findTraitOnObstructor<FakeAcousticDampenerTrait>(
      wall,
      parlor.id,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(trait).toBeDefined();
    expect(trait?.contribution).toBe(2);
  });

  // AC-10: an obstructor lacking a particular capability-specific trait
  // contributes zero to that capability.
  it('returns undefined when the obstructor lacks the requested trait', () => {
    class FakeVisualConduitTrait implements ITrait {
      static readonly type = 'fake.visual_conduit';
      readonly type = FakeVisualConduitTrait.type;
    }

    const trait = findTraitOnObstructor(
      wall,
      parlor.id,
      FakeVisualConduitTrait.type,
      world,
    );
    expect(trait).toBeUndefined();
  });

  it('returns undefined for a side without an obstructor', () => {
    const trait = findTraitOnObstructor(
      wall,
      library.id,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(trait).toBeUndefined();
  });

  it('returns undefined after the obstructor moves out of the room', () => {
    world.moveEntity(bookcase.id, library.id);
    const trait = findTraitOnObstructor(
      wall,
      parlor.id,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(trait).toBeUndefined();
  });
});

describe('obstructor-protocol — findTraitsOnObstructors (AC-9 cross-side)', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
  });

  // AC-9: returns the sum of contributions from all matching capability-
  // specific traits across both sides for any given capability.
  it('returns one entry per side when both sides have obstructors carrying the trait', () => {
    const bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeAcousticDampenerTrait(2),
    ]);
    const tapestry = makeObstructor(world, 'tapestry', library.id, [
      new FakeAcousticDampenerTrait(3),
    ]);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick', obstructedBy: tapestry.id },
      },
    });

    const matches = findTraitsOnObstructors<FakeAcousticDampenerTrait>(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );

    expect(matches).toHaveLength(2);

    const bySide = new Map(matches.map((m) => [m.side, m]));
    expect(bySide.get(parlor.id)?.obstructor.id).toBe(bookcase.id);
    expect(bySide.get(parlor.id)?.trait.contribution).toBe(2);
    expect(bySide.get(library.id)?.obstructor.id).toBe(tapestry.id);
    expect(bySide.get(library.id)?.trait.contribution).toBe(3);

    // Consumers that need the AC-9 sum compute it directly from `matches`:
    const sum = matches.reduce((acc, m) => acc + m.trait.contribution, 0);
    expect(sum).toBe(5);
  });

  it('returns one entry when only one side has an obstructor carrying the trait', () => {
    const bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeAcousticDampenerTrait(2),
    ]);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    const matches = findTraitsOnObstructors<FakeAcousticDampenerTrait>(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].side).toBe(parlor.id);
    expect(matches[0].trait.contribution).toBe(2);
  });

  // AC-10: zero contribution from an obstructor without the trait — for the
  // cross-side query, that means the side is simply not represented in the
  // result array.
  it('skips a side whose obstructor lacks the requested trait', () => {
    const bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeBreachBlockerTrait(),
    ]);
    const tapestry = makeObstructor(world, 'tapestry', library.id, [
      new FakeAcousticDampenerTrait(3),
    ]);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick', obstructedBy: tapestry.id },
      },
    });

    const matches = findTraitsOnObstructors<FakeAcousticDampenerTrait>(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].side).toBe(library.id);
  });

  it('returns an empty array when neither side has an obstructor', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak' },
        [library.id]: { adjective: 'brick' },
      },
    });

    const matches = findTraitsOnObstructors(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(matches).toEqual([]);
  });

  it('returns an empty array when neither obstructor carries the trait', () => {
    const bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeBreachBlockerTrait(),
    ]);
    const tapestry = makeObstructor(world, 'tapestry', library.id, [
      new FakeBreachBlockerTrait(),
    ]);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick', obstructedBy: tapestry.id },
      },
    });

    const matches = findTraitsOnObstructors(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );
    expect(matches).toEqual([]);
  });

  it('drops obstructors that have moved out of their room (AC-9 honors runtime location)', () => {
    const bookcase = makeObstructor(world, 'bookcase', parlor.id, [
      new FakeAcousticDampenerTrait(2),
    ]);
    const tapestry = makeObstructor(world, 'tapestry', library.id, [
      new FakeAcousticDampenerTrait(3),
    ]);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick', obstructedBy: tapestry.id },
      },
    });

    // Player picks up the tapestry mid-game — its location is no longer
    // the library.
    const player = world.createEntity('yourself', EntityType.ACTOR);
    world.moveEntity(player.id, parlor.id);
    world.moveEntity(tapestry.id, player.id);

    const matches = findTraitsOnObstructors<FakeAcousticDampenerTrait>(
      wall,
      FakeAcousticDampenerTrait.type,
      world,
    );
    // Only the parlor-side bookcase still contributes.
    expect(matches).toHaveLength(1);
    expect(matches[0].side).toBe(parlor.id);
  });
});
