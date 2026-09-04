/**
 * loader-semantics.test.ts — AC-6: one pin per row of ADR-321 D3's table.
 *
 * Each test establishes its rule against **platform behavior**, never against the
 * source line the ADR cites: the state-vocabulary rules assert on the catalogs
 * `@sharpee/chord` actually exports, and the structural rules compile real Chord
 * source and read the IR the compiler actually emits. A line number drifts silently;
 * these fail loudly.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D3, AC-6
 */

import { describe, expect, it } from 'vitest';
import { compile, PLATFORM_STATE_PAIRS, STARTS_STATE_PAIRINGS } from '@sharpee/chord';
import {
  DirectionOpposites,
  IFEntity,
  RoomTrait,
  SceneryTrait,
  type DirectionType,
} from '@sharpee/world-model';
import {
  doorStartsLocked,
  initialStateOf,
  isPortableByDefault,
  isInitialState,
  isPlatformStateWord,
  isStartableStateWord,
  oppositeDirection,
  platformStateHoldsAtStart,
  platformStateWordsFor,
  platformTraitForState,
  undirectedExits,
  wiredEdges,
} from '../src/loader-semantics.js';
import { isRoom, roomsOf, startRoomOf } from '../src/story.js';

/** Compile Chord source and fail the test loudly if the compiler rejected it. */
function irOf(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(
      `fixture did not compile:\n${result.diagnostics.map((d) => d.message).join('\n')}`,
    );
  }
  return result.ir;
}

const TWO_ROOMS = `story
  title: Pin
  authors:
    Test
  id: pin
  story-version: 1.0.0

create the Hall
  a room
  north to the Study

  A hall.

create the Study
  a room

  A study.

create Alex
  a person
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before

`;

describe('D3 row 1 — states[0] is the implicit initial state', () => {
  it('takes the first declared state, as the compiler orders them', () => {
    const ir = irOf(`${TWO_ROOMS}
create the boiler
  in the Hall
  states: cold, filled, running

  A boiler.
`);
    const boiler = ir.entities.find((e) => e.id === 'boiler');
    expect(boiler?.states).toEqual(['cold', 'filled', 'running']);
    expect(initialStateOf(boiler?.states)).toBe('cold');
    expect(isInitialState(boiler?.states, 'cold')).toBe(true);
    expect(isInitialState(boiler?.states, 'running')).toBe(false);
  });

  it('has no initial state for an empty group', () => {
    expect(initialStateOf([])).toBeUndefined();
    expect(initialStateOf(undefined)).toBeUndefined();
  });
});

describe('D3 row 2 — every exit is mirrored, so adjacency is undirected', () => {
  it('reaches the authored destination from both ends, though only one row was written', () => {
    const ir = irOf(TWO_ROOMS);
    const rooms = roomsOf(ir);
    const ids = new Set(rooms.map((r) => r.id));

    // The author wrote one exit row, Hall -> Study, and no return row.
    const hall = rooms.find((r) => r.id === 'hall');
    expect(hall?.exits?.map((x) => x.direction)).toEqual(['north']);
    expect(rooms.find((r) => r.id === 'study')?.exits ?? []).toHaveLength(0);

    const adjacency = undirectedExits(rooms, (id) => ids.has(id));
    expect([...(adjacency.get('hall') ?? [])]).toEqual(['study']);
    expect([...(adjacency.get('study') ?? [])]).toEqual(['hall']);
  });

  it('drops an exit whose destination is not a room, rather than inventing adjacency', () => {
    const ir = irOf(TWO_ROOMS);
    const rooms = roomsOf(ir);
    const adjacency = undirectedExits(rooms, (id) => id === 'study');
    expect(adjacency.get('hall')?.has('study')).toBe(true);
    expect(adjacency.size).toBe(rooms.filter(isRoom).length);
  });
});

describe('D3 rows 3 and 4 — lockable is a capability; doors alone default to locked', () => {
  // A door must be wired by a `through` exit line — Chord refuses an
  // unconnected door, since its room pair could never resolve.
  const lockables = `story
  title: Pin
  authors:
    Test
  id: pin
  story-version: 1.0.0

create the Hall
  a room
  north to the Study through the front door
  east to the Pantry through the side door

  A hall.

create the Study
  a room

  A study.

create the Pantry
  a room

  A pantry.

create Alex
  a person
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before

create the front door
  a door, lockable

create the side door
  a door, lockable, starts unlocked

create the strongbox
  a container, lockable
  in the Hall

  A strongbox.
`;

  it('starts a bare lockable door locked', () => {
    const ir = irOf(lockables);
    const door = ir.entities.find((e) => e.id === 'front-door');
    expect(door?.startsStates ?? []).toHaveLength(0);
    expect(doorStartsLocked(door!, true)).toBe(true);
  });

  it('lets `starts unlocked` override the door default', () => {
    const ir = irOf(lockables);
    const door = ir.entities.find((e) => e.id === 'side-door');
    expect(door?.startsStates).toContain('unlocked');
    expect(doorStartsLocked(door!, true)).toBe(false);
  });

  it('does not start a non-door lockable locked', () => {
    const ir = irOf(lockables);
    const box = ir.entities.find((e) => e.id === 'strongbox');
    expect(doorStartsLocked(box!, false)).toBe(false);
  });

  it('treats an entity without the lockable trait as never locked', () => {
    const ir = irOf(TWO_ROOMS);
    const hall = ir.entities.find((e) => e.id === 'hall');
    expect(doorStartsLocked(hall!, false)).toBe(false);
  });
});

