/**
 * adr-289-d4-player.test.ts — ADR-289 D4: the player seeds and places
 * through the same path as every other entity.
 *
 * Two halves, both fixed by DELETING special cases rather than adding gates:
 *   seeding — `states[0]` and per-entity counter `starts` reach the player,
 *             which pass 2 never touched because the player is not in `built`;
 *   placement — `in`, `on`, and `starts in` are one placement concept, so
 *             both call sites stop testing the relation and place what the
 *             author wrote. The first-declared-room fallback survives only
 *             for a player with no placement line at all.
 *
 * Acceptance 12, 13. Asserts on WORLD STATE — the chord state value, the
 * counter value, and the actual container the entity sits in.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, ChordStory, createStory } from '../src';

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function compileClean(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')).toEqual([]);
  return result.ir;
}

/** Engine lifecycle order: createPlayer FIRST, then initializeWorld. */
function load(source: string): Loaded {
  const story = createStory(compileClean(source), { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const ROOMS = `create the Hall
  a room

  A hall.

create the Kitchen
  a room

  A kitchen.
`;

const HEADER = 'story\n  title: T\n  authors: N\n  id: t\n  story-version: 0.0.1\n\n';

const locationName = (l: Loaded, id: string) => {
  const room = l.world.getEntity(l.world.getLocation(id)!);
  return room?.name ?? null;
};

describe('D4 seeding — the player is not a second entity model (Acceptance 12)', () => {
  it('a player declared `states: fresh, exhausted` reads `fresh`', () => {
    const l = load(`${HEADER}${ROOMS}
create the player
  in the Hall
  states: fresh, exhausted

  You.
`);
    expect(l.world.getStateValue(CHORD_STATE_PREFIX + 'player')).toBe('fresh');
  });

  it('a player counter reads its `starts` value', () => {
    const l = load(`${HEADER}${ROOMS}
create the player
  in the Hall
  counter stamina starts 7

  You.
`);
    // Per-entity counter key shape (ADR-264 D1/D5), owner-qualified by the
    // IR id — the same key every other entity's counter is seeded under.
    expect(l.world.getStateValue('chord.counter.player.stamina')).toBe(7);
  });

  it('a player with neither states nor counters seeds nothing and still loads', () => {
    const l = load(`${HEADER}${ROOMS}
create the player
  in the Hall

  You.
`);
    expect(l.world.getStateValue(CHORD_STATE_PREFIX + 'player')).toBeUndefined();
  });
});

describe('D4 placement — one placement concept, three spellings (Acceptance 13)', () => {
  it('a player declared `in the Kitchen` starts in the Kitchen, not the first room', () => {
    const l = load(`${HEADER}${ROOMS}
create the player
  in the Kitchen

  You.
`);
    expect(locationName(l, l.player.id)).toBe('Kitchen');
  });

  it('`starts in` still works for the player — the spellings agree', () => {
    const l = load(`${HEADER}${ROOMS}
create the player
  starts in the Kitchen

  You.
`);
    expect(locationName(l, l.player.id)).toBe('Kitchen');
  });

  it('a player with NO placement line falls back to the first declared room', () => {
    const l = load(`${HEADER}${ROOMS}
create the player

  You.
`);
    expect(locationName(l, l.player.id)).toBe('Hall');
  });

  it('an NPC declared `starts in the Kitchen` is IN the Kitchen at load, not unplaced', () => {
    const l = load(`${HEADER}${ROOMS}
create the cook
  starts in the Kitchen

  A cook.

create the player
  in the Hall

  You.
`);
    const cookId = l.story.entityId('cook')!;
    expect(locationName(l, cookId)).toBe('Kitchen');
  });

  it('an NPC declared `in the Kitchen` is unaffected — the relation stopped being consulted', () => {
    const l = load(`${HEADER}${ROOMS}
create the cook
  in the Kitchen

  A cook.

create the player
  in the Hall

  You.
`);
    expect(locationName(l, l.story.entityId('cook')!)).toBe('Kitchen');
  });
});
