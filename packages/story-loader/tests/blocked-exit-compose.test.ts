/**
 * blocked-exit-compose.test.ts — GH #315: a direction's multiple
 * `is blocked` lines compose in declaration order instead of last-wins.
 *
 * One evaluator pair is registered per (room, direction); the blocked boolean
 * and the refusal phrase are two views of one arm selection (first line whose
 * condition holds; a condition-less line is the always-true fallback), so they
 * cannot disagree. Assertions read the registered evaluators the way going's
 * read points do (`world.evaluate`), across live story-state changes (ADR-240).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { exitBlockedKey, exitMessageKey } from '@sharpee/stdlib';
import { Direction, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const SOURCE = `story
  title: Gatehouse
  authors:
    T
  id: gatehouse
  story-version: 0.0.1
  states: calm, hunted, chase

create the Junction
  a room
  north to the Road
  east to the Yard
  north is blocked while calm: north-deflected
  north is blocked while hunted: gates-locked
  north is blocked while chase: gates-locked
  east is blocked while calm: yard-roped
  east is blocked: yard-shut

  The junction.

create the Road
  a room
  south to the Junction

  The road.

create the Yard
  a room
  west to the Junction

  The yard.

create the bell
  scenery
  in the Junction

  A bell.

  on the player pushing
    change the story to hunted
  end on

create the gong
  scenery
  in the Junction

  A gong.

  on the player pushing
    change the story to chase
  end on

create the player
  starts in the Junction

  You.

define phrase north-deflected
  Your stomach turns you back south.
end phrase

define phrase gates-locked
  The mercenaries have locked the gates.
end phrase

define phrase yard-roped
  A rope blocks the yard for the market walk.
end phrase

define phrase yard-shut
  The yard is shut.
end phrase
`;

function load() {
  const result = compile(SOURCE);
  expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

/** Drive the named scenery's real registered pushing interceptor (mutation phase). */
function push(cw: ReturnType<typeof load>, name: string): void {
  const entity = cw.world.getEntity(cw.story.entityId(name)!)!;
  const lookup = cw.world.getInterceptorForAction(entity, 'if.action.pushing')!;
  const data = {};
  lookup.interceptor.postValidate!(entity, cw.world, cw.player.id, data);
  lookup.interceptor.postExecute!(entity, cw.world, cw.player.id, data);
}

function northKeys(cw: ReturnType<typeof load>) {
  const junctionId = cw.story.entityId('junction')!;
  return {
    blocked: () => cw.world.evaluate(exitBlockedKey(junctionId, Direction.NORTH)),
    message: () => cw.world.evaluate(exitMessageKey(junctionId, Direction.NORTH)),
  };
}

describe('GH #315 — per-direction blocked lines compose, declaration order, first-true-wins', () => {
  it('the first arm supplies the refusal while its condition holds (calm deflection)', () => {
    const cw = load();
    const north = northKeys(cw);

    expect(north.blocked()).toBe(true);
    expect(north.message()).toBe('Your stomach turns you back south.');
  });

  it('a later arm fires once the state moves past the first (the arm last-wins silently killed)', () => {
    const cw = load();
    const north = northKeys(cw);

    push(cw, 'bell'); // calm -> hunted
    expect(north.blocked()).toBe(true);
    expect(north.message()).toBe('The mercenaries have locked the gates.');

    push(cw, 'gong'); // hunted -> chase
    expect(north.blocked()).toBe(true);
    expect(north.message()).toBe('The mercenaries have locked the gates.');
  });

  it('a condition-less line is the always-true fallback arm', () => {
    const cw = load();
    const junctionId = cw.story.entityId('junction')!;
    const blocked = () => cw.world.evaluate(exitBlockedKey(junctionId, Direction.EAST));
    const message = () => cw.world.evaluate(exitMessageKey(junctionId, Direction.EAST));

    // While calm the conditional first arm wins.
    expect(blocked()).toBe(true);
    expect(message()).toBe('A rope blocks the yard for the market walk.');

    // Past calm, the fallback holds — the direction never opens.
    push(cw, 'bell');
    expect(blocked()).toBe(true);
    expect(message()).toBe('The yard is shut.');
  });

  it('registers exactly one evaluation result per key — no arm leaks through as a second registration', () => {
    const cw = load();
    const north = northKeys(cw);

    // The boolean and the phrase come from ONE selection: at every state the
    // message is the phrase of an arm whose condition holds, never a stale arm.
    expect(north.message()).toBe('Your stomach turns you back south.');
    push(cw, 'bell');
    expect(north.message()).not.toBe('Your stomach turns you back south.');
  });
});
