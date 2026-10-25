/**
 * @file English Grammar Engine
 * @description English-specific implementation of grammar matching
 */

import {
  GrammarEngine,
  type GrammarContext,
  type PatternMatch,
  type MatchedElement,
  type GrammarMatchOptions,
  type PatternToken,
  type PatternElement,
  type CompiledPattern,
  SlotType,
  type SlotMatch,
  type Seat,
  compareGrammarRank
} from '@sharpee/if-domain';
import { type Token } from '@sharpee/if-domain';
import { EnglishPatternCompiler } from './english-pattern-compiler.js';
import { cardinalNumbers, ordinalNumbers, directionMap, englishWords } from '@sharpee/lang-en-us';
import { SlotConsumerRegistry, SlotConsumerContext, createDefaultRegistry } from './slot-consumers/index.js';
import type { PartialMatchFailure, SlotFailure } from './parse-failure.js';

/**
 * English articles. A pattern's literal article after its verb is optional
 * for the player and its absence costs nothing: `follow cables` matches
 * `follow the cables` exactly as well as the full form does (ADR-380 D2).
 * Articles are the English parser's to know; no language-neutral layer
 * lists them.
 */
const ARTICLE_WORDS: ReadonlySet<string> = new Set(englishWords.articles.map((a) => a.toLowerCase()));

/**
 * What a failure stopped short of, read from the compiled pattern
 * (ADR-382 D4): the element at `index`, the seats of the required entity
 * slots from it on — the objects input that ran out there is missing
 * (ADR-383 D8) — and the first slot after it, the slot a missing
 * preposition would have introduced.
 * @param pattern The rule's compiled pattern
 * @param index The token index the match failed at
 * @returns The expected element, the missing seats and the following slot, each absent when there is none
 */
function expectationAt(pattern: CompiledPattern, index: number): { expected?: PatternElement; missingSeats?: Seat[]; followingSlot?: string } {
  const token = pattern.tokens[index];
  if (!token) return {};
  const optional = token.optional ? { optional: true } : {};
  const expected: PatternElement =
    token.type === 'slot'
      ? { kind: 'slot', name: token.value, ...optional }
      : token.type === 'alternates'
        ? { kind: 'alt', words: token.alternates ?? [token.value], ...optional }
        : { kind: 'word', word: token.value, ...optional };
  const missingSeats = pattern.slots.flatMap((slot) => (slot.tokenIndex >= index && !slot.optional && slot.seat ? [slot.seat] : []));
  const followingSlot = pattern.slots.find((slot) => slot.tokenIndex > index)?.name;
  return {
    expected,
    ...(missingSeats.length > 0 ? { missingSeats } : {}),
    ...(followingSlot !== undefined ? { followingSlot } : {}),
  };
}

/**
 * Result of attempting to match a rule - either success or failure with info
 */
type MatchAttemptResult =
  | { success: true; match: PatternMatch }
  | { success: false; failure: Omit<PartialMatchFailure, 'tier' | 'definitionIndex'> };

/**
 * English-specific grammar matching engine
 */
export class EnglishGrammarEngine extends GrammarEngine {
  private slotConsumerRegistry: SlotConsumerRegistry;

  /** Last set of partial match failures (for error reporting) */
  private lastFailures: PartialMatchFailure[] = [];

  constructor(slotConsumerRegistry?: SlotConsumerRegistry) {
    super(new EnglishPatternCompiler());
    // Use provided registry or create default with all consumers
    this.slotConsumerRegistry = slotConsumerRegistry || createDefaultRegistry();
  }

  /**
   * Get the last set of partial match failures (for error reporting)
   */
  getLastFailures(): PartialMatchFailure[] {
    return this.lastFailures;
  }

