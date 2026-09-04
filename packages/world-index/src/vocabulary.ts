/**
 * vocabulary.ts — resolving a noun phrase the way the parser resolves a
 * player's command.
 *
 * Purpose: the Incomplete view asks one question of every phrase an author
 * wrote — would the parser find something if a player typed this? Answering it
 * with a private matching rule would answer a different question and answer it
 * confidently, so the content-word derivation is imported from the platform
 * (`deriveNameVocabulary`, the function `command-validator.ts` itself calls)
 * rather than restated here.
 *
 * The vocabulary is `name content words + alias content words + authored
 * adjectives` (ADR-321 D5). The third term is empty for every Chord story by
 * construction: Chord has no adjective syntax, and ADR-093's `adjectives` field
 * is redundant with the name-word derivation anyway — the modifier a player
 * types matches a name word just as well.
 *
 * Public interface: buildVocabularyIndex, resolvePhrase, publishVocabulary,
 * VocabularyIndex, VocabularySurface.
 *
 * **The index is also published on the wire** (Amendment 1, D11). Chord Writer
 * chunks phrases this package's article-gated extractor never sees, and a chunk
 * is worth nothing until it resolves, so the IDE is handed the naming surface
 * rather than asked to rebuild it. `publishVocabulary` is the one place the
 * in-process `Map`/`Set` index becomes the pure-data shape that can cross.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract; this mirrors the validator, it does not govern it.
 *
 * @packageDocumentation
 * @see ADR-321 D5: Incomplete is a vocabulary check, resolved the way the parser
 *   resolves a player's command
 * @see ADR-093: entity vocabulary and adjective disambiguation
 */

import type { IREntity, StoryIR } from '@sharpee/chord';
import { deriveNameVocabulary } from '@sharpee/world-model';

/** Every naming surface in a story, indexed for resolution. */
export interface VocabularyIndex {
  /** Entity id to the content words it answers to. */
  wordsOf: ReadonlyMap<string, ReadonlySet<string>>;
  /** A whole lowercased name or alias to the entities carrying it. */
  exactForms: ReadonlyMap<string, ReadonlySet<string>>;
  /** A single content word to every entity whose vocabulary holds it. */
  byWord: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * The content words an entity answers to.
 *
 * @param entity the IR entity
 * @returns its name and alias content words, lowercased and deduplicated
 */
export function entityVocabulary(entity: IREntity): Set<string> {
  const words = new Set<string>(deriveNameVocabulary(entity.name));
  for (const alias of entity.aka ?? []) {
    for (const word of deriveNameVocabulary(alias)) words.add(word);
  }
  return words;
}

/**
 * Index every entity's naming surface.
 *
 * The player is left out: the prose never has to name the person reading it,
 * and `you` is the parser's own business.
 *
 * @param ir the story IR
 * @returns the vocabulary index every phrase is resolved against
 */
export function buildVocabularyIndex(ir: StoryIR): VocabularyIndex {
  const wordsOf = new Map<string, ReadonlySet<string>>();
  const exactForms = new Map<string, Set<string>>();
  const byWord = new Map<string, Set<string>>();

  for (const entity of ir.entities) {
    if (entity.isPlayable) continue;

    const words = entityVocabulary(entity);
    wordsOf.set(entity.id, words);

    for (const word of words) {
      const holders = byWord.get(word);
      if (holders === undefined) byWord.set(word, new Set([entity.id]));
      else holders.add(entity.id);
    }
    for (const form of [entity.name, ...(entity.aka ?? [])]) {
      if (typeof form !== 'string' || form.length === 0) continue;
      const key = form.toLowerCase();
      const holders = exactForms.get(key);
      if (holders === undefined) exactForms.set(key, new Set([entity.id]));
      else holders.add(entity.id);
    }
  }
  return { wordsOf, exactForms, byWord };
}

/**
 * The entities a phrase resolves to.
 *
 * Two tiers, as the validator has them: a phrase equalling a whole name or
 * alias resolves there and nowhere else; otherwise every content word of the
 * phrase must appear in one entity's vocabulary, and a word matching nothing
 * disqualifies that entity outright.
 *
 * @param index the story's vocabulary index
 * @param phrase the phrase as written, lowercased
 * @param words the phrase's content words
 * @returns the matching entity ids; empty when the phrase names nothing
 */
export function resolvePhrase(
  index: VocabularyIndex,
  phrase: string,
  words: readonly string[],
): string[] {
  const exact = index.exactForms.get(phrase);
  if (exact !== undefined) return [...exact];
  if (words.length === 0) return [];

  const first = index.byWord.get(words[0]);
  if (first === undefined) return [];

  return [...first].filter((id) => {
    const vocabulary = index.wordsOf.get(id);
    return vocabulary !== undefined && words.every((word) => vocabulary.has(word));
  });
}

/**
 * The naming surface, flattened for the wire (D11a).
 *
 * Both halves of `resolvePhrase`'s two tiers, because publishing only the first
 * would hand the IDE a resolver that disagrees with the analyzer on precisely
 * the phrases exact forms exist to disambiguate. `byWord` is NOT published: it
 * is an inversion of `wordsOf` that any consumer can build in a line, and
 * shipping it would put two copies of the same fact on the wire.
 */
export interface VocabularySurface {
  /** Entity id to the content words it answers to. */
  wordsOf: Record<string, string[]>;
  /** A whole lowercased name or alias to the entities carrying it. */
  exactForms: Record<string, string[]>;
}

/**
 * Flatten a vocabulary index into the surface the IDE resolves against.
 *
 * @param index the in-process index
 * @returns the same facts as pure data — no Map, no Set
 */
export function publishVocabulary(index: VocabularyIndex): VocabularySurface {
  const wordsOf: Record<string, string[]> = {};
  for (const [id, words] of index.wordsOf) wordsOf[id] = [...words];

  const exactForms: Record<string, string[]> = {};
  for (const [form, holders] of index.exactForms) exactForms[form] = [...holders];

  return { wordsOf, exactForms };
}
