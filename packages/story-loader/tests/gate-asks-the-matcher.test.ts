/**
 * gate-asks-the-matcher.test.ts — the parse-time gate asks the one noun
 * matcher and its answer travels to the validator (ADR-385 D3, D4, D6),
 * through the REAL compiler, loader and engine. `wind ice` with the dice held
 * no longer slips through "dice"; `wind clock` with the brass clock held and
 * the wall clock in view winds the brass clock without asking; `wind it` with
 * `it` an unplaced spool does not run the action; `take it and the box`
 * takes both. Assertions are on where things end up and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { getPronounContextManager } from '@sharpee/parser-en-us';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Noun Probe
  authors:
    Sharpee
  id: noun-probe
  story-version: 0.0.1

define action winding
  grammar
    wind the target
  the target must be held
  phrase wound

  phrases en-US
    wound:
      You wind {the target}.

create the Workshop
  a room

  A cluttered workshop.

create the brass clock
  a thing
  in the Workshop

  A brass clock.

create the pair of dice
  a thing
  in the Workshop

  Two dice.

create the wall clock
  a thing
  in the Workshop
  scenery

  A wall clock.

create the latchkey
  a thing
  in the Workshop

  An iron latchkey.

create the box
  a thing
  in the Workshop

  A small box.

create the spool
  a thing

  A spool of thread.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('the gate asks the matcher and its answer travels (ADR-385 D3, D4, D6)', () => {
  it('`wind ice` with the dice held does not wind them (no substring at the gate)', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take dice');
    expect(game.world.getLocation(game.id('pair-of-dice'))).toBe(game.player.id);
    const { text } = await game.turnText('wind ice');
    expect(text).not.toContain('You wind');
  });

  it('`wind clock` with the brass clock held and the wall clock in view winds the brass clock, no question asked', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take brass clock');
    const { text } = await game.turnText('wind clock');
    expect(text).toContain('You wind the brass clock.');
    expect(text).not.toContain('Which do you mean');
  });

  it('`wind it` with `it` an unplaced spool does not run the action', async () => {
    const game = await bootTurns(STORY);
    const spool = game.id('spool');
    expect(game.world.getLocation(spool)).toBeUndefined();
    getPronounContextManager()!.registerEntity(spool, 'spool', game.world);
    const { text } = await game.turnText('wind it');
    expect(text).not.toContain('You wind');
  });

  it('`take it and the box` takes both', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take latchkey');
    await game.turn('drop latchkey');
    await game.turn('take it and the box');
    expect(game.world.getLocation(game.id('latchkey'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('box'))).toBe(game.player.id);
  });
});