describe('D3 row 5 — platform trait states are not author states', () => {
  it('binds every pair to the trait the platform says owns it', () => {
    // Asserting against the exported catalog, not a copy: growing it is a
    // grammar change, and this test then covers the new pair for free.
    expect(PLATFORM_STATE_PAIRS.length).toBeGreaterThan(0);
    for (const { pair, trait } of PLATFORM_STATE_PAIRS) {
      for (const word of pair) {
        expect(isPlatformStateWord(word)).toBe(true);
        expect(platformTraitForState(word)).toBe(trait);
      }
    }
  });

  it('leaves an author-declared state word alone', () => {
    const authorWords = ['cold', 'filled', 'running', 'seedling', 'guarded'];
    for (const word of authorWords) {
      expect(isPlatformStateWord(word)).toBe(false);
      expect(platformTraitForState(word)).toBeUndefined();
    }
  });

  it('reports the words an entity answers to because of a composed trait', () => {
    const ir = irOf(`${TWO_ROOMS}
create the lamp
  light-source, switchable
  in the Hall

  A lamp.
`);
    const lamp = ir.entities.find((e) => e.id === 'lamp');
    const words = platformStateWordsFor(lamp!);
    expect(words).toEqual(expect.arrayContaining(['on', 'off', 'lit', 'unlit']));
    expect(words).not.toContain('locked');
  });
});

describe('D3 row 6 — readable is a superset of startable', () => {
  it('makes every startable word readable, and not the reverse', () => {
    for (const word of STARTS_STATE_PAIRINGS.keys()) {
      expect(isStartableStateWord(word)).toBe(true);
      expect(isPlatformStateWord(word)).toBe(true);
    }
    // `lit` is derived from world state, so it is readable but cannot be seeded.
    expect(isPlatformStateWord('lit')).toBe(true);
    expect(isStartableStateWord('lit')).toBe(false);
  });

  it('keeps the two catalogs from silently becoming the same set', () => {
    const readable = new Set(PLATFORM_STATE_PAIRS.flatMap(({ pair }) => [...pair]));
    const startable = new Set(STARTS_STATE_PAIRINGS.keys());
    expect(startable.size).toBeLessThan(readable.size);
    for (const word of startable) expect(readable.has(word)).toBe(true);
  });
});

describe('story loading', () => {
  it('finds the start room from the player placement', () => {
    expect(startRoomOf(irOf(TWO_ROOMS))).toBe('hall');
  });
});

describe('D3 row 2, second half — the mirror runs in the opposite direction', () => {
  it('agrees with the platform on every direction Chord accepts', () => {
    const CHORD_EXIT_DIRECTIONS = [
      'north', 'south', 'east', 'west',
      'northeast', 'northwest', 'southeast', 'southwest',
      'up', 'down',
    ];

    for (const direction of CHORD_EXIT_DIRECTIONS) {
      const platform = DirectionOpposites[direction.toUpperCase() as DirectionType];
      expect(oppositeDirection(direction)?.toUpperCase()).toBe(platform);
    }
  });

  it('has no opposite for a word that is not an exit direction', () => {
    expect(oppositeDirection('sideways')).toBeUndefined();
    expect(oppositeDirection('in')).toBeUndefined();
  });

  it('wires the mirror the compiler never wrote, carrying the door with it', () => {
    const ir = irOf(`${TWO_ROOMS.replace('north to the Study', 'north to the Study through the oak door')}
create the oak door
  a door

  An oak door.
`);
    const rooms = roomsOf(ir);
    const known = new Set(rooms.map((room) => room.id));
    const edges = wiredEdges(rooms, (id) => known.has(id));

    expect(edges).toContainEqual({
      from: 'hall', to: 'study', direction: 'north', via: 'oak-door', authored: true,
    });
    expect(edges).toContainEqual({
      from: 'study', to: 'hall', direction: 'south', via: 'oak-door', authored: false,
    });
  });

  it('yields no edge in either direction for an exit to nowhere', () => {
    const ir = irOf(TWO_ROOMS);
    const rooms = roomsOf(ir);
    const edges = wiredEdges(rooms, (id) => id === 'hall');

    expect(edges).toEqual([]);
  });
});

