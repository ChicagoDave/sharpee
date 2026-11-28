// packages/world-model/src/traits/identity/noun-match.ts

/**
 * The one noun matcher.
 *
 * Purpose: decide whether a noun phrase names an entity, and how well. Every
 * reader that asks "which entities does this phrase name" calls `matchNoun`,
 * so the parse-time gate, the validator, list expansion and the IDE's
 * Incomplete view cannot disagree.
 *
 * The tiers, in order:
 * - the self words name the observer, at the exact tier;
 * - exact: the whole phrase equals the name, an alias, a written form or the
 *   type, tried first with the leading articles restored (so "The Grail"
 *   survives), then as given;
 * - words: every content word of the phrase is in the vocabulary (name
 *   words, alias words, adjectives, written-form words, worked-out-form
 *   words);
 * - any content word found nowhere matches nothing.
 *
 * Forms (ADR-409 D3, D4): the name's other number and the aka words' other
 * numbers sit on the surface as the compiler or the author gave them; the
 * matcher works nothing out. A written form answers as an alias does. A
 * worked-out form answers at the words tier only, and the match counts the
 * words only a worked-out form supplied (`workedOutWords`), so a reader can
 * rank a fully written match above it.
 *
 * `matchNoun` reads a naming surface, never an entity. `namingSurfaceOf`
 * builds the surface from the world, and is the only code that knows walls
 * have per-side adjectives or who the observer is.
 *
 * Public interface: `matchNoun`, `namingSurfaceOf`, `namingFormsOf`, `vocabularyOf`,
 * `NamingSurface`, `NamingFormsSource`, `NounQuery`, `NounMatch`, `NounMatchTier`.
 * Owner context: world-model identity area (naming).
 *
 * The self words and the name stopwords are the language's: the surface
 * carries the world's language words, assigned at install, and this module
 * holds no English.
 *
 * References: ADR-385 D1 (one matcher), ADR-231 D3 and PIN 2 (the tiers),
 * ADR-173 (per-side wall adjectives), ADR-327 (the self words name the
 * player role), ADR-387 D2 (the words come from the world), ADR-409 D3, D4
 * (written and worked-out forms).
 */

import type { EntityId } from '@sharpee/core';
import type { LanguageWords } from '@sharpee/if-domain';
import type { IFEntity } from '../../entities/if-entity.js';
import { WallEntity } from '../../entities/wall-entity.js';
import type { WorldModel } from '../../world/WorldModel.js';
import { IdentityTrait } from './identityTrait.js';
import { deriveNameVocabulary } from './name-vocabulary.js';

/** What a noun phrase is matched against: an entity's naming, as data. */
export interface NamingSurface {
  /** The display name. */
  readonly name: string;
  /** Whole alternative names. Their words join the vocabulary. */
  readonly aliases: readonly string[];
  /** Authored adjectives. They join the vocabulary. */
  readonly adjectives: readonly string[];
  /** The name's other number as the author wrote it: whole at the exact tier, its words at the words tier (ADR-409 D3). */
  readonly writtenForms: readonly string[];
  /** Other numbers a locale rule worked out, of the name and of aka words: words tier only (ADR-409 D3, D4). */
  readonly workedOutForms: readonly string[];
  /** The entity type, matched only as a whole phrase. */
  readonly type?: string;
  /** True when the self words name this entity. */
  readonly isObserver: boolean;
  /** The language's self words and name stopwords, from the world this surface was built from. */
  readonly words: LanguageWords;
}

/**
 * A noun phrase as the matcher reads it. An `INounPhrase` is one. The
 * English parser has already split the leading articles and determiners off
 * `text` (ADR-385 D2); the matcher strips nothing itself.
 */
export interface NounQuery {
  /** The phrase's content words (leading articles and determiners split off). */
  readonly text: string;
  /** The leading articles the parser split off, for the article-first exact try. */
  readonly articles?: readonly string[];
}

/** The tier a match reached: exact outranks words. */
export type NounMatchTier = 'exact' | 'words';

/**
 * How well a phrase names a surface. More matched words wins within a tier;
 * a match with no worked-out word outranks one that needs one (ADR-409 D4).
 */
export interface NounMatch {
  readonly tier: NounMatchTier;
  readonly wordsMatched: number;
  /** Content words only a worked-out form supplied: 0 at the exact tier, never more than `wordsMatched`. */
  readonly workedOutWords: number;
}

/**
 * Match a noun phrase against a naming surface.
 *
 * @param surface the entity's naming, from `namingSurfaceOf`
 * @param query the phrase, with any leading articles the parser split off
 * @returns the tier and the matched-word count, or null when the phrase does
 *   not name the surface
 */
export function matchNoun(surface: NamingSurface, query: NounQuery): NounMatch | null {
  const rawText = query.text?.toLowerCase().trim() || '';
  if (!rawText) {
    return null;
  }

  const articles = (query.articles || []).map((a) => a.toLowerCase());
  const queries: string[] = [];
  if (articles.length > 0) {
    queries.push(`${articles.join(' ')} ${rawText}`);
  }
  queries.push(rawText);

  if (surface.isObserver && surface.words.selfWords.includes(rawText)) {
    return { tier: 'exact', wordsMatched: 1, workedOutWords: 0 };
  }

  const name = surface.name.toLowerCase();
  const wholeNames = [...surface.aliases, ...surface.writtenForms, ...(surface.type ? [surface.type] : [])].map((s) =>
    s.toLowerCase()
  );
  for (const q of queries) {
    if (name === q || wholeNames.includes(q)) {
      return {
        tier: 'exact',
        wordsMatched: Math.max(1, deriveNameVocabulary(q, surface.words.nameStopwords).length),
        workedOutWords: 0
      };
    }
  }

  const queryWords = deriveNameVocabulary(rawText, surface.words.nameStopwords);
  if (queryWords.length === 0) {
    return null;
  }
  const written = writtenVocabularyOf(surface);
  const workedOut = workedOutVocabularyOf(surface);
  let workedOutWords = 0;
  for (const word of queryWords) {
    if (written.has(word)) continue;
    if (!workedOut.has(word)) return null;
    workedOutWords++;
  }
  return { tier: 'words', wordsMatched: queryWords.length, workedOutWords };
}

