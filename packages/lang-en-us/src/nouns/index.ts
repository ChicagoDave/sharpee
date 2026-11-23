/**
 * @sharpee/lang-en-us/nouns — the English noun extractor (ADR-407 D3, D4).
 *
 * Purpose: give every reader of English prose (a lens, `sharpee world-index`)
 * one extractor for the story's language. It is the deduplicated union of two
 * readings, never one replacing the other: ADR-321's article-anchored heuristic
 * (`heuristic.ts`) and the part-of-speech tagger (`tagger.ts`, `compromise`).
 * On The Relighting each found nouns the other missed.
 *
 * **Outside the story runtime.** The package's main entry never imports this
 * module, so a published story never carries `compromise` (ADR-407 D3, AC-3).
 * Readers find it by convention through if-domain's `resolveNounExtractor`.
 *
 * Public interface: `nounExtractor` (languageCode 'en-US', `filters`, `extract`, `tokenize`).
 *
 * Owner context: @sharpee/lang-en-us, `nouns` subpath — English prose reading.
 *
 * @see ADR-407 D3, D4, D8; ADR-321 D6b, D16
 */

import type { NounCandidate, NounExtractor } from '@sharpee/if-domain';
import { ENGLISH_NOUN_FILTERS, extractHeuristicPhrases, tokenize, type HeuristicPhrase } from './heuristic.js';
import { extractTaggedPhrases } from './tagger.js';

/**
 * The tagger's phrases, or none when it fails.
 *
 * The contract says `extract` never throws on prose. Should the tagger ever
 * throw, the heuristic's half still stands, so a passage loses only what the
 * tagger alone would have added; it never loses what the heuristic finds.
 *
 * @param text the passage
 * @returns the tagger's phrases, or [] if it threw
 */
function taggedOrNone(text: string): HeuristicPhrase[] {
  try {
    return extractTaggedPhrases(text);
  } catch {
    return [];
  }
}

/**
 * Candidate noun phrases in a passage of English prose.
 *
 * @param text the passage, any casing
 * @returns the union of both readings, deduplicated by words (the first
 *   occurrence wins), in reading order; [] for an empty passage
 */
function extract(text: string): NounCandidate[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const byKey = new Map<string, HeuristicPhrase>();
  for (const phrase of [...extractHeuristicPhrases(text), ...taggedOrNone(text)]) {
    const key = phrase.words.join(' ');
    const held = byKey.get(key);
    if (held === undefined || phrase.offset < held.offset) byKey.set(key, phrase);
  }
  return [...byKey.values()]
    .sort((left, right) => left.offset - right.offset)
    .map((phrase) => ({
      text: text.slice(phrase.offset, phrase.end),
      words: phrase.words,
      head: phrase.words[phrase.words.length - 1],
      offset: phrase.offset,
    }));
}

/**
 * The passage's words, as every English reader splits them (ADR-321 D16).
 *
 * @param text the passage, any casing
 * @returns its words, lowercased, hyphenated compounds whole; [] for an empty passage
 */
function tokenizeEnglish(text: string): string[] {
  if (typeof text !== 'string') return [];
  return tokenize(text);
}

/** The English noun extractor (ADR-407 D3). */
export const nounExtractor: NounExtractor = {
  languageCode: 'en-US',
  filters: ENGLISH_NOUN_FILTERS,
  extract,
  tokenize: tokenizeEnglish,
};
