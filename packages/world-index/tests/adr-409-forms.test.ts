/**
 * adr-409-forms.test.ts — world-index reads the forms from the IR and
 * resolves them as the runtime does (ADR-409 D2, D4, AC-6).
 *
 * The compiler writes every form into the IR once; world-index sorts them
 * onto the surface through world-model's `namingFormsOf`, so a phrase that
 * names a thing by its worked-out or written form resolves here exactly as
 * `matchNoun` names it at runtime, and a fully written match hides one that
 * needs a worked-out form.
 *
 * Owner context: @sharpee/world-index — tests.
 */
import { describe, expect, it } from 'vitest';
import { matchNoun } from '@sharpee/world-model';
import { buildVocabularyIndex, irNamingSurface, localeWordsOf, resolvePhrase } from '../src/vocabulary.js';
import { compileSource } from './corpus.js';

const SOURCE = `story
  title: Refectory
  authors:
    Nobody
  id: refectory
  story-version: 0.0.1

create the Refectory
  a room

  A long room.

create the candles
  aka prickets
  a thing, scenery, plural
  in the Refectory

  Tallow candles.

create the mouse
  a thing, singular of mice
  in the Refectory

  A mouse.

create the red button
  a thing, singular
  in the Refectory

  A red button.

create the blue button
  a thing, singular
  in the Refectory

  A blue button.

create the control panel
  aka brass buttons
  a thing, singular
  in the Refectory

  A panel.

create Alex
  a person
  playable
  starts in the Refectory

  You.

before the game starts
  change the player to Alex
end before
`;

describe('ADR-409 AC-6: resolvePhrase reads the forms from the IR', () => {
  const ir = compileSource(SOURCE);
  const index = buildVocabularyIndex(ir);

  it('resolves a worked-out name form and a worked-out aka form', () => {
    expect(resolvePhrase(index, 'candle')).toEqual(['candles']);
    expect(resolvePhrase(index, 'pricket')).toEqual(['candles']);
  });

  it('resolves a written form, at the exact tier', () => {
    expect(resolvePhrase(index, 'mice')).toEqual(['mouse']);
    expect(index.exactForms.get('mice')).toEqual(new Set(['mouse']));
  });

  it('lets a fully written match hide the things that only work the phrase out', () => {
    expect(resolvePhrase(index, 'buttons')).toEqual(['control-panel']);
  });

  it('agrees with matchNoun on every form, over the same surface the runtime builds', () => {
    const words = localeWordsOf(ir);
    const cases: Array<[string, string, 'exact' | 'words', number]> = [
      ['candles', 'candle', 'words', 1],
      ['candles', 'pricket', 'words', 1],
      ['mouse', 'mice', 'exact', 0],
      ['red-button', 'buttons', 'words', 1],
      ['control-panel', 'buttons', 'words', 0],
    ];
    for (const [id, phrase, tier, workedOutWords] of cases) {
      const surface = irNamingSurface(ir.entities.find((e) => e.id === id)!, words);
      expect(matchNoun(surface, { text: phrase }), `${id} / ${phrase}`).toMatchObject({ tier, workedOutWords });
    }
  });
});