/**
 * The words a surface answers to at the words tier: name content words,
 * alias content words, adjectives, and the content words of its written and
 * worked-out forms, lowercased. Derived on demand, never stored, so a rename
 * cannot leave stale vocabulary.
 *
 * @param surface the entity's naming
 * @returns the vocabulary set
 */
export function vocabularyOf(surface: NamingSurface): Set<string> {
  const vocabulary = writtenVocabularyOf(surface);
  for (const word of workedOutVocabularyOf(surface)) {
    vocabulary.add(word);
  }
  return vocabulary;
}

/** The words the author wrote: name, aliases, adjectives and written forms. */
function writtenVocabularyOf(surface: NamingSurface): Set<string> {
  const stopwords = surface.words.nameStopwords;
  const vocabulary = new Set<string>(deriveNameVocabulary(surface.name, stopwords));
  for (const phrase of [...surface.aliases, ...surface.writtenForms]) {
    for (const word of deriveNameVocabulary(phrase, stopwords)) {
      vocabulary.add(word);
    }
  }
  for (const adjective of surface.adjectives) {
    vocabulary.add(adjective.toLowerCase());
  }
  return vocabulary;
}

/** The words a locale rule worked out, from the worked-out forms. */
function workedOutVocabularyOf(surface: NamingSurface): Set<string> {
  const vocabulary = new Set<string>();
  for (const phrase of surface.workedOutForms) {
    for (const word of deriveNameVocabulary(phrase, surface.words.nameStopwords)) {
      vocabulary.add(word);
    }
  }
  return vocabulary;
}

/**
 * Build an entity's naming surface as the observer sees it.
 *
 * A wall's adjectives are those of the side facing the observer's room, and
 * none when the observer is in neither of its rooms (ADR-173). Every other
 * entity's come from its identity trait.
 *
 * @param world the world the entity lives in
 * @param entity the entity to name
 * @param observerId the entity doing the naming (the player, or an actor)
 * @returns the surface `matchNoun` reads, derived from the current state
 * @throws Error when the world was never given its language words
 *   (`WorldModel.getLanguageWords`)
 */
export function namingSurfaceOf(world: WorldModel, entity: IFEntity, observerId: EntityId): NamingSurface {
  const words = world.getLanguageWords();
  const identity = entity.getTrait(IdentityTrait);
  const name = typeof entity.name === 'string' ? entity.name : entity.type || entity.id;
  return {
    name,
    aliases: identity?.aliases ? [...identity.aliases] : [],
    adjectives: adjectivesOf(world, entity, observerId, identity),
    ...namingFormsOf({
      name,
      singular: identity?.singular,
      plural: identity?.plural,
      origin: identity?.nameFormOrigin,
      akaForms: identity?.akaForms
    }),
    type: entity.type || undefined,
    isObserver: entity.id === observerId,
    words
  };
}

/** An entity's forms as the trait or the IR carries them (ADR-409 D3, D8). */
export interface NamingFormsSource {
  /** The name, which is one of the two forms when both are given. */
  readonly name: string;
  readonly singular?: string;
  readonly plural?: string;
  /** Where the form that is not the name came from; absent means written. */
  readonly origin?: 'written' | 'worked-out';
  /** Worked-out other forms of aka words. */
  readonly akaForms?: readonly { readonly word: string; readonly form: string }[];
}

/**
 * Sort an entity's forms onto the surface (ADR-409 D3): the name's other
 * form goes to `writtenForms` or `workedOutForms` by its origin, and every
 * aka form is worked out. A form equal to the name adds nothing. The one
 * place the trait's and the IR's forms become surface fields, so the
 * runtime and world-index cannot sort them differently.
 *
 * @param source the name and its forms
 * @returns the surface's form fields
 */
export function namingFormsOf(source: NamingFormsSource): Pick<NamingSurface, 'writtenForms' | 'workedOutForms'> {
  const name = source.name.toLowerCase();
  const others = [source.singular, source.plural].filter(
    (form, index, all): form is string =>
      typeof form === 'string' && form.length > 0 && form.toLowerCase() !== name && all.indexOf(form) === index
  );
  const akaForms = (source.akaForms ?? []).map((entry) => entry.form).filter((form) => form.length > 0);
  return source.origin === 'worked-out'
    ? { writtenForms: [], workedOutForms: [...others, ...akaForms] }
    : { writtenForms: others, workedOutForms: akaForms };
}

/** The adjectives an entity answers to from where the observer stands. */
function adjectivesOf(
  world: WorldModel,
  entity: IFEntity,
  observerId: EntityId,
  identity: IdentityTrait | undefined
): string[] {
  if (entity instanceof WallEntity) {
    const room = world.getLocation(observerId);
    if (room && (room === entity.between[0] || room === entity.between[1])) {
      const adjective = entity.getSide(room)?.adjective;
      return adjective ? [adjective] : [];
    }
    return [];
  }
  return identity?.adjectives ? [...identity.adjectives] : [];
}
