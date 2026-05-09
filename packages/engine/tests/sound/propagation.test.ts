/**
 * @file Spatial sound propagation tests (ADR-172 Phase 3).
 *
 * Verifies the propagation function against the ADR's acceptance
 * criteria using real WorldModel topologies (no stubs of the world or
 * the wall obstructor protocol). Each scenario builds rooms, walls,
 * doors, and obstructors via the platform's authoring APIs, emits a
 * sound, and asserts on the resulting AudibilityEvent (or null).
 *
 * Coverage:
 *  - clarityToTier mapping (AC-1: every (volume × cost) → tier).
 *  - Same-room degenerate full audibility.
 *  - Open / closed door costs (AC-2).
 *  - Wall acoustic tiers — thin / default / thick / soundproof (AC-3).
 *  - AcousticDampenerTrait per-side contributions sum across sides.
 *  - Obstructor lift when moved out of room (AC-7).
 *  - Non-acoustic obstructor doesn't affect propagation (AC-8).
 *  - Multi-hop paths (intermediate-room traversal cost).
 *  - wallId set on AudibilityEvent for single-wall paths.
 *  - Listener with no resolvable room → null.
 *  - Isolated rooms (no path) → null (AC-5).
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AcousticDampenerTrait,
  AcousticTrait,
  AuthorModel,
  EntityType,
  IFEntity,
  ITrait,
  ListenerTrait,
  OpenableTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import type { ISound } from '@sharpee/if-domain';

import { propagate, clarityToTier } from '../../src/sound';

class FakeBreachBlockerTrait implements ITrait {
  static readonly type = 'fake.breach_blocker';
  readonly type = FakeBreachBlockerTrait.type;
}

interface ITwoRoomScenario {
  world: WorldModel;
  author: AuthorModel;
  parlor: IFEntity;
  library: IFEntity;
  alderman: IFEntity; // sound source
  listener: IFEntity; // listener entity (default: in library)
}

function makeRoom(author: AuthorModel, displayName: string): IFEntity {
  const room = author.createEntity(displayName, EntityType.ROOM);
  room.add(new RoomTrait());
  return room;
}

function setupTwoRooms(): ITwoRoomScenario {
  const world = new WorldModel();
  const author = new AuthorModel(world.getDataStore(), world);

  const parlor = makeRoom(author, 'Parlor');
  const library = makeRoom(author, 'Library');

  const alderman = author.createEntity('alderman', EntityType.ACTOR);
  author.moveEntity(alderman.id, parlor.id);

  const listener = author.createEntity('listener', EntityType.ACTOR);
  listener.add(new ListenerTrait());
  author.moveEntity(listener.id, library.id);

  return { world, author, parlor, library, alderman, listener };
}

function emit(s: {
  source: IFEntity;
  room: IFEntity;
  volume: ISound['volumeTier'];
  kind?: string;
  content?: ISound['content'];
}): ISound {
  return {
    sourceLocation: s.room.id,
    sourceEntity: s.source.id,
    kind: s.kind ?? 'speech',
    volumeTier: s.volume,
    content: s.content,
  };
}

// =============================================================================
// clarityToTier mapping (AC-1)
// =============================================================================

describe('clarityToTier — clarity → audibility-tier mapping (AC-1)', () => {
  it('maps clarity ≥ 4 to full', () => {
    expect(clarityToTier(4)).toBe('full');
    expect(clarityToTier(5)).toBe('full');
    expect(clarityToTier(99)).toBe('full');
  });

  it('maps clarity 3 to muffled', () => {
    expect(clarityToTier(3)).toBe('muffled');
  });

  it('maps clarity 2 to fragments', () => {
    expect(clarityToTier(2)).toBe('fragments');
  });

  it('maps clarity 1 to presence-only', () => {
    expect(clarityToTier(1)).toBe('presence-only');
  });

  it('maps clarity ≤ 0 to silent', () => {
    expect(clarityToTier(0)).toBe('silent');
    expect(clarityToTier(-1)).toBe('silent');
    expect(clarityToTier(Number.NEGATIVE_INFINITY)).toBe('silent');
  });
});

// =============================================================================
// Same-room degenerate
// =============================================================================

describe('propagate — same-room emission (degenerate full audibility)', () => {
  it('returns full audibility regardless of volume tier', () => {
    const { world, author, parlor, alderman, listener } = setupTwoRooms();
    // Move listener into the parlor so source and listener share a room.
    author.moveEntity(listener.id, parlor.id);

    for (const volume of ['whisper', 'subdued', 'normal', 'raised', 'shouting'] as const) {
      const sound = emit({ source: alderman, room: parlor, volume });
      const result = propagate(sound, listener.id, world, 1);

      expect(result).not.toBeNull();
      expect(result!.audibilityTier).toBe('full');
      expect(result!.sourceRoomId).toBe(parlor.id);
      expect(result!.targetRoomId).toBe(parlor.id);
      expect(result!.wallId).toBeUndefined();
    }
  });

  it('returns full audibility when listener is the sound source itself', () => {
    const { world, parlor, alderman } = setupTwoRooms();
    alderman.add(new ListenerTrait());

    const sound = emit({ source: alderman, room: parlor, volume: 'whisper' });
    const result = propagate(sound, alderman.id, world, 1);

    expect(result?.audibilityTier).toBe('full');
  });
});

// =============================================================================
// Doors (AC-2 covered)
// =============================================================================

describe('propagate — door-mediated propagation', () => {
  function attachDoor(
    author: AuthorModel,
    a: IFEntity,
    b: IFEntity,
    isOpen: boolean,
  ): IFEntity {
    const door = author.createEntity('door', EntityType.DOOR);
    door.add({ type: TraitType.DOOR });
    door.add(new OpenableTrait({ isOpen }));
    author.moveEntity(door.id, a.id);

    const aTrait = a.get<RoomTrait>(TraitType.ROOM)!;
    const bTrait = b.get<RoomTrait>(TraitType.ROOM)!;
    aTrait.exits = { ...aTrait.exits, north: { destination: b.id, via: door.id } };
    bTrait.exits = { ...bTrait.exits, south: { destination: a.id, via: door.id } };
    return door;
  }

  it('open door (cost 1) + normal volume → full audibility (5−1=4)', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    attachDoor(author, parlor, library, true);

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    const result = propagate(sound, listener.id, world, 1);

    expect(result?.audibilityTier).toBe('full');
  });

  it('closed door (cost 4) + raised volume → muffled (7−4=3) — AC-2', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    attachDoor(author, parlor, library, false);

    const sound = emit({
      source: alderman,
      room: parlor,
      volume: 'raised',
      kind: 'speech',
      content: { messageId: 'dungeo.alderman.line-3' },
    });
    const result = propagate(sound, listener.id, world, 42);

    expect(result).not.toBeNull();
    expect(result!.audibilityTier).toBe('muffled');
    expect(result!.content?.messageId).toBe('dungeo.alderman.line-3');
    expect(result!.timestamp).toBe(42);
    expect(result!.wallId).toBeUndefined(); // door, not wall
  });

  it('closed door (cost 4) + whisper (budget 1) → silent (1−4=−3) → null', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    attachDoor(author, parlor, library, false);

    const sound = emit({ source: alderman, room: parlor, volume: 'whisper' });
    expect(propagate(sound, listener.id, world, 1)).toBeNull();
  });
});

// =============================================================================
// Walls (AC-3 covered)
// =============================================================================

describe('propagate — wall-mediated propagation (AC-3)', () => {
  function attachWall(
    world: WorldModel,
    parlor: IFEntity,
    library: IFEntity,
    acoustic?: AcousticTrait,
  ) {
    return world.createWall({
      between: [parlor, library],
      whole: acoustic ? [acoustic] : undefined,
      sides: {
        [parlor.id]: { adjective: 'oak' },
        [library.id]: { adjective: 'brick' },
      },
    });
  }

  it('AcousticTrait("thin") (cost 2) + normal (5) → muffled (clarity 3)', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    attachWall(world, parlor, library, new AcousticTrait('thin'));

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    const result = propagate(sound, listener.id, world, 1);
    expect(result?.audibilityTier).toBe('muffled');
  });

  it('default wall (no AcousticTrait, cost 4) + normal (5) → presence-only (clarity 1)', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    attachWall(world, parlor, library); // no AcousticTrait → defaults to 'default' tier (cost 4)

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    const result = propagate(sound, listener.id, world, 1);
    expect(result?.audibilityTier).toBe('presence-only');
  });

  it('AcousticTrait("thick") (cost 6) + normal (5) → silent → null', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    attachWall(world, parlor, library, new AcousticTrait('thick'));

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)).toBeNull();
  });

  it('AcousticTrait("thick") (cost 6) + shouting (9) → muffled (clarity 3)', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    attachWall(world, parlor, library, new AcousticTrait('thick'));

    const sound = emit({ source: alderman, room: parlor, volume: 'shouting' });
    const result = propagate(sound, listener.id, world, 1);
    expect(result?.audibilityTier).toBe('muffled');
  });

  it('AcousticTrait("soundproof") drops the edge entirely (no path) → null', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    attachWall(world, parlor, library, new AcousticTrait('soundproof'));

    const sound = emit({ source: alderman, room: parlor, volume: 'shouting' });
    expect(propagate(sound, listener.id, world, 1)).toBeNull();
  });

  it('event carries wallId for a single-wall path', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    const wall = attachWall(world, parlor, library, new AcousticTrait('thin'));

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    const result = propagate(sound, listener.id, world, 1);
    expect(result?.wallId).toBe(wall.id);
  });
});

// =============================================================================
// AcousticDampener (AC-7)
// =============================================================================

describe('propagate — acoustic dampener obstructors (AC-7)', () => {
  it('positive dampener raises effective cost — tapestry on thin wall blocks normal speech', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const tapestry = author.createEntity('tapestry', EntityType.OBJECT);
    tapestry.add(new AcousticDampenerTrait(2));
    author.moveEntity(tapestry.id, parlor.id);

    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: tapestry.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    // Effective cost = thin(2) + tapestry(+2) = 4. Normal(5) − 4 = 1 → presence-only.
    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('presence-only');
  });

  it('AC-7 lift: removing the tapestry from the room drops effective cost', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const tapestry = author.createEntity('tapestry', EntityType.OBJECT);
    tapestry.add(new AcousticDampenerTrait(2));
    author.moveEntity(tapestry.id, parlor.id);

    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: tapestry.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });

    // Before: thin(2) + tapestry(+2) = 4 → presence-only
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('presence-only');

    // Player TAKEs the tapestry — it moves out of the parlor into the
    // listener's inventory. The wall's per-side obstructor is no longer
    // located in the parlor; per ADR-173 the contribution lifts at
    // query time.
    author.moveEntity(tapestry.id, listener.id);

    // After lift: thin(2) → muffled (clarity 3).
    expect(propagate(sound, listener.id, world, 2)?.audibilityTier).toBe('muffled');
  });

  it('negative dampener (peephole) lowers effective cost', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const peephole = author.createEntity('peephole', EntityType.OBJECT);
    peephole.add(new AcousticDampenerTrait(-2));
    author.moveEntity(peephole.id, parlor.id);

    world.createWall({
      between: [parlor, library],
      // default wall (cost 4) + peephole (-2) = effective cost 2.
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: peephole.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    // Normal (5) − 2 = 3 → muffled.
    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('muffled');
  });

  it('contributions sum across both sides (AC-9 in ADR-173, AC-7 in ADR-172)', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const tapestry = author.createEntity('tapestry', EntityType.OBJECT);
    tapestry.add(new AcousticDampenerTrait(1));
    author.moveEntity(tapestry.id, parlor.id);

    const foamPanel = author.createEntity('foam-panel', EntityType.OBJECT);
    foamPanel.add(new AcousticDampenerTrait(1));
    author.moveEntity(foamPanel.id, library.id);

    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: tapestry.id },
        [library.id]: { adjective: 'brick', obstructedBy: foamPanel.id },
      },
    });

    // thin(2) + tapestry(+1) + foam(+1) = 4. Normal(5) − 4 = 1 → presence-only.
    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('presence-only');
  });

  it('clamps negative effective cost to 0 — extreme dampener does not amplify', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const hole = author.createEntity('hole', EntityType.OBJECT);
    hole.add(new AcousticDampenerTrait(-10)); // would push base 2 to −8 without clamp
    author.moveEntity(hole.id, parlor.id);

    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: hole.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    // Effective cost clamps to 0. Whisper(1) − 0 = 1 → presence-only.
    const sound = emit({ source: alderman, room: parlor, volume: 'whisper' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('presence-only');
  });
});

// =============================================================================
// Non-acoustic obstructor (AC-8)
// =============================================================================

describe('propagate — non-acoustic obstructors do not affect propagation (AC-8)', () => {
  it('an obstructor with only BreachBlocker (no AcousticDampener) leaves cost untouched', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();

    // Bookcase blocks breach but is acoustically transparent.
    const bookcase = author.createEntity('bookcase', EntityType.OBJECT);
    bookcase.add(new FakeBreachBlockerTrait());
    author.moveEntity(bookcase.id, parlor.id);

    world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak', obstructedBy: bookcase.id },
        [library.id]: { adjective: 'brick' },
      },
    });

    // Same as a no-obstructor thin wall: thin(2). Normal(5) − 2 = 3 → muffled.
    const sound = emit({ source: alderman, room: parlor, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('muffled');
  });
});

// =============================================================================
// Multi-hop paths
// =============================================================================

describe('propagate — multi-hop paths', () => {
  it('A → B → C through two open doors: edge(1) + intermediate(1) + edge(1) = 3', () => {
    const world = new WorldModel();
    const author = new AuthorModel(world.getDataStore(), world);

    const a = makeRoom(author, 'A');
    const b = makeRoom(author, 'B');
    const c = makeRoom(author, 'C');

    function addDoor(from: IFEntity, to: IFEntity, dirA: 'north', dirB: 'south') {
      const door = author.createEntity('door', EntityType.DOOR);
      door.add({ type: TraitType.DOOR });
      door.add(new OpenableTrait({ isOpen: true }));
      author.moveEntity(door.id, from.id);
      from.get<RoomTrait>(TraitType.ROOM)!.exits = {
        ...from.get<RoomTrait>(TraitType.ROOM)!.exits,
        [dirA]: { destination: to.id, via: door.id },
      };
      to.get<RoomTrait>(TraitType.ROOM)!.exits = {
        ...to.get<RoomTrait>(TraitType.ROOM)!.exits,
        [dirB]: { destination: from.id, via: door.id },
      };
    }

    addDoor(a, b, 'north', 'south');
    addDoor(b, c, 'north', 'south');

    const source = author.createEntity('source', EntityType.ACTOR);
    author.moveEntity(source.id, a.id);

    const listener = author.createEntity('listener', EntityType.ACTOR);
    listener.add(new ListenerTrait());
    author.moveEntity(listener.id, c.id);

    // Path cost = edge(1) + traversal(1, for B as intermediate) + edge(1) = 3.
    // Normal(5) − 3 = 2 → fragments.
    const sound = emit({ source, room: a, volume: 'normal' });
    expect(propagate(sound, listener.id, world, 1)?.audibilityTier).toBe('fragments');
  });
});

// =============================================================================
// Rejection / edge cases (AC-5)
// =============================================================================

describe('propagate — rejection cases', () => {
  it('returns null when the listener entity does not exist', () => {
    const { world, alderman, parlor } = setupTwoRooms();
    const sound = emit({ source: alderman, room: parlor, volume: 'shouting' });
    expect(propagate(sound, 'no-such-id', world, 1)).toBeNull();
  });

  it('returns null when the listener is not in any room', () => {
    const { world, author, alderman, parlor } = setupTwoRooms();
    const orphan = author.createEntity('orphan', EntityType.ACTOR);
    // No moveEntity — orphan has no location.

    const sound = emit({ source: alderman, room: parlor, volume: 'shouting' });
    expect(propagate(sound, orphan.id, world, 1)).toBeNull();
  });

  it('returns null when source and listener rooms are not acoustically connected (AC-5)', () => {
    const { world, parlor, library, alderman, listener } = setupTwoRooms();
    // No exits, no walls — rooms are isolated.

    const sound = emit({ source: alderman, room: parlor, volume: 'shouting' });
    expect(propagate(sound, listener.id, world, 1)).toBeNull();
  });
});

// =============================================================================
// Event shape sanity
// =============================================================================

describe('propagate — AudibilityEvent shape', () => {
  it('copies kind, volumeTier, content, and source fields onto the event', () => {
    const { world, author, parlor, library, alderman, listener } = setupTwoRooms();
    const wall = world.createWall({
      between: [parlor, library],
      whole: [new AcousticTrait('thin')],
      sides: {
        [parlor.id]: { adjective: 'oak' },
        [library.id]: { adjective: 'brick' },
      },
    });
    void author; // setup no-op suppression

    const sound: ISound = {
      sourceLocation: parlor.id,
      sourceEntity: alderman.id,
      kind: 'shout',
      volumeTier: 'raised',
      content: { messageId: 'dungeo.line-7', params: { mood: 'angry' } },
    };

    const result = propagate(sound, listener.id, world, 99);

    expect(result).not.toBeNull();
    expect(result!.sourceRoomId).toBe(parlor.id);
    expect(result!.targetRoomId).toBe(library.id);
    expect(result!.wallId).toBe(wall.id);
    expect(result!.sourceEntityId).toBe(alderman.id);
    expect(result!.kind).toBe('shout');
    expect(result!.volumeTier).toBe('raised');
    expect(result!.audibilityTier).not.toBe('silent'); // type-level guarantee
    expect(result!.content).toEqual({ messageId: 'dungeo.line-7', params: { mood: 'angry' } });
    expect(result!.timestamp).toBe(99);
  });
});
