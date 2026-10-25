/**
 * @file Slot Consumer Interface
 * @description The contract between the grammar engine and the slot consumers
 * (ADR-088). A consumer answers one question: from this token, which spans
 * could this slot take? It returns every extent it admits, longest first, and
 * the engine's search over the pattern decides which one survives; a consumer
 * never reads the next pattern element and never chooses between its own
 * readings (ADR-386 D1, D2).
 *
 * Public interface: SlotConsumer, SlotConsumerContext, SlotReadings,
 * SlotRefusal, SlotConsumeResult, isSlotReadings, isSlotRefusal.
 * Owner context: parser-en-us grammar matching.
 */

import {
  SlotType,
  type SlotMatch,
  type CompiledPattern,
  type GrammarContext,
  type SlotConstraint,
  type PatternToken
} from '@sharpee/if-domain';
import { type Token } from '@sharpee/if-domain';
import type { SlotFailure } from '../parse-failure.js';

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
