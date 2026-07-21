// packages/world-model/tests/unit/traits/name-vocabulary.test.ts
//
// ADR-231 D3 (PIN 2): deriveNameVocabulary is a PURE on-demand derivation
// of an entity name's content words — lowercase, whitespace-tokenized,
// stopwords {the, a, an, of} dropped, hyphenated tokens kept whole.

import {
  deriveNameVocabulary,
  NAME_VOCABULARY_STOPWORDS
} from '../../../src/traits/identity/name-vocabulary';

describe('deriveNameVocabulary (ADR-231 D3, PIN 2)', () => {
  it('derives content words from a simple two-word name', () => {
    expect(deriveNameVocabulary('brass key')).toEqual(['brass', 'key']);
  });

  it('drops the stopwords {the, a, an, of}', () => {
    expect(deriveNameVocabulary('bag of holding')).toEqual(['bag', 'holding']);
    expect(deriveNameVocabulary('the crystal skull')).toEqual(['crystal', 'skull']);
    expect(deriveNameVocabulary('a jar')).toEqual(['jar']);
    expect(deriveNameVocabulary('an ancient map of the realm')).toEqual([
      'ancient',
      'map',
      'realm'
    ]);
  });

  it('keeps hyphenated tokens as single words', () => {
    expect(deriveNameVocabulary('jack-in-the-box')).toEqual(['jack-in-the-box']);
    expect(deriveNameVocabulary('jewel-encrusted egg')).toEqual([
      'jewel-encrusted',
      'egg'
    ]);
  });

  it('lowercases and collapses whitespace', () => {
    expect(deriveNameVocabulary('  Brass   KEY ')).toEqual(['brass', 'key']);
  });

  it('deduplicates repeated words, preserving first-appearance order', () => {
    expect(deriveNameVocabulary('big big dog')).toEqual(['big', 'dog']);
  });

  it('returns [] for empty and stopword-only names', () => {
    expect(deriveNameVocabulary('')).toEqual([]);
    expect(deriveNameVocabulary('the')).toEqual([]);
    expect(deriveNameVocabulary('of the')).toEqual([]);
  });

  it('is pure — repeated calls with the same input agree and inputs are untouched', () => {
    const name = 'Bag of Holding';
    const first = deriveNameVocabulary(name);
    const second = deriveNameVocabulary(name);
    expect(first).toEqual(second);
    expect(first).not.toBe(second); // fresh array each call, no caching state
    expect(name).toBe('Bag of Holding');
  });

  it('exposes exactly the pinned stopword set', () => {
    expect(Array.from(NAME_VOCABULARY_STOPWORDS).sort()).toEqual([
      'a',
      'an',
      'of',
      'the'
    ]);
  });
});
