/**
 * gh-713-sound-heard-lines.test.ts — a played sound prints the heard line
 * its declaration wrote, and a sound that declares none prints nothing
 * (GH #713).
 *
 * REAL-PATH: real @sharpee/chord compile, the loader's real binding, the
 * real parser, language provider and `GameEngine.executeTurn`; the turn's
 * rendered text is the engine's own `text:output`. The registration cases
 * read what the story hands the language provider at `extendLanguage`.
 *
 * Public interface: none (test module).
 * Owner context: story-loader tests
 */
import { describe, expect, it } from 'vitest';
import { SOUND_EVENT_TYPES } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { createStory } from '../src';
import { bootTurns, compileSource, eventsOfType } from './helpers/boot-turns';

const SOURCE = `story
  title: Belfry
  authors:
    T
  id: belfry
  story-version: 0.0.1

before the game starts
  change the player to Ringer
end before

define sound tolling
  heard: The bell tolls, close and enormous.
  heard from afar: A bell tolls somewhere above you.
end sound

define sound catch

create the Belfry
  a room

  A belfry.

create Ringer
  a person
  playable
  starts in the Belfry

  You.

create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Belfry

  A rope.

  after the player pulling
    play sound tolling
  end after

create the brass latch
  aka latch
  a thing, scenery, pullable
  in the Belfry

  A latch.

  after the player pulling
    play sound catch
    phrase latch-gives
  end after

define phrase latch-gives
  The latch gives with a small click.
end phrase
`;

describe('a sound says what its declaration wrote (GH #713)', () => {
  it('a sound with a `heard:` line prints that line, not the platform default', async () => {
    const booted = await bootTurns(SOURCE);

    const { events, text } = await booted.turnText('pull rope');

    expect(eventsOfType(events, SOUND_EVENT_TYPES.EMITTED)).toHaveLength(1);
    expect(text).toContain('The bell tolls, close and enormous.');
    expect(text).not.toContain('You hear');
  });

  it('a sound with no heard line is made in the world and prints nothing of its own', async () => {
    const booted = await bootTurns(SOURCE);
    // The first turn after boot also carries the banner; take it first.
    await booted.turnText('pull rope');

    const { events, text } = await booted.turnText('pull latch');

    // The sound is still a sound in the world, for listeners to hear.
    const emitted = eventsOfType(events, SOUND_EVENT_TYPES.EMITTED);
    expect(emitted).toHaveLength(1);
    expect((emitted[0].data as { kind?: string }).kind).toBe('catch');
    expect(text).not.toContain('You hear');
    expect(text).not.toContain('catch');
    // The whole turn: the action, the author's phrase, the prompt. No empty
    // block stands where the default line used to print.
    expect(text).toBe('You pull the brass latch.\nThe latch gives with a small click.\n> ');
  });

  it('registers each sound under every tier: its own line where stated, empty where not', () => {
    const story = createStory(compileSource(SOURCE), { seed: 7 });
    const language = new EnglishLanguageProvider();
    // Before the story is installed the language knows neither sound.
    expect(language.getTemplate('sound.heard.tolling.full')).toBeUndefined();
    expect(language.getTemplate('sound.heard.catch.full')).toBeUndefined();

    story.extendLanguage(language);

    expect(language.getTemplate('sound.heard.tolling.full')).toBe('The bell tolls, close and enormous.');
    for (const tier of ['muffled', 'fragments', 'presence-only']) {
      expect(language.getTemplate(`sound.heard.tolling.${tier}`)).toBe('A bell tolls somewhere above you.');
    }
    for (const tier of ['full', 'muffled', 'fragments', 'presence-only']) {
      expect(language.getTemplate(`sound.heard.catch.${tier}`)).toBe('');
    }
  });
});
