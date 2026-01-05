/**
 * @file Parse Failure Tracking
 * @description Types and utilities for tracking partial match failures
 *              to provide better error messages (Phase 1.2 of parser recommendations)
 */

import type { ParseErrorCode } from '@sharpee/world-model';

/**
 * Reason why a pattern match failed
 */
export type MatchFailureReason =
  | 'NO_TOKENS'           // Empty input
  | 'VERB_MISMATCH'       // First token doesn't match pattern verb
  | 'LITERAL_MISMATCH'    // Required literal doesn't match
  | 'SLOT_FAILED'         // Required slot couldn't be filled
  | 'LEFTOVER_TOKENS'     // Pattern consumed but tokens remain
  | 'NOT_ENOUGH_TOKENS';  // Not enough tokens for pattern

/**
 * Detailed slot failure information
 */
export interface SlotFailure {
  /** Slot name (e.g., 'target', 'container') */
  slotName: string;

  /** Tokens that were tried for this slot */
  attemptedText: string;

  /** Why the slot failed */
  reason: 'NO_MATCH' | 'SCOPE_VIOLATION' | 'AMBIGUOUS';

  /** For NO_MATCH: the word(s) that couldn't be resolved */
  unknownWord?: string;

  /** For SCOPE_VIOLATION: entities found but out of scope */
  outOfScopeEntities?: string[];

  /** For AMBIGUOUS: multiple matches found */
  candidates?: string[];
}

/**
 * Information about a partial pattern match failure
 */
export interface PartialMatchFailure {
  /** The pattern that was attempted */
  pattern: string;

  /** The action this pattern maps to */
  action: string;

  /** How far into the pattern we got (0-1, higher = more matched) */
  progress: number;

  /** Number of tokens consumed before failure */
  tokensConsumed: number;

  /** Why the match failed */
  reason: MatchFailureReason;

  /** If verb was recognized, what was it */
  matchedVerb?: string;

  /** If a slot failed, details about that failure */
  slotFailure?: SlotFailure;

  /** The token that caused the mismatch (if applicable) */
  failedAtToken?: string;

  /** What was expected at the failure point */
  expected?: string;
}

/**
 * Analyze partial match failures to determine the best error to report
 */
export function analyzeBestFailure(
  failures: PartialMatchFailure[],
  input: string,
  hasVerb: boolean
): { code: ParseErrorCode; messageId: string; context: Record<string, any> } {
  if (failures.length === 0) {
    // No patterns even tried
    if (!input.trim()) {
      return {
        code: 'NO_VERB',
        messageId: 'parser.error.noInput',
        context: {}
      };
    }
    return {
      code: 'UNKNOWN_VERB',
      messageId: 'parser.error.unknownVerb',
      context: { verb: input.split(/\s+/)[0] }
    };
  }

  // Sort by progress descending - most progress = best failure info
  const sorted = [...failures].sort((a, b) => b.progress - a.progress);
  const best = sorted[0];

  // If best failure has verb matched and slot failure, we have good info
  if (best.matchedVerb && best.slotFailure) {
    const sf = best.slotFailure;

    if (sf.reason === 'NO_MATCH') {
      return {
        code: 'ENTITY_NOT_FOUND',
        messageId: 'parser.error.entityNotFound',
        context: {
          verb: best.matchedVerb,
          noun: sf.unknownWord || sf.attemptedText,
          slot: sf.slotName
        }
      };
    }

    if (sf.reason === 'SCOPE_VIOLATION') {
      return {
        code: 'SCOPE_VIOLATION',
        messageId: 'parser.error.scopeViolation',
        context: {
          verb: best.matchedVerb,
          noun: sf.attemptedText,
          slot: sf.slotName
        }
      };
    }

    if (sf.reason === 'AMBIGUOUS') {
      return {
        code: 'AMBIGUOUS_INPUT',
        messageId: 'parser.error.ambiguous',
        context: {
          verb: best.matchedVerb,
          noun: sf.attemptedText,
          candidates: sf.candidates
        }
      };
    }
  }

  // If verb matched but we ran out of tokens (missing object)
  if (best.matchedVerb && best.reason === 'NOT_ENOUGH_TOKENS') {
    // Check if it was looking for a slot
    if (best.expected?.startsWith(':')) {
      const slotName = best.expected.slice(1);
      // Determine if it's direct or indirect object
      if (slotName === 'target' || slotName === 'item' || slotName === 'object') {
        return {
          code: 'MISSING_OBJECT',
          messageId: 'parser.error.missingObject',
          context: { verb: best.matchedVerb }
        };
      } else {
        return {
          code: 'MISSING_INDIRECT',
          messageId: 'parser.error.missingIndirect',
          context: {
            verb: best.matchedVerb,
            slot: slotName
          }
        };
      }
    }
    return {
      code: 'MISSING_OBJECT',
      messageId: 'parser.error.missingObject',
      context: { verb: best.matchedVerb }
    };
  }

  // Verb matched but slot failed without details (generic slot failure)
  if (best.matchedVerb && best.reason === 'SLOT_FAILED') {
    return {
      code: 'MISSING_OBJECT',
      messageId: 'parser.error.missingObject',
      context: { verb: best.matchedVerb }
    };
  }

  // If first token matched verb patterns but all failed
  if (best.matchedVerb && best.reason === 'LEFTOVER_TOKENS') {
    return {
      code: 'INVALID_SYNTAX',
      messageId: 'parser.error.invalidSyntax',
      context: {
        verb: best.matchedVerb,
        extraWords: best.failedAtToken
      }
    };
  }

  // No verb matched at all - unknown verb
  if (!hasVerb) {
    return {
      code: 'UNKNOWN_VERB',
      messageId: 'parser.error.unknownVerb',
      context: { verb: input.split(/\s+/)[0] }
    };
  }

  // Fallback
  return {
    code: 'INVALID_SYNTAX',
    messageId: 'parser.error.invalidSyntax',
    context: {}
  };
}
