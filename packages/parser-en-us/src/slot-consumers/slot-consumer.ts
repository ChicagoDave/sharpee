/**
 * @file Slot Consumer Interface
 * @description The contract between the grammar engine and the slot consumers
 * (ADR-088). A consumer answers one question: from this token, which spans
 * could this slot take? It returns every extent it admits, longest first, and
 * the engine's search over the pattern decides which one survives; a consumer
 * never reads the next pattern element and never chooses between its own
 * readings (ADR-386 D1, D2).
 *
 * The consumers read the language's words through the context: the list
 * separators, the possessive determiners that mark the actor's own things
 * and the manner adverbs, derived from the provider once per parse by
 * `phraseWordsOf` (ADR-387 D6). No consumer holds a word of its own.
 *
 * Public interface: SlotConsumer, SlotConsumerContext, PhraseWords,
 * phraseWordsOf, DirectionTable, directionTableOf, SlotReadings, SlotRefusal,
 * SlotConsumeResult, isSlotReadings, isSlotRefusal.
 * Owner context: parser-en-us grammar matching.
 */

import {
  SlotType,
  type SlotMatch,
  type CompiledPattern,
  type GrammarContext,
  type SlotConstraint,
  type PatternToken,
  type Token,
  type ParserLanguageProvider
} from '@sharpee/if-domain';
import type { SlotFailure } from '../parse-failure.js';
import type { PronounContextManager } from '../pronoun-context.js';

/**
 * A consumer's refusal with its reason (ADR-385 D8): what the slot found and
 * why it would not take it. The grammar engine records it as the slot's
 * failure, so the player hears "You aren't holding the brass lantern."
 * rather than a bare "I don't understand".
 */
export interface SlotRefusal {
  refused: true;
  failure: Pick<SlotFailure, 'reason' | 'unknownWord' | 'entityId' | 'requiredScope'>;
}

/**
 * The readings of a slot from its start token: every span the consumer
 * admits, each a complete slot match, ordered longest extent first. The
 * engine tries them shorter first when another pattern element follows the
 * slot and longest first when the slot ends the pattern (ADR-386 D2).
 */
export interface SlotReadings {
  readings: SlotMatch[];
}

/** What a consumer returns: its readings, a refusal with its reason, or null (nothing to say). */
export type SlotConsumeResult = SlotReadings | SlotRefusal | null;

/** Whether a result that may be a refusal is one. */
export function isSlotRefusal<T>(result: T | SlotRefusal): result is SlotRefusal {
  return typeof result === 'object' && result !== null && 'refused' in result && result.refused === true;
}

/** Whether a result carries readings. */
export function isSlotReadings(result: SlotConsumeResult): result is SlotReadings {
  return result !== null && 'readings' in result;
}

/**
 * The language's words the slot consumers read, as sets of normalized words
 * (ADR-387 D6). Derived from the provider once per parse, so a narrative
 * voice set after the parser was built is honoured.
 */
export interface PhraseWords {
  /** The words that separate list items: the conjunction and the comma in English. */
  readonly listSeparators: ReadonlySet<string>;
  /**
   * The possessive determiners that mark a phrase as the actor's own: the
   * first person's (the player speaking of their own things) and those of
   * the person the story addresses the actor in.
   */
  readonly actorPossessives: ReadonlySet<string>;
  /** The adverbs a MANNER slot accepts. */
  readonly mannerAdverbs: ReadonlySet<string>;
  /** The direction table as a lookup: each word and abbreviation, normalized, to its canonical direction id (ADR-387 D5). */
  readonly directions: DirectionTable;
}

/** The one direction table as the parser reads it: word or abbreviation → world-model's `Direction` constant. */
export type DirectionTable = ReadonlyMap<string, string>;

/**
 * Derive the direction lookup from the provider's table (ADR-387 D5). The
 * tokenizer's DIRECTION tag registers the same table, so a word is a
 * direction everywhere or nowhere.
 * @param language The provider the parser was constructed with
 * @returns Each word and abbreviation, lower-cased, to its canonical id
 */
export function directionTableOf(language: ParserLanguageProvider): DirectionTable {
  const table = new Map<string, string>();
  for (const entry of language.getDirections()) {
    for (const word of [...entry.words, ...(entry.abbreviations ?? [])]) {
      table.set(word.toLowerCase(), entry.direction);
    }
  }
  return table;
}

/**
 * Derive the consumers' words from the provider.
 * @param language The provider the parser was constructed with
 * @returns The list separators, the actor's possessives, the manner adverbs and the direction lookup
 */
export function phraseWordsOf(language: ParserLanguageProvider): PhraseWords {
  const actorPerson = language.getNarrativePerson();
  const lower = (words: readonly string[]) => new Set(words.map((word) => word.toLowerCase()));
  return {
    listSeparators: lower(language.getListSeparators()),
    actorPossessives: lower(
      language
        .getDeterminers()
        .filter((determiner) => determiner.possessive === 'first' || determiner.possessive === actorPerson)
        .map((determiner) => determiner.word)
    ),
    mannerAdverbs: lower(language.getMannerAdverbs()),
    directions: directionTableOf(language)
  };
}

/**
 * Context passed to slot consumers containing all information needed for consumption
 */
export interface SlotConsumerContext {
  /** The slot name from the pattern */
  slotName: string;
  /** All tokens in the input */
  tokens: Token[];
  /** Index of the token to start consuming from */
  startIndex: number;
  /** The compiled pattern being matched */
  pattern: CompiledPattern;
  /** Index of this slot in the pattern tokens */
  slotTokenIndex: number;
  /** The grammar rule being matched */
  rule: {
    slots: Map<string, SlotConstraint>;
    [key: string]: any;
  };
  /** Grammar context with world, actor, location */
  context: GrammarContext;
  /** The language the parser was constructed with: its numbers, ordinals and words (ADR-387 D1) */
  language: ParserLanguageProvider;
  /** The language's list separators, actor's possessives and manner adverbs, derived for this parse (ADR-387 D6) */
  words: PhraseWords;
  /** The parser's pronoun context: what `it`, `them`, `her` refer to now (ADR-387 D4) */
  pronouns: PronounContextManager;
  /** The slot type being consumed */
  slotType: SlotType;
  /** Constraints for this slot */
  slotConstraints?: SlotConstraint;
  /** The pattern token for this slot */
  patternToken?: PatternToken;
  /** Debug mode flag */
  DEBUG?: boolean;
}

/**
 * Interface for slot consumption strategies
 * Each consumer handles one or more slot types
 */
export interface SlotConsumer {
  /**
   * The slot types this consumer can handle
   */
  readonly slotTypes: SlotType[];

  /**
   * The readings of this slot from the context's start token.
   * @param ctx The consumption context
   * @returns The readings, longest extent first; a SlotRefusal when the slot
   *   refused for a reason worth telling the player; null when there is nothing to read
   */
  consume(ctx: SlotConsumerContext): SlotConsumeResult;
}
