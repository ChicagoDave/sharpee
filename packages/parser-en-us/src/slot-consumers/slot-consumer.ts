/**
 * @file Slot Consumer Interface
 * @description Interface for slot consumption strategies (ADR-088)
 */

import {
  SlotType,
  SlotMatch,
  CompiledPattern,
  GrammarContext,
  SlotConstraint,
  PatternToken
} from '@sharpee/if-domain';
import { Token } from '@sharpee/if-domain';

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
   * Attempt to consume tokens for this slot
   * @param ctx The consumption context
   * @returns SlotMatch if successful, null if no match
   */
  consume(ctx: SlotConsumerContext): SlotMatch | null;
}

/**
 * Helper to get the next pattern token after the current slot
 */
export function getNextPatternToken(ctx: SlotConsumerContext): PatternToken | undefined {
  return ctx.pattern.tokens[ctx.slotTokenIndex + 1];
}

/**
 * Helper to check if a token matches a pattern delimiter
 */
export function isPatternDelimiter(
  token: Token,
  nextPatternToken: PatternToken | undefined
): boolean {
  if (!nextPatternToken) return false;

  if (nextPatternToken.type === 'literal' &&
      token.normalized === nextPatternToken.value) {
    return true;
  }

  if (nextPatternToken.type === 'alternates' &&
      nextPatternToken.alternates!.includes(token.normalized)) {
    return true;
  }

  return false;
}
