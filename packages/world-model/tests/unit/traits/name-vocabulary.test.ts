// packages/world-model/tests/unit/traits/name-vocabulary.test.ts
//
// ADR-231 D3 (PIN 2): deriveNameVocabulary is a PURE on-demand derivation
// of an entity name's content words — lowercase, whitespace-tokenized,
// stopwords {the, a, an, of} dropped, hyphenated tokens kept whole.

import {
  deriveNameVocabulary,
} from '../../../src/traits/identity/name-vocabulary';

/** English stopwords, handed in as the language's (ADR-387 D2); world-model holds none. */
const STOPWORDS: readonly string[] = ['the', 'a', 'an', 'of'];

describe('deriveNameVocabulary (ADR-231 D3, PIN 2)', () => {
  it('derives content words from a simple two-word name', () => {
    expect(deriveNameVocabulary('brass key', STOPWORDS)).toEqual(['brass', 'key']);
  });

  it('drops the stopwords {the, a, an, of}', () => {
    expect(deriveNameVocabulary('bag of holding', STOPWORDS)).toEqual(['bag', 'holding']);
    expect(deriveNameVocabulary('the crystal skull', STOPWORDS)).toEqual(['crystal', 'skull']);
    expect(deriveNameVocabulary('a jar', STOPWORDS)).toEqual(['jar']);
    expect(deriveNameVocabulary('an ancient map of the realm', STOPWORDS)).toEqual([
      'ancient',
      'map',
      'realm'
    ]);
  });

  it('keeps hyphenated tokens as single words', () => {
    expect(deriveNameVocabulary('jack-in-the-box', STOPWORDS)).toEqual(['jack-in-the-box']);
    expect(deriveNameVocabulary('jewel-encrusted egg', STOPWORDS)).toEqual([
      'jewel-encrusted',
      'egg'
    ]);
  });

  it('lowercases and collapses whitespace', () => {
    expect(deriveNameVocabulary('  Brass   KEY ', STOPWORDS)).toEqual(['brass', 'key']);
  });

  it('deduplicates repeated words, preserving first-appearance order', () => {
    expect(deriveNameVocabulary('big big dog', STOPWORDS)).toEqual(['big', 'dog']);
  });

  it('returns [] for empty and stopword-only names', () => {
    expect(deriveNameVocabulary('', STOPWORDS)).toEqual([]);
    expect(deriveNameVocabulary('the', STOPWORDS)).toEqual([]);
    expect(deriveNameVocabulary('of the', STOPWORDS)).toEqual([]);
  });

  it('is pure — repeated calls with the same input agree and inputs are untouched', () => {
    const name = 'Bag of Holding';
    const first = deriveNameVocabulary(name, STOPWORDS);
    const second = deriveNameVocabulary(name, STOPWORDS);
    expect(first).toEqual(second);
    expect(first).not.toBe(second); // fresh array each call, no caching state
    expect(name).toBe('Bag of Holding');
  });

});