  /**
   * Find matching grammar rules for tokens
   */
  findMatches(
    tokens: Token[],
    context: GrammarContext,
    options: GrammarMatchOptions = {}
  ): PatternMatch[] {
    const ranked: Array<{ match: PatternMatch; definitionIndex: number }> = [];
    const failures: PartialMatchFailure[] = [];

    // Every rule is tried, in registration (definition) order, and every
    // match is ranked: no cap, so the most specific rule is never cut off.
    this.rules.forEach((rule, definitionIndex) => {
      if (!rule.compiledPattern) return;
      // ADR-378 D5: a gated-off rule is not there — neither a match nor a
      // failure, so the input falls through to the rules that remain.
      if (rule.when && !rule.when(context)) return;

      const result = this.tryMatchRuleWithFailure(rule, tokens, context);

      if (result.success) {
        ranked.push({ match: result.match, definitionIndex });
      } else {
        // Collect failures for error reporting, ranked like matches
        failures.push({ ...result.failure, tier: rule.tier, definitionIndex });
      }
    });

    // Store failures for later retrieval
    this.lastFailures = failures;

    // Literal specificity, then tier, then definition order: the one
    // ordering of grammar rules.
    ranked.sort((a, b) =>
      compareGrammarRank(
        { literalSpecificity: a.match.literalSpecificity ?? 0, tier: a.match.rule.tier, definitionIndex: a.definitionIndex },
        { literalSpecificity: b.match.literalSpecificity ?? 0, tier: b.match.rule.tier, definitionIndex: b.definitionIndex }
      )
    );

    return ranked.map((entry) => entry.match);
  }
  
