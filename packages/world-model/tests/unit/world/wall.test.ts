/**
 * Tests for the Wall Adjacency Primitive (ADR-173).
 *
 * Covers ADR-173 acceptance criteria AC-1 through AC-4 and AC-8:
 * cardinality / distinctness, adjective presence, per-room adjective
 * uniqueness, reciprocal `walls` references on both rooms, and
 * `obstructedBy` resolution against the world's entity map and
 * spatial index.
 *
 * Owner context: `@sharpee/world-model` — world / spatial primitives.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { WallEntity, IWallSideData } from '../../../src/entities/wall-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { TraitType } from '../../../src/traits/trait-types';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ITrait } from '../../../src/traits/trait';

class FakeAcousticTrait implements ITrait {
  static readonly type = 'fake.acoustic';
  readonly type = FakeAcousticTrait.type;
  constructor(public readonly profile: string) {}
}

function makeRoom(world: WorldModel, name: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait());
  return room;
}

function side(adjective: string, extra: Partial<IWallSideData> = {}): IWallSideData {
  return { adjective, ...extra };
}

describe('WorldModel.createWall — AC-1 cardinality', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;
  let study: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
    study = makeRoom(world, 'Study');
  });

  it('rejects between with zero rooms', () => {
    expect(() =>
      world.createWall({
        // as any: deliberately malformed for rejection test
        between: [] as any,
        sides: {},
      }),
    ).toThrow(/exactly 2 rooms/);
  });

  it('rejects between with one room', () => {
    expect(() =>
      world.createWall({
        // as any: deliberately malformed for rejection test
        between: [parlor] as any,
        sides: {
          [parlor.id]: side('oak'),
        },
      }),
    ).toThrow(/exactly 2 rooms/);
  });

  it('rejects between with three rooms', () => {
    expect(() =>
      world.createWall({
        // as any: deliberately malformed for rejection test
        between: [parlor, library, study] as any,
        sides: {
          [parlor.id]: side('oak'),
          [library.id]: side('brick'),
          [study.id]: side('plaster'),
        },
      }),
    ).toThrow(/exactly 2 rooms/);
  });

  it('rejects self-referential wall (parlor, parlor)', () => {
    expect(() =>
      world.createWall({
        between: [parlor, parlor],
        sides: {
          [parlor.id]: side('oak'),
        },
      }),
    ).toThrow(/two distinct rooms/);
  });

  it('rejects when one of the rooms does not exist', () => {
    expect(() =>
      world.createWall({
        between: [parlor.id, 'r99'],
        sides: {
          [parlor.id]: side('oak'),
          ['r99']: side('brick'),
        },
      }),
    ).toThrow(/room 'r99' does not exist/);
  });

  it('rejects when an entity in `between` is not a room', () => {
    const ball = world.createEntity('ball', EntityType.OBJECT);
    expect(() =>
      world.createWall({
        between: [parlor.id, ball.id],
        sides: {
          [parlor.id]: side('oak'),
          [ball.id]: side('brick'),
        },
      }),
    ).toThrow(/is not a room/);

    // PRECONDITION: parlor's walls collection unchanged after rejection.
    const parlorTrait = parlor.get<RoomTrait>(TraitType.ROOM);
    expect(parlorTrait!.walls).toEqual([]);
  });

  it('does not register a wall entity when validation fails', () => {
    const before = world.getAllEntities().length;
    expect(() =>
      world.createWall({
        between: [parlor, parlor],
        sides: {
          [parlor.id]: side('oak'),
        },
      }),
    ).toThrow();
    expect(world.getAllEntities().length).toBe(before);
  });
});

describe('WorldModel.createWall — AC-2 per-side adjective required', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
  });

  it('rejects when the parlor side is missing entirely', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(new RegExp(`missing per-side data for room '${parlor.id}'`));
  });

  it('rejects when the library side is missing entirely', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side('oak'),
        },
      }),
    ).toThrow(new RegExp(`missing per-side data for room '${library.id}'`));
  });

  it('rejects when adjective is an empty string', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side(''),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(/empty `adjective`/);
  });

  it('rejects when adjective is whitespace only', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side('   '),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(/empty `adjective`/);
  });

  it('rejects when adjective is missing (not a string)', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          // as any: deliberately omitting required adjective for rejection test
          [parlor.id]: {} as any,
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(/missing a string `adjective`/);
  });

  it('does not register a wall entity when adjective validation fails', () => {
    const before = world.getAllEntities().length;
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side(''),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow();
    expect(world.getAllEntities().length).toBe(before);

    // POSTCONDITION: neither room gained a wall reference.
    const parlorTrait = parlor.get<RoomTrait>(TraitType.ROOM);
    const libraryTrait = library.get<RoomTrait>(TraitType.ROOM);
    expect(parlorTrait!.walls).toEqual([]);
    expect(libraryTrait!.walls).toEqual([]);
  });
});

describe('WorldModel.createWall — AC-3 per-room adjective uniqueness', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;
  let study: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
    study = makeRoom(world, 'Study');
  });

  it('rejects when a second wall reuses an adjective in the same room', () => {
    world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    expect(() =>
      world.createWall({
        between: [parlor, study],
        sides: {
          [parlor.id]: side('oak'),
          [study.id]: side('plaster'),
        },
      }),
    ).toThrow(/'oak' is already used by another wall/);

    // POSTCONDITION: parlor still has only the original wall — the
    // collision did not register a second wall reference.
    const parlorTrait = parlor.get<RoomTrait>(TraitType.ROOM);
    expect(parlorTrait!.walls).toHaveLength(1);
  });

  it('allows adjective reuse across different rooms', () => {
    world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    const second = world.createWall({
      between: [library, study],
      sides: {
        // 'oak' is already used in parlor but not in library → allowed
        [library.id]: side('oak'),
        [study.id]: side('plaster'),
      },
    });

    // POSTCONDITION: second wall registered against library and study.
    const libraryTrait = library.get<RoomTrait>(TraitType.ROOM);
    expect(libraryTrait!.walls).toContain(second.id);
  });

  it('allows the same adjective on both sides of a single wall', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('oak'),
      },
    });

    expect(wall.getSide(parlor.id)?.adjective).toBe('oak');
    expect(wall.getSide(library.id)?.adjective).toBe('oak');
  });
});

describe('WorldModel.createWall — AC-4 reciprocal room references', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
  });

  it('adds the wall id to both rooms` walls collections', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    const parlorTrait = parlor.get<RoomTrait>(TraitType.ROOM);
    const libraryTrait = library.get<RoomTrait>(TraitType.ROOM);
    expect(parlorTrait!.walls).toContain(wall.id);
    expect(libraryTrait!.walls).toContain(wall.id);
  });

  it('registers the wall entity retrievable via getEntity', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    const retrieved = world.getEntity(wall.id);
    expect(retrieved).toBeDefined();
    expect(retrieved).toBe(wall);
    expect(retrieved!.type).toBe('wall');
  });

  it('persists per-side data on the wall entity', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak', { description: 'A bookcase covers the wall.' }),
        [library.id]: side('brick', { description: 'Exposed brick.' }),
      },
    });

    expect(wall.getSide(parlor.id)?.adjective).toBe('oak');
    expect(wall.getSide(parlor.id)?.description).toBe('A bookcase covers the wall.');
    expect(wall.getSide(library.id)?.adjective).toBe('brick');
    expect(wall.getSide(library.id)?.description).toBe('Exposed brick.');
  });

  it('persists whole-wall traits on the wall entity', () => {
    const acoustic = new FakeAcousticTrait('thick');
    const wall = world.createWall({
      between: [parlor, library],
      whole: [acoustic],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    expect(wall.has(FakeAcousticTrait.type)).toBe(true);
    const trait = wall.get<FakeAcousticTrait>(FakeAcousticTrait.type);
    expect(trait?.profile).toBe('thick');
  });

  it('records the wall as exactly two distinct room ids in `between`', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    expect(wall.between).toHaveLength(2);
    expect(new Set(wall.between)).toEqual(new Set([parlor.id, library.id]));
  });

  it('otherRoom returns the opposite side correctly', () => {
    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak'),
        [library.id]: side('brick'),
      },
    });

    expect(wall.otherRoom(parlor.id)).toBe(library.id);
    expect(wall.otherRoom(library.id)).toBe(parlor.id);
    expect(wall.otherRoom('not-a-room')).toBeUndefined();
  });
});

describe('WorldModel.createWalls — convenience fan-out', () => {
  let world: WorldModel;
  let hall: IFEntity;
  let parlor: IFEntity;
  let kitchen: IFEntity;
  let dining: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    hall = makeRoom(world, 'Hall');
    parlor = makeRoom(world, 'Parlor');
    kitchen = makeRoom(world, 'Kitchen');
    dining = makeRoom(world, 'Dining');
  });

  it('creates one wall per destination room', () => {
    // The helper calls `sides(roomId)` once per side per pair; the
    // author is responsible for producing per-room-distinct adjectives
    // (per-room uniqueness is enforced by createWall). We track the
    // call sequence to give each wall a distinct adjective on the
    // hall side.
    const adjectivesByRoom: Record<string, string[]> = {
      [hall.id]: ['north-plaster', 'east-plaster', 'south-plaster'],
      [parlor.id]: ['plaster'],
      [kitchen.id]: ['plaster'],
      [dining.id]: ['plaster'],
    };
    const walls = world.createWalls({
      from: hall,
      to: [parlor, kitchen, dining],
      sides: (roomId) => ({
        adjective: adjectivesByRoom[roomId].shift()!,
      }),
    });

    expect(walls).toHaveLength(3);

    const hallTrait = hall.get<RoomTrait>(TraitType.ROOM);
    expect(hallTrait!.walls).toHaveLength(3);
    for (const wall of walls) {
      expect(hallTrait!.walls).toContain(wall.id);
    }
  });

  it('registers each wall on the destination room as well', () => {
    const adjectivesByRoom: Record<string, string[]> = {
      [hall.id]: ['north-plaster', 'east-plaster'],
      [parlor.id]: ['plaster'],
      [kitchen.id]: ['plaster'],
    };
    const walls = world.createWalls({
      from: hall,
      to: [parlor, kitchen],
      sides: (roomId) => ({
        adjective: adjectivesByRoom[roomId].shift()!,
      }),
    });

    const parlorTrait = parlor.get<RoomTrait>(TraitType.ROOM);
    const kitchenTrait = kitchen.get<RoomTrait>(TraitType.ROOM);
    expect(parlorTrait!.walls).toContain(walls[0].id);
    expect(kitchenTrait!.walls).toContain(walls[1].id);
  });

  it('passes the same `from` adjective on each fan-out without colliding (uniqueness is per-room across wall pairs)', () => {
    // Each wall shares the hall side adjective, but per-room
    // uniqueness applies — so the helper would collide if it reused
    // the same adjective for the hall side on every wall. The author
    // is responsible for distinct adjectives on the `from` side; a
    // collision throws.
    expect(() =>
      world.createWalls({
        from: hall,
        to: [parlor, kitchen],
        sides: () => ({ adjective: 'plaster' }),
      }),
    ).toThrow(/'plaster' is already used/);
  });
});

describe('WorldModel.createWall — AC-8 obstructedBy resolution', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let library: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    parlor = makeRoom(world, 'Parlor');
    library = makeRoom(world, 'Library');
  });

  it('rejects when obstructedBy references a nonexistent entity', () => {
    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side('oak', { obstructedBy: 'i99' }),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(/references nonexistent entity 'i99'/);

    // POSTCONDITION: parlor's walls remain empty.
    expect(parlor.get<RoomTrait>(TraitType.ROOM)!.walls).toEqual([]);
  });

  it('rejects when obstructedBy entity is in a different room', () => {
    const bookcase = world.createEntity('bookcase', EntityType.OBJECT);
    world.moveEntity(bookcase.id, library.id);

    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side('oak', { obstructedBy: bookcase.id }),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(new RegExp(`'${bookcase.id}' must be located in room '${parlor.id}'`));
  });

  it('rejects when obstructedBy entity has no location at all', () => {
    const bookcase = world.createEntity('bookcase', EntityType.OBJECT);

    expect(() =>
      world.createWall({
        between: [parlor, library],
        sides: {
          [parlor.id]: side('oak', { obstructedBy: bookcase.id }),
          [library.id]: side('brick'),
        },
      }),
    ).toThrow(new RegExp(`'${bookcase.id}' must be located in room '${parlor.id}'`));
  });

  it('accepts when obstructedBy entity is in the appropriate room', () => {
    const bookcase = world.createEntity('bookcase', EntityType.OBJECT);
    world.moveEntity(bookcase.id, parlor.id);

    const wall = world.createWall({
      between: [parlor, library],
      sides: {
        [parlor.id]: side('oak', { obstructedBy: bookcase.id }),
        [library.id]: side('brick'),
      },
    });

    expect(wall.getSide(parlor.id)?.obstructedBy).toBe(bookcase.id);
    // POSTCONDITION: per-side obstructedBy stored as id, not flag.
    expect(wall.getSide(library.id)?.obstructedBy).toBeUndefined();
  });
});
