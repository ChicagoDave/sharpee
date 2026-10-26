/**
 * direction-table-from-language.test.ts — one direction table per language
 * (ADR-387 D5), through the REAL compiler, loader and engine. Every compass
 * word, abbreviation and `inside`/`outside` moves or refuses as at HEAD;
 * `upward` keeps HEAD's "I don't understand that."; a Chord `directions`
 * block still lowers and parses.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Compass Probe
  authors:
    Sharpee
  id: compass-probe
  story-version: 0.0.1

create the Hub
  a room
  north to the Attic
  northeast to the Attic
  up to the Attic
  in to the Attic

  The hub.

create the Attic
  a room
  south to the Hub

  The attic.

create Alex
  a person
  playable
  starts in the Hub

  You.

define action sailing
  grammar
    sail the direction
  directions
    port or p
    starboard or sb
  phrase sailed

  phrases en-US
    sailed:
      You sail that way.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-387 D5: directions through the real engine', () => {
  it('u, go up, inside, ne and go northeast each take the exit as at HEAD', async () => {
    for (const input of ['u', 'go up', 'inside', 'ne', 'go northeast', 'n', 'north']) {
      const t = await bootTurns(STORY);
      await t.turnText(input);
      expect(t.world.getLocation(t.player.id), input).toBe(t.id('attic'));
    }
  });

  it('outside with no exit refuses as at HEAD, and upward is not understood', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('outside')).text).toContain("You can't go that way.");
    expect((await t.turnText('upward')).text).toContain("I don't understand that.");
    expect((await t.turnText('go upward')).text).toContain("I don't understand that.");
    expect(t.world.getLocation(t.player.id)).toBe(t.id('hub'));
  });

  it('a Chord directions block still lowers to the action\'s own words', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('sail port')).text).toContain('You sail that way.');
    expect((await t.turnText('sail sb')).text).toContain('You sail that way.');
  });
});
