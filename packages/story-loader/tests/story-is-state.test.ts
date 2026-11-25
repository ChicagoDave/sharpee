/**
 * story-is-state.test.ts — `the story is [not] <state>` evaluated in a
 * loaded world (GH #705): a room dark while the story is night and an exit
 * blocked while the story is not day both follow `change the story to`.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, condition evaluation.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { exitBlockedKey } from '@sharpee/stdlib';
import { ActorTrait, Direction, WorldModel, darkKey } from '@sharpee/world-model';
import { createStory } from '../src';

const SOURCE = `story
  title: Nightfall
  authors:
    T
  id: nightfall
  story-version: 0.0.1
  states: day, night

create the Terrace
  a room
  dark while the story is night
  north to the Garden
  north is blocked while the story is not day: gate-chained

  A stone terrace.

create the Garden
  a room
  south to the Terrace

  A walled garden.

create the sundial
  a thing, singular, scenery
  in the Terrace

  A brass sundial.

  on the player pushing
    change the story to night
  end on

create Alex
  a person
  playable
  starts in the Terrace

  You.

before the game starts
  change the player to Alex
end before

define phrase gate-chained
  The garden gate is chained for the night.
end phrase
`;

describe('`the story is <state>` follows the story state at run time (GH #705)', () => {
  it('a `dark while` and a `blocked while` written with `the story is` flip on `change the story to`', () => {
    const result = compile(SOURCE);
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
    const story = createStory(result.ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    player.add(new ActorTrait({ isPlayable: true }));
    world.setPlayer(player.id);
    const terraceId = world.getEntity('terrace')!.id;

    // Day: the story is not night, and it is day.
    expect(world.evaluate(darkKey(terraceId))).toBe(false);
    expect(world.evaluate(exitBlockedKey(terraceId, Direction.NORTH))).toBe(false);

    // `change the story to night`, through the sundial's registered interceptor.
    const sundial = world.getEntity('sundial')!;
    const lookup = world.getInterceptorsForAction(sundial, 'if.action.pushing')[0]!;
    const data = {};
    lookup.interceptor.postValidate!(sundial, world, player.id, data);
    lookup.interceptor.postExecute!(sundial, world, player.id, data);

    expect(world.evaluate(darkKey(terraceId))).toBe(true);
    expect(world.evaluate(exitBlockedKey(terraceId, Direction.NORTH))).toBe(true);
  });
});
