/**
 * determiners-and-all.test.ts — articles and determiners split once by the
 * English parser (ADR-385 D2), through the REAL compiler, loader and engine.
 * `my` narrows a phrase to what the player carries or wears when something
 * there matches; `everything` is `all`; `all` followed by noun words takes
 * every portable thing the matcher names and nothing else. Assertions are on
 * where things end up and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
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

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the sword
  a thing
  in the Workshop

  A sword.

create the brass clock
  a thing
  in the Workshop

  A brass clock.

create the wall clock
  a thing
  in the Workshop
  scenery

  A wall clock.

create the gold coins
  a thing
  in the Workshop
  aka coins

  Some gold coins.

create the copper coins
  a thing
  in the Workshop
  aka coins

  Some copper coins.

create the box
  a thing
  in the Workshop

  A small box.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('articles and determiners are split once by the English parser (ADR-385 D2)', () => {
  it('`wind my clock` with the brass clock held winds it, not the wall clock', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take brass clock');
    expect(game.world.getLocation(game.id('brass-clock'))).toBe(game.player.id);
    const { text } = await game.turnText('wind my clock');
    expect(text).toContain('You wind the brass clock.');
  });

  it('`take my lantern` takes the lantern in view when nothing carried matches', async () => {
    const game = await bootTurns(STORY);
    const lantern = game.id('brass-lantern');
    expect(game.world.getLocation(lantern)).toBe(game.id('workshop'));
    await game.turn('take my lantern');
    expect(game.world.getLocation(lantern)).toBe(game.player.id);
    await game.turn('drop my lantern');
    expect(game.world.getLocation(lantern)).toBe(game.id('workshop'));
  });

  it('`take everything` takes every portable thing', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take everything');
    for (const irId of ['brass-lantern', 'sword', 'brass-clock', 'gold-coins', 'copper-coins', 'box']) {
      expect(game.world.getLocation(game.id(irId)), irId).toBe(game.player.id);
    }
    expect(game.world.getLocation(game.id('wall-clock'))).toBe(game.id('workshop'));
  });

  it('`take all coins` takes the coins and nothing else', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take all coins');
    expect(game.world.getLocation(game.id('gold-coins'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('copper-coins'))).toBe(game.player.id);
    for (const irId of ['brass-lantern', 'sword', 'brass-clock', 'box']) {
      expect(game.world.getLocation(game.id(irId)), irId).toBe(game.id('workshop'));
    }
  });

  it('`drop all my coins` drops only the coins the player carries', async () => {
    const game = await bootTurns(STORY);
    await game.turn('take gold coins');
    await game.turn('take sword');
    await game.turn('drop all my coins');
    expect(game.world.getLocation(game.id('gold-coins'))).toBe(game.id('workshop'));
    expect(game.world.getLocation(game.id('sword'))).toBe(game.player.id);
    expect(game.world.getLocation(game.id('copper-coins'))).toBe(game.id('workshop'));
  });
});
