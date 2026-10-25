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
 * - exact: the whole phrase equals the name, an alias or the type, tried
 *   first with the leading articles restored (so "The Grail" survives),
 *   then as given, then article-stripped;
 * - words: every content word of the phrase is in the vocabulary (name
 *   words, alias words, adjectives);
 * - any content word found nowhere matches nothing.
 *
 * `matchNoun` reads a naming surface, never an entity. `namingSurfaceOf`
 * builds the surface from the world, and is the only code that knows walls
 * have per-side adjectives or who the observer is.
 *
 * Public interface: `matchNoun`, `namingSurfaceOf`, `vocabularyOf`, `NamingSurface`,
 * `NounQuery`, `NounMatch`, `NounMatchTier`.
 * Owner context: world-model identity area (naming).
 *
 * References: ADR-385 D1 (one matcher), ADR-231 D3 and PIN 2 (the tiers),
 * ADR-173 (per-side wall adjectives), ADR-327 (the self words name the
 * player role).
 */

import type { EntityId } from '@sharpee/core';
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
  /** The entity type, matched only as a whole phrase. */
  readonly type?: string;
  /** True when the self words ("me", "myself") name this entity. */
  readonly isObserver: boolean;
}

/** A noun phrase as the matcher reads it. An `INounPhrase` is one. */
export interface NounQuery {
  /** The phrase as parsed (leading articles split off). */
  readonly text: string;
  /** The leading articles the parser split off, for the article-first exact try. */
  readonly articles?: readonly string[];
}

/** The tier a match reached: exact outranks words. */
export type NounMatchTier = 'exact' | 'words';

/** How well a phrase names a surface. More matched words wins within a tier. */
export interface NounMatch {
  readonly tier: NounMatchTier;
  readonly wordsMatched: number;
}

/**
 * The words that name the observer, whatever the observer is called.
 * English, held here until the language owns its word lists (parser review step 7).
 */
const SELF_WORDS: ReadonlySet<string> = new Set(['me', 'myself', 'self', 'yourself']);

/**
 * Leading articles stripped for the last exact try and the words tier.
 * English, held here until the parser is the only place articles are split
 * (ADR-385 D2) and the language owns the list (step 7).
 */
const ARTICLES: ReadonlySet<string> = new Set(['the', 'a', 'an']);

/** Strip leading articles, always keeping at least one word. */
function stripLeadingArticles(text: string): string {
  const words = text.split(/\s+/);
  let start = 0;
  while (start < words.length - 1 && ARTICLES.has(words[start])) {
    start++;
  }
  return words.slice(start).join(' ');
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
  const stripped = stripLeadingArticles(rawText);
  if (!queries.includes(stripped)) {
    queries.push(stripped);
  }

  if (surface.isObserver && SELF_WORDS.has(stripped)) {
    return { tier: 'exact', wordsMatched: 1 };
  }

  const name = surface.name.toLowerCase();
  const wholeNames = [...surface.aliases, ...(surface.type ? [surface.type] : [])].map((s) => s.toLowerCase());
  for (const q of queries) {
    if (name === q || wholeNames.includes(q)) {
      return { tier: 'exact', wordsMatched: Math.max(1, deriveNameVocabulary(q).length) };
    }
  }

  const queryWords = deriveNameVocabulary(stripped);
  if (queryWords.length === 0) {
    return null;
  }
  const vocabulary = vocabularyOf(surface);
  if (!queryWords.every((word) => vocabulary.has(word))) {
    return null;
  }
  return { tier: 'words', wordsMatched: queryWords.length };
}

/**
 * The words a surface answers to at the words tier: name content words,
 * alias content words and adjectives, lowercased. Derived on demand, never
 * stored, so a rename cannot leave stale vocabulary.
 *
 * @param surface the entity's naming
 * @returns the vocabulary set
 */
export function vocabularyOf(surface: NamingSurface): Set<string> {
  const vocabulary = new Set<string>(deriveNameVocabulary(surface.name));
  for (const alias of surface.aliases) {
    for (const word of deriveNameVocabulary(alias)) {
      vocabulary.add(word);
    }
  }
  for (const adjective of surface.adjectives) {
    vocabulary.add(adjective.toLowerCase());
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
 */
export function namingSurfaceOf(world: WorldModel, entity: IFEntity, observerId: EntityId): NamingSurface {
  const identity = entity.getTrait(IdentityTrait);
  const name = typeof entity.name === 'string' ? entity.name : entity.type || entity.id;
  return {
    name,
    aliases: identity?.aliases ? [...identity.aliases] : [],
    adjectives: adjectivesOf(world, entity, observerId, identity),
    type: entity.type || undefined,
    isObserver: entity.id === observerId
  };
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
