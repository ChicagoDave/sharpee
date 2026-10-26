/**
 * ranking-specificity-first.test.ts — the more specific grammar line wins
 * whatever its tier, and a story replaces a standard line by saying so
 * (ADR-384 D2), through the REAL compiler, loader and engine. A broad story
 * `take the thing` takes `take lamp` but not `take off hat`, which standard
 * taking-off answers; with `remove from action taking_off` removing
 * `take off the item`, the story line takes `take off hat` too. Assertions
 * are on the hat's worn state and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { TraitType, type WearableTrait } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const story = (extra: string) => `story
  title: Hat Rack
  authors:
    T
  id: hat-rack
  story-version: 0.0.1

define action grabbing
  grammar
    take the thing
  phrase grabbed

  phrases en-US
    grabbed:
      You grab at {the thing}.
${extra}
create the Workshop
  a room

  A cluttered workshop.

create the hat
  a thing, wearable
  in the Workshop

  A felt hat.

create the lamp
  a thing
  in the Workshop

  A brass lamp.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

const REMOVE_TAKE_OFF = `
remove from action taking_off
  take off the item
`;

async function bootWearingHat(extra: string) {
  const game = await bootTurns(story(extra));
  const hat = game.world.getAllEntities().find((e) => e.name === 'hat')!;
  const worn = () => (hat.get(TraitType.WEARABLE) as WearableTrait).worn;
  await game.turnText('wear hat');
  return { game, worn };
}

describe('the more specific line wins whatever its tier (ADR-384 D2)', () => {
  it('a standard `take off the item` beats a broad story `take the thing`', async () => {
    const { game, worn } = await bootWearingHat('');
    expect(worn()).toBe(true);
    const { text } = await game.turnText('take off hat');
    expect(text).not.toContain('You grab at');
    expect(worn()).toBe(false);
  });

  it('the broad story line still takes what nothing more specific claims', async () => {
    const { game } = await bootWearingHat('');
    expect((await game.turnText('take lamp')).text).toContain('You grab at the lamp.');
  });

  it('removing the standard line hands its words to the story line', async () => {
    const { game, worn } = await bootWearingHat(REMOVE_TAKE_OFF);
    expect(worn()).toBe(true);
    await game.turnText('take off hat');
    expect(worn()).toBe(true);
  });
});