  /**
   * Try to match a single rule against tokens, returning failure info if no match
   */
  private tryMatchRuleWithFailure(
    rule: any, // GrammarRule
    tokens: Token[],
    context: GrammarContext
  ): MatchAttemptResult {
    const pattern = rule.compiledPattern!;
    const DEBUG = process.env.PARSER_DEBUG === 'true';
    const totalPatternTokens = pattern.tokens.length;

    // Quick check: do we have enough tokens? A too-short input still says
    // something when its first word IS the pattern's verb (GH #318: a bare
    // `drop` against `drop :item`): record the matched verb and the element
    // it stopped short of, so the failure classifier can ask "What do you
    // want to drop?" instead of shrugging.
    if (tokens.length < pattern.minTokens) {
      const first = pattern.tokens[0];
      const verbMatched = first?.type === 'literal' && tokens[0] !== undefined && tokens[0].normalized === first.value;
      // A verb-led short input runs the full matcher below, which stops on
      // the exact element the input ran out at (the slot for `drop`, the
      // preposition for `put pear`) and records the verb with it.
      if (!verbMatched) {
        return {
          success: false,
          failure: {
            pattern: rule.pattern,
            action: rule.action,
            progress: 0,
            tokensConsumed: 0,
            literalSpecificity: 0,
            reason: 'NOT_ENOUGH_TOKENS',
            ...expectationAt(pattern, 0)
          }
        };
      }
    }

    const slots = new Map<string, SlotMatch>();
    let tokenIndex = 0;
    let patternIndex = 0;
    // ADR-231 D2b: words consumed by literal/alternate pattern tokens
    let literalSpecificity = 0;
    // ADR-383 D7: each literal element and the input tokens it consumed.
    const literals: MatchedElement[] = [];
    // The verb phrase so far: the words the literals before the first slot
    // consumed. It names the verb in a failure's message.
    const verbWords: string[] = [];
    let reachedSlot = false;
    let matchedVerb: string | undefined;
    const literalMatched = (index: number, normalized: string) => {
      literals.push({ tokenIndex: index, inputTokens: [tokenIndex] });
      if (!reachedSlot) {
        verbWords.push(normalized);
        matchedVerb = verbWords.join(' ');
      }
    };

    // Try to match each pattern token
    for (const patternToken of pattern.tokens) {
      patternIndex++;
      if (patternToken.type === 'slot') reachedSlot = true;
      const skippedLiteral = () => {
        if (patternToken.type !== 'slot') literals.push({ tokenIndex: patternIndex - 1, inputTokens: [] });
      };

      // An article stands before a noun, never as a command's verb: a
      // pattern's first word is its verb, even spelled `an` (Dungeo's GDT
      // code `an :arg...`), so only a later article is optional.
      const isArticle = patternIndex > 1 && patternToken.type === 'literal' && ARTICLE_WORDS.has(patternToken.value);

      // Check if we have a token to match
      if (tokenIndex >= tokens.length) {
        if (patternToken.optional || isArticle) {
          skippedLiteral();
          continue;
        }
        // Not enough tokens for required pattern element
        return {
          success: false,
          failure: {
            pattern: rule.pattern,
            action: rule.action,
            progress: patternIndex / totalPatternTokens,
            tokensConsumed: tokenIndex,
            literalSpecificity,
            reason: 'NOT_ENOUGH_TOKENS',
            matchedVerb,
            ...expectationAt(pattern, patternIndex - 1)
          }
        };
      }

      const token = tokens[tokenIndex];

      switch (patternToken.type) {
        case 'literal':
          if (token.normalized === patternToken.value) {
            literalMatched(patternIndex - 1, token.normalized);
            tokenIndex++;
            literalSpecificity++;
          } else if (isArticle) {
            // An article the player left out, written or bracketed: free.
            skippedLiteral();
            continue;
          } else if (patternToken.optional) {
            skippedLiteral();
            continue;
          } else {
            //Check if this is verb position for better error
            const reason = tokenIndex === 0 ? 'VERB_MISMATCH' : 'LITERAL_MISMATCH';
            return {
              success: false,
              failure: {
                pattern: rule.pattern,
                action: rule.action,
                progress: patternIndex / totalPatternTokens,
                tokensConsumed: tokenIndex,
                literalSpecificity,
                reason,
                matchedVerb,
                failedAtToken: token.normalized,
                ...expectationAt(pattern, patternIndex - 1)
              }
            };
          }
          break;

        case 'alternates':
          if (patternToken.alternates!.includes(token.normalized)) {
            literalMatched(patternIndex - 1, token.normalized);
            tokenIndex++;
            literalSpecificity++;
          } else if (patternToken.optional) {
            skippedLiteral();
            continue;
          } else {
            const reason = tokenIndex === 0 ? 'VERB_MISMATCH' : 'LITERAL_MISMATCH';
            return {
              success: false,
              failure: {
                pattern: rule.pattern,
                action: rule.action,
                progress: patternIndex / totalPatternTokens,
                tokensConsumed: tokenIndex,
                literalSpecificity,
                reason,
                matchedVerb,
                failedAtToken: token.normalized,
                ...expectationAt(pattern, patternIndex - 1)
              }
            };
          }
          break;

        case 'slot':
          const slotResult = this.consumeSlot(
            patternToken.value,
            tokens,
            tokenIndex,
            pattern,
            rule,
            context
          );

          if (!slotResult) {
            if (patternToken.optional) {
              continue;
            }
            // Required slot couldn't be filled - collect the attempted text
            const remainingTokens = tokens.slice(tokenIndex);
            const attemptedText = remainingTokens.map(t => t.word).join(' ');

            return {
              success: false,
              failure: {
                pattern: rule.pattern,
                action: rule.action,
                progress: patternIndex / totalPatternTokens,
                tokensConsumed: tokenIndex,
                literalSpecificity,
                reason: 'SLOT_FAILED',
                matchedVerb,
                slotFailure: {
                  slotName: patternToken.value,
                  attemptedText: attemptedText || '(nothing)',
                  reason: 'NO_MATCH',
                  unknownWord: remainingTokens[0]?.word
                }
              }
            };
          }

          slots.set(patternToken.value, slotResult);

          tokenIndex = slotResult.tokens[slotResult.tokens.length - 1] + 1;
          break;
      }
    }

    // Check if we consumed all tokens
    if (tokenIndex !== tokens.length) {
      return {
        success: false,
        failure: {
          pattern: rule.pattern,
          action: rule.action,
          progress: 0.9, // Almost matched but had extra tokens
          tokensConsumed: tokenIndex,
          literalSpecificity,
          reason: 'LEFTOVER_TOKENS',
          matchedVerb,
          failedAtToken: tokens[tokenIndex]?.word
        }
      };
    }

    // A rule's semantics are its per-rule defaults (ADR-148); nothing is
    // derived from the matched words.
    const semantics = rule.defaultSemantics && Object.keys(rule.defaultSemantics).length > 0 ? { ...rule.defaultSemantics } : undefined;

    return {
      success: true,
      match: {
        rule,
        slots,
        consumed: tokenIndex,
        literalSpecificity,
        semantics,
        literals
      }
    };
  }
  
