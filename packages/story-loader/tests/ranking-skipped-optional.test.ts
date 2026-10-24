/**
 * ranking-skipped-optional.test.ts — a grammar line that skips an optional
 * word ranks as though the word were absent (ADR-384 D1), through the REAL
 * compiler, loader and engine. A story line with a skipped optional outranks
 * the standard line it overrides, and within one action the line that reads
 * the words literally beats the one whose slot would swallow them. Assertions
 * are on the rendered text and on which action's state change happened.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Workshop
  authors:
    T
  id: workshop
  story-version: 0.0.1
  use scoring

define action shoving
  grammar
    push [hard] the target
  score shoves worth 1
  award shoves
  phrase shoved

  phrases en-US
    shoved:
      You shove {the target}.

define action shooting
  grammar
    shoot the target
    shoot [the] arrow at the target
  phrase shot

  phrases en-US
    shot:
      You shoot at {the target}.

create the Workshop
  a room

  A cluttered workshop.

create the button
  a thing
  in the Workshop
  scenery

  A red button.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('a skipped optional word costs a grammar line nothing (ADR-384 D1)', () => {
  it('a story line that skips its optional outranks the standard line', async () => {
    const game = await bootTurns(STORY);
    expect(game.world.getScore()).toBe(0);
    const { text } = await game.turnText('push button');
    expect(text).toContain('You shove the button.');
    expect(text).not.toContain('fixed in place');
    expect(game.world.getScore()).toBe(1);
  });

  it('the same story line still wins when the optional is typed', async () => {
    const game = await bootTurns(STORY);
    const { text } = await game.turnText('push hard button');
    expect(text).toContain('You shove the button.');
    expect(game.world.getScore()).toBe(1);
  });

  it('within one action, the line that reads the words literally binds the right noun', async () => {
    const game = await bootTurns(STORY);
    expect((await game.turnText('shoot arrow at button')).text).toContain('You shoot at the button.');
    expect((await game.turnText('shoot the arrow at button')).text).toContain('You shoot at the button.');
  });
});
