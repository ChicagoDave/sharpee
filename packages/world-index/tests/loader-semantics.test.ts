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
  doorStartsLocked,
  initialStateOf,
  isInitialState,
  isPlatformStateWord,
  isStartableStateWord,
  platformStateWordsFor,
  platformTraitForState,
  undirectedExits,
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

create the player
  starts in the Hall
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

create the player
  starts in the Hall

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