describe('D3 rows 3 and 4, generalized — a platform state at start of play', () => {
  it('reads a door as locked and every other lockable as unlocked', () => {
    const ir = irOf(`${TWO_ROOMS.replace('north to the Study', 'north to the Study\n  down to the Cellar through the cellar door')}
create the Cellar
  a room

  A cellar.

create the cellar door
  a door
  lockable with the brass key

  A cellar door.

create the strongbox
  in the Hall
  lockable with the brass key

  A strongbox.

create the brass key
  in the Hall

  A small brass key.
`);
    const strongbox = ir.entities.find((e) => e.id === 'strongbox');
    const cellarDoor = ir.entities.find((e) => e.id === 'cellar-door');

    expect(platformStateHoldsAtStart(strongbox!, 'locked', false)).toBe(false);
    expect(platformStateHoldsAtStart(strongbox!, 'unlocked', false)).toBe(true);
    expect(platformStateHoldsAtStart(cellarDoor!, 'locked', true)).toBe(true);
  });

  it('returns undefined when no composed trait owns the word', () => {
    const ir = irOf(`${TWO_ROOMS}
create the boiler
  in the Hall
  states: cold, running

  A boiler.
`);
    const boiler = ir.entities.find((e) => e.id === 'boiler');
    expect(platformStateHoldsAtStart(boiler!, 'on', false)).toBeUndefined();
    expect(platformStateHoldsAtStart(boiler!, 'cold', false)).toBeUndefined();
  });

  it('reads a switchable as off until the story says otherwise', () => {
    const ir = irOf(`${TWO_ROOMS}
create the lamp
  in the Hall
  switchable

  A lamp.

create the heater
  in the Hall
  switchable, starts on

  A heater.
`);
    const lamp = ir.entities.find((e) => e.id === 'lamp');
    const heater = ir.entities.find((e) => e.id === 'heater');

    expect(platformStateHoldsAtStart(lamp!, 'off', false)).toBe(true);
    expect(platformStateHoldsAtStart(lamp!, 'on', false)).toBe(false);
    expect(platformStateHoldsAtStart(heater!, 'on', false)).toBe(true);
    expect(platformStateHoldsAtStart(heater!, 'off', false)).toBe(false);
  });
});

describe('portability is default-on, and scenery is what withdraws it', () => {
  const PORTABILITY = `story
  title: Portability
  authors:
    Test
  id: portability
  story-version: 1.0.0

create the Hall
  a room

  A hall.

create the sherry bottle
  in the Hall

  A dusty bottle.

create the cold range
  scenery
  in the Hall

  A cold iron range.

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
`;

  /** Read one entity out of the fixture, failing loudly if it drifted. */
  function thing(ir: ReturnType<typeof irOf>, id: string) {
    const found = ir.entities.find((entity) => entity.id === id);
    if (found === undefined) throw new Error(`fixture has no entity \`${id}\``);
    return found;
  }

  // AC-6: pinned against what world-model DOES, not against a source line. There
  // is no `takeable` row in the IR to read — the bottle declares nothing at all
  // — so a derivation that hunts for an affordance row calls every plain object
  // inert, which is backwards.
  it('reads the platform default the IR never writes down', () => {
    const ir = irOf(PORTABILITY);
    expect(thing(ir, 'sherry-bottle').traits).toHaveLength(0);

    expect(isPortableByDefault(thing(ir, 'sherry-bottle'), false)).toBe(true);
    expect(isPortableByDefault(thing(ir, 'cold-range'), false)).toBe(false);
  });

  it('agrees with IFEntity.isTakeable, quirks included', () => {
    const plain = new IFEntity('plain', 'thing');
    expect(plain.isTakeable).toBe(true);

    const scenery = new IFEntity('scenery', 'thing');
    scenery.add(new SceneryTrait());
    expect(scenery.isTakeable).toBe(false);

    const room = new IFEntity('room', 'room');
    room.add(new RoomTrait());
    expect(room.isTakeable).toBe(false);

    const ir = irOf(PORTABILITY);
    expect(isPortableByDefault(thing(ir, 'sherry-bottle'), false)).toBe(plain.isTakeable);
    expect(isPortableByDefault(thing(ir, 'cold-range'), false)).toBe(scenery.isTakeable);
    expect(isPortableByDefault(thing(ir, 'hall'), true)).toBe(room.isTakeable);
  });
});
