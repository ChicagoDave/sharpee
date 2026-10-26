/**
 * readings-ranked-by-nouns.test.ts — every reading is ranked by its nouns
 * (ADR-386 D4, D5) through the REAL compiler, loader and engine. Two
 * consecutive slots split where both name something (`give old man coin`), a
 * slot before a literal reads past the literal when the longer span is the
 * name (`put jack in the box in chest`), a verb-matched failure that named
 * the door outranks a reading whose item names nothing (`unlock door with`),
 * and a reading that names nothing still reaches the validator when no
 * failure names more (`take widget`, `look at sky`). Assertions are on where
 * things end up and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Search Probe
  authors:
    Sharpee
  id: search-probe
  story-version: 0.0.1

define action offering
  grammar
    offer the recipient the item
  the item must be held
  phrase offered

  phrases en-US
    offered:
      You offer {the item} to {the recipient}.

create the Workshop
  a room
  east to the Store through the door

  A cluttered workshop.

create the Store
  a room
  west to the Workshop through the door

  A bare store room.

create the old man
  a person
  in the Workshop

  An old man.

create the sword
  a thing
  in the Workshop

  A sword.

create the gold coin
  a thing
  in the Workshop
  aka coin

  A gold coin.

create the pair of dice
  a thing
  in the Workshop
  aka dice

  Two dice.

create the box
  a container, openable
  in the Workshop
  starts open

  A small box.

create the chest
  a container, openable
  in the Workshop
  starts open

  A wooden chest.

create the jack in the box
  a thing
  in the Workshop
  aka jack

  A jack in the box.

create the door
  a door, openable, lockable with the iron key
  aka door

  An iron door.

create the iron key
  a thing
  in the Workshop
  aka key

  An iron key.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-386 D4: two consecutive slots split by their names (A1, A2)', () => {
  it('give old man coin gives the coin to the old man', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take coin');
    const { text } = await t.turnText('give old man coin');
    expect(text).not.toContain("You can't see any such thing.");
    expect(t.world.getLocation(t.id('gold-coin'))).toBe(t.id('old-man'));
  });

  it('give the old man the sword gives the sword', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take sword');
    await t.turn('give the old man the sword');
    expect(t.world.getLocation(t.id('sword'))).toBe(t.id('old-man'));
  });

  it('hand the old man dice gives the dice', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take dice');
    await t.turn('hand the old man dice');
    expect(t.world.getLocation(t.id('pair-of-dice'))).toBe(t.id('old-man'));
  });

  it('offer the old man dice, with the dice held, offers them', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take dice');
    const { text } = await t.turnText('offer the old man dice');
    expect(text).toContain('You offer the pair of dice to the old man.');
  });
});

describe('ADR-386 D4: a slot before a literal reads past the literal when the name is longer (A5)', () => {
  it('put jack in the box in chest puts the jack in the chest', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take jack');
    const { text } = await t.turnText('put jack in the box in chest');
    expect(text).not.toContain("You can't see any such thing.");
    expect(t.world.getLocation(t.id('jack-in-the-box'))).toBe(t.id('chest'));
  });
});

describe('ADR-386 D5: a failure outranks a reading only when it names more (A6)', () => {
  it('unlock door with, key held, asks for the key', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take key');
    const { text } = await t.turnText('unlock door with');
    // The seat question for the missing key, in the parser's words today
    // (the language's wording of it is step 7's)
    expect(text).toContain('Unlock it where?');
    expect(text).not.toContain("You can't see any such thing.");
  });

  it('take widget and look at sky reach the validator, which refuses them', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('take widget')).text).toContain("You can't see any such thing.");
    expect((await t.turnText('look at sky')).text).toContain("You can't see any such thing.");
  });

  it('bare put down asks what to put down (GH #388)', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('put down')).text).toContain('What do you want to put down?');
  });
});
