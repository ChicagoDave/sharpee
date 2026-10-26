/**
 * two-engines-one-process.test.ts — two REAL engines over two Chord stories
 * in one process keep their parsers apart (ADR-387 D4): each `it` names its
 * own thing, and a story verb one story defines is not understood by the
 * other. A single engine's pronoun context behaves as before.
 */
import { describe, expect, it } from 'vitest';
import type { EnglishParser } from '@sharpee/parser-en-us';
import { bootTurns } from './helpers/boot-turns';

const story = (id: string, thing: string, verb?: string) => `story
  title: ${id}
  authors:
    Sharpee
  id: ${id}
  story-version: 0.0.1

create the Room
  a room

  A room.

create the ${thing}
  a thing
  in the Room

  A ${thing}.

create Alex
  a person
  playable
  starts in the Room

  You.
${verb ? `
define action ${verb}bing
  grammar
    ${verb} the target
  phrase ${verb}bed

  phrases en-US
    ${verb}bed:
      You ${verb} {the target}.
` : ''}
before the game starts
  change the player to Alex
end before
`;

describe('ADR-387 D4: two engines in one process', () => {
  it('each engine\'s `it` names its own thing', async () => {
    const a = await bootTurns(story('story-a', 'lamp'));
    const b = await bootTurns(story('story-b', 'sword'));
    await a.turnText('take lamp');
    await b.turnText('take sword');
    expect((await a.turnText('drop it')).text).toContain('Dropped');
    expect(a.world.getLocation(a.id('lamp'))).toBe(a.id('room'));
    expect((await b.turnText('drop it')).text).toContain('Dropped');
    expect(b.world.getLocation(b.id('sword'))).toBe(b.id('room'));
  });

  it('a verb one story defines is not understood by the other, after both are booted', async () => {
    const a = await bootTurns(story('story-a', 'lamp', 'frob'));
    const b = await bootTurns(story('story-b', 'sword'));
    expect((await a.turnText('frob lamp')).text).toContain('You frob the lamp.');
    expect((await b.turnText('frob sword')).text).toContain("I don't understand that.");
    // The two parsers hold different registries and different pronoun contexts
    const parserA = a.engine.getParser() as EnglishParser;
    const parserB = b.engine.getParser() as EnglishParser;
    expect(parserA.getVocabularyRegistry()).not.toBe(parserB.getVocabularyRegistry());
    expect(parserA.getPronounContextManager()).not.toBe(parserB.getPronounContextManager());
  });
});
