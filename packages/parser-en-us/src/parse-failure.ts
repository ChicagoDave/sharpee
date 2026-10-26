/**
 * @file Parse Failure Tracking
 * @description Types and utilities for tracking partial match failures to
 * provide better error messages: the failure record the engine fills, the
 * one ranking of failures (verb matched, progress, then the grammar rank
 * with the consumed items' nouns), the failure-versus-reading rule (ADR-386
 * D5) and the error each kind of failure becomes.
 *
 * Public interface: PartialMatchFailure, SlotFailure, MatchFailureReason,
 * RequiredScope, bestFailure, failureOutranking, analyzeBestFailure.
 * Owner context: parser-en-us error reporting (the English parser is the caller).
 */

import type { ParseErrorCode } from '@sharpee/world-model';
import { compareGrammarRank, type GrammarTier, type NounRank, type PatternElement, type Seat, type SlotMatch } from '@sharpee/if-domain';

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

/** The scope base a constrained slot required, as the language words it (ADR-385 D8). */
export type RequiredScope = 'carried' | 'touchable' | 'visible';

/**
 * Detailed slot failure information (ADR-385 D8): what the slot refused and why.
 */
export interface SlotFailure {
  /** Slot name (e.g., 'target', 'container') */
  slotName: string;

  /** Tokens that were tried for this slot */
  attemptedText: string;

  /**
   * Why the slot failed: NO_MATCH when the phrase names nothing the actor can
   * see; SCOPE_VIOLATION when it names something in view that the slot's base
   * does not admit.
   */
  reason: 'NO_MATCH' | 'SCOPE_VIOLATION';

  /** For NO_MATCH: the phrase's content words (its articles and determiners split off), never its first token */
  unknownWord?: string;

  /** For SCOPE_VIOLATION: the entity the matcher found in view */
  entityId?: string;

  /** For SCOPE_VIOLATION: the base the slot required */
  requiredScope?: RequiredScope;
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

  /** Input words the rule's literals consumed before it failed (its rank's specificity) */
  literalSpecificity: number;

  /** The rule's tier (its rank's second key) */
  tier: GrammarTier;

  /** The rule's position in registration order (its rank's last rule key) */
  definitionIndex: number;

  /** How the items the furthest path had consumed resolve (ADR-386 D4, D5): the rank's noun keys */
  nounRank: NounRank;

  /** Why the match failed */
  reason: MatchFailureReason;

  /**
   * The verb phrase so far, when the rule's first literal matched: the
   * words its literals before the first slot consumed (ADR-383 D7) —
   * `pick up` for `pick up :item`, never only the first word.
   */
  matchedVerb?: string;

  /** If a slot failed, details about that failure */
  slotFailure?: SlotFailure;

  /** The slots the furthest path had filled before it failed (ADR-386 D2), for ranking failures by their nouns (D5) */
  slots?: Map<string, SlotMatch>;

  /** The token that caused the mismatch (if applicable) */
  failedAtToken?: string;

  /** The pattern element expected at the failure point (ADR-382 D4) */
  expected?: PatternElement;

  /**
   * The seats of the required entity slots at and after the failure point:
   * the objects the input left out when it ran out there (ADR-383 D8)
   */
  missingSeats?: Seat[];

  /** The first slot after the expected element, read from the compiled pattern */
  followingSlot?: string;
}

/**
 * The failure worth reporting, from a set. A failure that recognized the
 * verb carries the real information; among those, most progress wins.
 * Without this, a pattern that consumed NOTHING and stopped on "leftover"
 * tokens (progress 0.9 by construction) outranks `drop :item`'s
 * not-enough-tokens (0.5) for a bare `drop`, and the player gets "I don't
 * understand" instead of "What do you want to drop?" (GH #318). Failures
 * equal on both are ranked as readings are (ADR-384 D4), the consumed items'
 * noun rank included (ADR-386 D5).
 * @param failures The failures of one parse
 * @returns The best failure, or undefined when there is none
 */
export function bestFailure(failures: readonly PartialMatchFailure[]): PartialMatchFailure | undefined {
  if (failures.length === 0) return undefined;
  return [...failures].sort(
    (a, b) =>
      (Number(Boolean(b.matchedVerb)) - Number(Boolean(a.matchedVerb))) ||
      (b.progress - a.progress) ||
      compareGrammarRank(a, b),
  )[0];
}

/**
 * The failure-versus-reading rule (ADR-386 D5): the best verb-matched
 * failure wins over the best complete reading only when the reading has an
 * item naming nothing and the failure names strictly more distinct entities
 * than the reading does. `unlock door with` then asks for the key (the
 * reading took `door with`, naming nothing; the failure consumed the door),
 * `take widget` still reaches the validator (no failure names more), and a
 * reading with nothing unresolved — a literal line such as `cut myself`,
 * whose words a slotted rule's failure also consumed as a name — is never
 * outranked.
 * @param failures The failures of the parse
 * @param reading The noun rank of the best reading
 * @returns The failure that outranks the reading, or undefined when the reading stands
 */
export function failureOutranking(failures: readonly PartialMatchFailure[], reading: NounRank): PartialMatchFailure | undefined {
  if (reading.unnamed === 0) return undefined;
  const best = bestFailure(failures.filter((failure) => Boolean(failure.matchedVerb)));
  return best && best.nounRank.named > reading.named ? best : undefined;
}

/**
 * Analyze partial match failures to determine the best error to report
 */
export function analyzeBestFailure(
  failures: PartialMatchFailure[],
  input: string,
  hasVerb: boolean
): { code: ParseErrorCode; messageId: string; context: Record<string, any> } {
  const best = bestFailure(failures);
  if (!best) {
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
      // The language words the violation by the base the slot required and
      // names the entity found (ADR-385 D8); the engine binds the entity
      return {
        code: 'SCOPE_VIOLATION',
        messageId: `parser.error.scopeViolation.${sf.requiredScope ?? 'visible'}`,
        context: {
          verb: best.matchedVerb,
          noun: sf.attemptedText,
          slot: sf.slotName,
          entityId: sf.entityId,
          requiredScope: sf.requiredScope ?? 'visible'
        }
      };
    }
  }

  // If verb matched but we ran out of tokens (missing object)
  if (best.matchedVerb && best.reason === 'NOT_ENOUGH_TOKENS') {
    // The seats of the slots the input left out say which object is missing
    // (ADR-383 D8): the direct object whenever its slot is among them, so
    // `give` alone asks what to give against `give :recipient :item` too.
    if (best.missingSeats?.includes('direct')) {
      return {
        code: 'MISSING_OBJECT',
        messageId: 'parser.error.missingObject',
        context: { verb: best.matchedVerb }
      };
    }
    // Ran out at an indirect slot, or at a typed slot (instrument, topic,
    // text), which has no seat and is asked about by name.
    if (best.expected?.kind === 'slot') {
      return {
        code: 'MISSING_INDIRECT',
        messageId: 'parser.error.missingIndirect',
        context: {
          verb: best.matchedVerb,
          slot: best.expected.name
        }
      };
    }
    // Ran out at a literal (a preposition) after the verb and an object —
    // `put pear` against `put :item in :container`: the indirect object is
    // what is missing (GH #318). The slot it introduces names the question.
    if (best.expected && best.tokensConsumed >= 2) {
      return {
        code: 'MISSING_INDIRECT',
        messageId: 'parser.error.missingIndirect',
        context: {
          verb: best.matchedVerb,
          slot: best.followingSlot,
          preposition: best.expected.kind === 'word' ? best.expected.word : best.expected.words.join('/')
        }
      };
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
