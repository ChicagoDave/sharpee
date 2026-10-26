/**
 * vocabulary.ts — resolving a noun phrase the way the parser resolves a
 * player's command.
 *
 * Purpose: the Incomplete view asks one question of every phrase an author
 * wrote — would the parser find something if a player typed this? Answering it
 * with a private matching rule would answer a different question and answer it
 * confidently, so the decision is the platform's one noun matcher, `matchNoun`,
 * the function the parse-time gate and the command validator themselves call.
 * This package only builds each IR entity's naming surface and keeps an index
 * that narrows the entities worth asking about; it decides nothing itself.
 *
 * The vocabulary is `name content words + alias content words + authored
 * adjectives`. The third term is empty for every Chord story by construction:
 * Chord has no adjective syntax, and the modifier a player types matches a
 * name word just as well. The surface carries no entity type: the parser's
 * type fallback (`the room`) is not a name an author wrote, and the view
 * checks prose against names.
 *
 * Public interface: buildVocabularyIndex, resolvePhrase, publishVocabulary,
 * irNamingSurface, entityVocabulary, VocabularyIndex, VocabularySurface.
 *
 * **The index is also published on the wire.** Chord Writer chunks phrases this
 * package's article-gated extractor never sees, and a chunk is worth nothing
 * until it resolves, so the IDE is handed the naming surface rather than asked
 * to rebuild it. `publishVocabulary` is the one place the in-process
 * `Map`/`Set` index becomes the pure-data shape that can cross.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract; this mirrors the validator, it does not govern it.
 *
 * @packageDocumentation
 *
 * References: ADR-385 D1 (one matcher), D10 (world-index calls it); ADR-321 D5
 *   (Incomplete is a vocabulary check, resolved the way the parser resolves a
 *   player's command), D11 (the published surface); ADR-093 (entity
 *   vocabulary and adjective disambiguation).
 */

import { STDLIB_MANIFEST, type IREntity, type StoryIR } from '@sharpee/chord';
import {
  deriveNameVocabulary,
  matchNoun,
  vocabularyOf,
  type NamingSurface,
  type NounMatchTier,
} from '@sharpee/world-model';

/** Every naming surface in a story, indexed for resolution. */
export interface VocabularyIndex {
  /** The story locale's language words, from the manifest (ADR-387 D2). */
  words: NamingSurface['words'];
  /** Entity id to the surface `matchNoun` reads. */
  surfaces: ReadonlyMap<string, NamingSurface>;
  /** Entity id to the content words it answers to. */
  wordsOf: ReadonlyMap<string, ReadonlySet<string>>;
  /** A whole lowercased name or alias to the entities carrying it. */
  exactForms: ReadonlyMap<string, ReadonlySet<string>>;
  /** A single content word to every entity whose vocabulary holds it. */
  byWord: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * An IR entity's naming surface, as `matchNoun` reads it.
 *
 * No observer: the player is never indexed, and the self words are the
 * parser's business. No type: see the file header.
 *
 * @param entity the IR entity
 * @param words the story locale's language words (`localeWordsOf`)
 * @returns its name and aliases as a naming surface
 */
export function irNamingSurface(entity: IREntity, words: NamingSurface['words']): NamingSurface {
  return {
    name: entity.name,
    aliases: (entity.aka ?? []).filter((alias) => typeof alias === 'string' && alias.length > 0),
    adjectives: [],
    isObserver: false,
    words,
  };
}

/**
 * The language words of a story's locale, from the stdlib manifest: the one
 * word table, carried to the IDE as data (ADR-387 D2).
 *
 * @param ir the story
 * @returns the locale's self words and name stopwords
 * @throws Error when the manifest holds no facts for the story's locale
 */
export function localeWordsOf(ir: StoryIR): NamingSurface['words'] {
  const locale = ir.phrases.defaultLocale;
  const facts = STDLIB_MANIFEST.locales[locale];
  if (facts === undefined) {
    throw new Error(`No stdlib manifest facts for locale ${locale}: the language words are unknown`);
  }
  return { selfWords: facts.selfWords, nameStopwords: facts.nameStopwords };
}

/**
 * The content words an entity answers to.
 *
 * @param entity the IR entity
 * @param words the story locale's language words (`localeWordsOf`)
 * @returns its name and alias content words, lowercased and deduplicated
 */
export function entityVocabulary(entity: IREntity, words: NamingSurface['words']): Set<string> {
  return vocabularyOf(irNamingSurface(entity, words));
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
  const languageWords = localeWordsOf(ir);
  const surfaces = new Map<string, NamingSurface>();
  const wordsOf = new Map<string, ReadonlySet<string>>();
  const exactForms = new Map<string, Set<string>>();
  const byWord = new Map<string, Set<string>>();

  for (const entity of ir.entities) {
    if (entity.isPlayable) continue;

    const surface = irNamingSurface(entity, languageWords);
    surfaces.set(entity.id, surface);
    const words = vocabularyOf(surface);
    wordsOf.set(entity.id, words);

    for (const word of words) {
      const holders = byWord.get(word);
      if (holders === undefined) byWord.set(word, new Set([entity.id]));
      else holders.add(entity.id);
    }
    for (const form of [surface.name, ...surface.aliases]) {
      if (form.length === 0) continue;
      const key = form.toLowerCase();
      const holders = exactForms.get(key);
      if (holders === undefined) exactForms.set(key, new Set([entity.id]));
      else holders.add(entity.id);
    }
  }
  return { words: languageWords, surfaces, wordsOf, exactForms, byWord };
}

/** The tier that outranks: exact over words. */
const TIER_RANK: Record<NounMatchTier, number> = { exact: 2, words: 1 };

/**
 * The entities a phrase resolves to.
 *
 * The index narrows the candidates — whoever carries the phrase as a whole
 * name or alias, plus whoever answers to its first content word — and
 * `matchNoun` decides each one. The entities matched at the best tier
 * reached are the answer, so a phrase equal to a whole name or alias
 * resolves there and nowhere else, exactly as the validator ranks it.
 *
 * @param index the story's vocabulary index
 * @param phrase the phrase as written, lowercased, without a leading article
 * @returns the matching entity ids; empty when the phrase names nothing
 */
export function resolvePhrase(index: VocabularyIndex, phrase: string): string[] {
  const words = deriveNameVocabulary(phrase, index.words.nameStopwords);
  const candidates = new Set<string>(index.exactForms.get(phrase) ?? []);
  if (words.length > 0) {
    for (const id of index.byWord.get(words[0]) ?? []) candidates.add(id);
  }

  let best = 0;
  let named: string[] = [];
  for (const id of candidates) {
    const surface = index.surfaces.get(id);
    if (surface === undefined) continue;
    const match = matchNoun(surface, { text: phrase });
    if (match === null) continue;
    const rank = TIER_RANK[match.tier];
    if (rank > best) {
      best = rank;
      named = [id];
    } else if (rank === best) {
      named.push(id);
    }
  }
  return named;
}

/**
 * The naming surface, flattened for the wire (D11a).
 *
 * Both tiers, because publishing only the words would hand the IDE a resolver
 * that disagrees with the analyzer on precisely the phrases exact forms exist
 * to disambiguate. `byWord` is NOT published: it is an inversion of `wordsOf`
 * that any consumer can build in a line, and shipping it would put two copies
 * of the same fact on the wire.
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
