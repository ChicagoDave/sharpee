/**
 * adr-289-d10-runtime.test.ts — ADR-289 D10, the runtime half of
 * Acceptance 17.
 *
 * D10 widened only the ANALYZER's closure: a top-level open condition's `it`
 * validates against the union of every trait- and entity-declared state
 * instead of the empty set. Nothing downstream changed, and this pins that
 * claim rather than assuming it — `symbolHolds` already resolves the state
 * per candidate entity, so `any hungry-one` selects the entities currently
 * in that state and skips the ones that are not, including entities that
 * cannot hold the state at all.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, CHORD_STATE_PREFIX, createStory, Evaluator } from '../src';

const SOURCE = `story "Feeding Time" by "N"
  id: d10
  version: 0.0.1

define condition hungry-one: it is hungry

define trait feedable
  states: hungry, fed
end trait

create the Barn
  a room

  A barn.

create the player
  starts in the Barn

  You.

create the goat
  feedable
  in the Barn

  A goat.

create the sheep
  feedable
  in the Barn

  A sheep.

create the anvil
  in the Barn

  An anvil, which is never hungry.
`;

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  ev: Evaluator;
}

function load(): Loaded {
  const result = compile(SOURCE);
  expect(
    result.diagnostics.filter((d) => d.severity === 'error'),
    'the D10 source must compile — that is Acceptance 17’s compile half',
  ).toEqual([]);
  const story = createStory(result.ir, { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player, ev: new Evaluator(result.ir, story, 42) };
}

describe('D10 — an open condition over a union state selects per candidate', () => {
  it('both feedable entities start hungry — the anvil, which cannot hold the state, never matches', () => {
    const l = load();
    expect(l.ev.matchesOf('hungry-one', { world: l.world })).toEqual(['goat', 'sheep']);
  });

  it('matches only the entities currently in the state', () => {
    const l = load();
    l.world.setStateValue(CHORD_STATE_PREFIX + 'sheep', 'fed');
    expect(l.ev.matchesOf('hungry-one', { world: l.world })).toEqual(['goat']);
    expect(l.ev.evalCondition({ kind: 'any-of', condition: 'hungry-one' }, { world: l.world })).toBe(true);
  });

  it('feeding both empties the match set — the existential goes false, the negated one true', () => {
    const l = load();
    l.world.setStateValue(CHORD_STATE_PREFIX + 'goat', 'fed');
    l.world.setStateValue(CHORD_STATE_PREFIX + 'sheep', 'fed');
    expect(l.ev.matchesOf('hungry-one', { world: l.world })).toEqual([]);
    expect(l.ev.evalCondition({ kind: 'any-of', condition: 'hungry-one' }, { world: l.world })).toBe(false);
    expect(l.ev.evalCondition({ kind: 'none-of', condition: 'hungry-one' }, { world: l.world })).toBe(true);
  });
});
