/**
 * slot-extent-search.test.ts — the parser searches slot extents (ADR-386 D1,
 * D2, D3) through the REAL compiler, loader and engine. A slot followed by an
 * optional element no longer swallows the required literal after it (`stow
 * lantern in box`), an optional literal that is also the topic's word is
 * retried as the topic (`scan up`), and a typed article reaches a passage
 * written without one (`climb the rope`). Assertions are on where things end
 * up and on the rendered text.
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const STORY = `story
  title: Search Probe
  authors:
    Sharpee
  id: search-probe
  story-version: 0.0.1

define action stowing
  grammar
    stow the item [carefully] in the container
  phrase stowed

  phrases en-US
    stowed:
      You stow {the item} in {the container}.

define action scanning
  grammar
    scan [up] the word
  the word is a topic
  phrase scanned

  phrases en-US
    scanned:
      You scan the shelves.

create the Workshop
  a room
  up to the Loft

  A cluttered workshop.

  passage to the Loft
    grammar
      climb rope
  end passage

create the Loft
  a room
  down to the Workshop

  A dusty loft.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the box
  a container, openable
  in the Workshop
  starts open

  A small box.

create the rope
  a thing
  in the Workshop
  scenery

  A rope up to the loft.

create Alex
  a person
  playable
  starts in the Workshop

  You.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-386 D2: a slot before an optional element (A3)', () => {
  it('stow lantern in box stows the lantern in the box', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take lantern');
    const { text } = await t.turnText('stow lantern in box');
    expect(text).toContain('You stow the brass lantern in the box.');
    expect(text).not.toContain('Stow it where?');
  });

  it('stow lantern carefully in box still works with the optional used', async () => {
    const t = await bootTurns(STORY);
    await t.turn('take lantern');
    const { text } = await t.turnText('stow lantern carefully in box');
    expect(text).toContain('You stow the brass lantern in the box.');
  });
});

describe('ADR-386 D2: an optional literal that is also the slot word (A4)', () => {
  it('scan up runs scanning with the topic up', async () => {
    const t = await bootTurns(STORY);
    const { text } = await t.turnText('scan up');
    expect(text).toContain('You scan the shelves.');
  });
});

describe('ADR-386 D3: a typed article against an article-less passage (A10)', () => {
  it('climb the rope takes the passage to the Loft', async () => {
    const t = await bootTurns(STORY);
    const { text } = await t.turnText('climb the rope');
    expect(text).toContain('Loft');
    expect(t.world.getContainingRoom(t.player.id)?.id).toBe(t.id('loft'));
  });

  it('climb rope still takes the passage', async () => {
    const t = await bootTurns(STORY);
    await t.turnText('climb rope');
    expect(t.world.getContainingRoom(t.player.id)?.id).toBe(t.id('loft'));
  });
});
