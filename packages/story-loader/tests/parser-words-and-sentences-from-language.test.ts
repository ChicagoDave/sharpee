/**
 * parser-words-and-sentences-from-language.test.ts — the list words, the
 * possessive by person and the parse-failure sentences come from the
 * language (ADR-387 D3, D6), through the REAL compiler, loader and engine.
 * Every line a player reads here is the text HEAD printed before the move.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Words Probe
  authors:
    Sharpee
  id: words-probe
  story-version: 0.0.1

create the Workshop
  a room
  east to the Store through the oak door

  A cluttered workshop.

create the Store
  a room
  west to the Workshop through the oak door

  A bare store room.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the sword
  a thing
  in the Workshop

  A sword.

create the salt and pepper shaker
  a thing
  in the Workshop

  A shaker.

create the oak door
  a door, lockable with the brass key, starts locked

  A door.

create the brass key
  a thing

  A key.

create Alex
  a person
  playable
  starts in the Workshop
  carries the brass key

  You, as ever.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-387 D6: list words and the possessive through the real engine', () => {
  it('take sword, lantern takes both', async () => {
    const t = await bootTurns(STORY);
    await t.turnText('take sword, lantern');
    expect(t.world.getLocation(t.id('sword'))).toBe(t.player.id);
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.player.id);
  });

  it('take salt and pepper shaker is one item when only the shaker is there', async () => {
    const t = await bootTurns(STORY);
    const { text } = await t.turnText('take salt and pepper shaker');
    expect(text).toContain('Taken');
    expect(t.world.getLocation(t.id('salt-and-pepper-shaker'))).toBe(t.player.id);
  });

  it('drop my lantern and drop your lantern each narrow to the held lantern', async () => {
    const t = await bootTurns(STORY);
    await t.turnText('take lantern');
    expect((await t.turnText('drop my lantern')).text).toContain('Dropped');
    await t.turnText('take lantern');
    expect((await t.turnText('drop your lantern')).text).toContain('Dropped');
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.id('workshop'));
  });
});

describe('ADR-387 D3: the seat questions and failures print as at HEAD', () => {
  it('unlock door with (key held) asks "Unlock it where?"', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('unlock door with')).text).toContain('Unlock it where?');
  });

  it('a bare take asks "What do you want to take?"', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('take')).text).toContain('What do you want to take?');
  });

  it('take widget and look at sky reach the validator, which refuses them as at HEAD', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('take widget')).text).toContain("You can't see any such thing.");
    expect((await t.turnText('look at sky')).text).toContain("You can't see any such thing.");
  });

  it('an unknown verb prints "I don\'t understand that." as at HEAD', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('frobnicate the sword')).text).toContain("I don't understand that.");
  });
});
