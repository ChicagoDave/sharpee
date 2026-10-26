/**
 * language-words-at-install.test.ts — the world learns its language's words at
 * install, and the matcher reads them from the world (ADR-387 D2), through the
 * REAL compiler, loader and engine. The self words name the player, the
 * actor's possessive still narrows to the held thing, a typed article still
 * splits, and a name with stopwords ("the bag of holding") still derives its
 * content words — all as at HEAD, with no English left in world-model.
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

  A cluttered workshop.

create the brass lantern
  a thing
  in the Workshop

  A brass lantern.

create the bag of holding
  a container, openable
  in the Workshop
  starts open

  A bag.

create Alex
  a person
  playable
  starts in the Workshop

  You, as ever.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-387 D2: the world carries its language words from install', () => {
  it('gives the installed world its words', async () => {
    const t = await bootTurns(STORY);
    const words = t.world.getLanguageWords();
    expect(words.selfWords).toContain('me');
    expect(words.nameStopwords).toContain('of');
  });

  it('x me and x myself examine the player through the self words', async () => {
    const t = await bootTurns(STORY);
    expect((await t.turnText('x me')).text).toContain('You, as ever.');
    expect((await t.turnText('x myself')).text).toContain('You, as ever.');
  });

  it('take the lantern splits the article and takes the lantern', async () => {
    const t = await bootTurns(STORY);
    await t.turnText('take the lantern');
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.player.id);
  });

  it('take my lantern narrows to the held lantern once it is held', async () => {
    const t = await bootTurns(STORY);
    await t.turnText('take lantern');
    const { text } = await t.turnText('drop my lantern');
    expect(text).toContain('Dropped');
    expect(t.world.getLocation(t.id('brass-lantern'))).toBe(t.id('workshop'));
  });

  it('a name with stopwords still answers to its content words', async () => {
    const t = await bootTurns(STORY);
    const { text } = await t.turnText('x holding');
    expect(text).toContain('A bag.');
    expect((await t.turnText('x bag of holding')).text).toContain('A bag.');
  });
});
