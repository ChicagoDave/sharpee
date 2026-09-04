/**
 * vocabulary.test.ts — the published naming surface, and the drift guard on it.
 *
 * D11 hands Chord Writer the story's vocabulary rather than asking it to rebuild
 * one, because a chunk the IDE makes is worth nothing until it resolves. That
 * only holds if a resolver written against the SURFACE answers exactly what the
 * analyzer's own resolver answers against the INDEX — so the guard here is a
 * second implementation, written the way the Swift one will be, run over every
 * phrase all three corpus stories produce.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D11, D11a
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { buildDocument } from '../src/document.js';
import { extractNounPhrases } from '../src/incomplete.js';
import { collectProse } from '../src/prose.js';
import {
  buildVocabularyIndex,
  publishVocabulary,
  resolvePhrase,
  type VocabularySurface,
} from '../src/vocabulary.js';
import { CORPUS, compileStory } from './corpus.js';

/**
 * Resolve a phrase using only what crosses the wire.
 *
 * Deliberately written against `Record`/`string[]` alone, with `byWord` rebuilt
 * locally rather than published — this is the shape the Swift resolver has to
 * be, so if it can disagree with the analyzer, it disagrees here first.
 */
function resolveFromSurface(
  surface: VocabularySurface,
  phrase: string,
  words: readonly string[],
): string[] {
  const exact = surface.exactForms[phrase];
  if (exact !== undefined) return [...exact];
  if (words.length === 0) return [];

  const holders = Object.entries(surface.wordsOf)
    .filter(([, vocabulary]) => vocabulary.includes(words[0]))
    .map(([id]) => id);

  return holders.filter((id) => words.every((word) => surface.wordsOf[id].includes(word)));
}

describe('the published vocabulary surface (D11)', () => {
  let stories: Array<[string, StoryIR]>;

  beforeAll(() => {
    stories = [
      ['fernhill', compileStory(CORPUS.fernhill)],
      ['the alderman', compileStory(CORPUS.alderman)],
      ['ides of march', compileStory(CORPUS.idesOfMarch)],
    ];
  });

  it('carries both tiers, because one tier resolves differently', () => {
    const [, fernhill] = stories[0];
    const surface = publishVocabulary(buildVocabularyIndex(fernhill));

    // wordsOf alone cannot express "this whole string names exactly this thing",
    // and exact forms are precisely where the two tiers disagree.
    expect(Object.keys(surface.wordsOf).length).toBeGreaterThan(0);
    expect(Object.keys(surface.exactForms).length).toBeGreaterThan(0);
    expect(surface.exactForms['tarnished key']).toEqual(['tarnished-key']);
  });

  it('leaves the player out, the way the index does', () => {
    const [, fernhill] = stories[0];
    const player = fernhill.entities.find((entity) => entity.isPlayable);
    const surface = publishVocabulary(buildVocabularyIndex(fernhill));
    expect(surface.wordsOf[player!.id]).toBeUndefined();
  });

  // THE DRIFT GUARD. Every phrase the extractor pulls out of every corpus story,
  // resolved twice — once through the in-process index, once through nothing but
  // the wire — and the two must never differ. Without this, "the IDE applies the
  // surface it was given" is an intention rather than a property.
  it('resolves identically through the wire and through the index', () => {
    let compared = 0;

    for (const [name, ir] of stories) {
      const index = buildVocabularyIndex(ir);
      const surface = publishVocabulary(index);

      for (const site of collectProse(ir)) {
        for (const noun of extractNounPhrases(site.text)) {
          const viaIndex = resolvePhrase(index, noun.phrase, noun.words).sort();
          const viaSurface = resolveFromSurface(surface, noun.phrase, noun.words).sort();
          expect(viaSurface, `${name}: "${noun.phrase}"`).toEqual(viaIndex);
          compared += 1;
        }
      }
    }

    // A guard that compared nothing would pass silently.
    expect(compared).toBeGreaterThan(500);
  });

  it('rides the document', () => {
    const [, fernhill] = stories[0];
    const document = buildDocument(fernhill, 'test');
    expect(Object.keys(document.vocabulary.wordsOf)).toHaveLength(64);
    expect(document.vocabulary.wordsOf['oil-lamp']).toEqual(
      expect.arrayContaining(['oil', 'lamp']),
    );
  });
});