  /**
   * Consume tokens for a slot
   */
  private consumeSlot(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    rule: any, // GrammarRule
    context: GrammarContext
  ): SlotMatch | null {
    const DEBUG = process.env.PARSER_DEBUG === 'true';

    // Find the current slot in the pattern tokens
    let slotTokenIndex = -1;
    let patternSlotToken: PatternToken | undefined;
    for (let i = 0; i < pattern.tokens.length; i++) {
      const token = pattern.tokens[i];
      if (token.type === 'slot' && token.value === slotName) {
        slotTokenIndex = i;
        patternSlotToken = token;
        break;
      }
    }

    if (slotTokenIndex === -1) {
      return null;
    }

    // The slot's type is settled on its compiled record (ADR-382 D4)
    const slotConstraints = rule.slots.get(slotName);
    const slotType = pattern.slotsByName.get(slotName)?.slotType ?? SlotType.ENTITY;

    if (DEBUG) {
      console.log(`Slot '${slotName}' has type: ${slotType}`);
    }

    // ADR-088: Delegate to registry if consumer is registered
    if (this.slotConsumerRegistry.hasConsumer(slotType)) {
      const consumerContext: SlotConsumerContext = {
        slotName,
        tokens,
        startIndex,
        pattern,
        slotTokenIndex,
        rule,
        context,
        slotType,
        slotConstraints,
        patternToken: patternSlotToken,
        DEBUG
      };
      return this.slotConsumerRegistry.consume(consumerContext);
    }

    // All slot types should be handled by registry consumers (ADR-088)
    // If we reach here, it's an unknown slot type
    throw new Error(`Unknown slot type: ${slotType}`);
  }

  // ==========================================================================
  // ADR-082: Helper Functions for Typed Slot Values
  // ==========================================================================

  /**
   * Extract typed value from a NUMBER slot match
   */
  static extractNumberValue(match: SlotMatch): number | null {
    if (match.slotType !== SlotType.NUMBER) return null;

    const normalized = match.text.toLowerCase();

    // Word form (using imported vocabulary from lang-en-us)
    if (normalized in cardinalNumbers) {
      return cardinalNumbers[normalized];
    }

    // Digit form
    if (/^\d+$/.test(normalized)) {
      return parseInt(normalized, 10);
    }

    return null;
  }

  /**
   * Extract typed value from an ORDINAL slot match
   */
  static extractOrdinalValue(match: SlotMatch): number | null {
    if (match.slotType !== SlotType.ORDINAL) return null;

    const normalized = match.text.toLowerCase();

    // Word form (using imported vocabulary from lang-en-us)
    if (normalized in ordinalNumbers) {
      return ordinalNumbers[normalized];
    }

    // Suffixed number form
    const ordinalMatch = normalized.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinalMatch) {
      return parseInt(ordinalMatch[1], 10);
    }

    return null;
  }

  /**
   * Extract canonical direction from a DIRECTION slot match
   */
  static extractDirectionValue(match: SlotMatch): string | null {
    if (match.slotType !== SlotType.DIRECTION) return null;

    const normalized = match.text.toLowerCase();
    return directionMap[normalized] || null;
  }

  /**
   * Extract time components from a TIME slot match
   */
  static extractTimeValue(match: SlotMatch): { hours: number; minutes: number } | null {
    if (match.slotType !== SlotType.TIME) return null;

    const timeMatch = match.text.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      return {
        hours: parseInt(timeMatch[1], 10),
        minutes: parseInt(timeMatch[2], 10)
      };
    }

    return null;
  }
}