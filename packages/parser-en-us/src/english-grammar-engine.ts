/**
 * @file English Grammar Engine
 * @description English-specific grammar matching. A rule is matched by a
 * search over its pattern (ADR-386 D2): each optional element and each
 * pattern article is taken before it is skipped, each slot is tried at every
 * extent its consumer admits, and every way the pattern consumes the whole
 * input is a reading. Each reading's items are named through the one noun
 * matcher (ADR-386 D4), the readings of every rule are ranked by one
 * comparator and returned together, and a rule with no reading records its
 * furthest failure with the rank of the items it consumed.
 *
 * Public interface: EnglishGrammarEngine (findMatches, getLastFailures,
 * getLastCapped, the typed-slot value extractors), MAX_READINGS_PER_RULE.
 * Owner context: parser-en-us grammar matching.
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
import { SlotConsumerRegistry, SlotConsumerContext, createDefaultRegistry, isSlotRefusal, type SlotConsumeResult } from './slot-consumers/index.js';
import type { PartialMatchFailure } from './parse-failure.js';
import { ReadingNamer } from './reading-names.js';

/**
 * English articles. A pattern's literal article after its verb is optional
 * for the player and its absence costs nothing: `follow cables` matches
 * `follow the cables` exactly as well as the full form does (ADR-380 D2); and
 * a typed article before a literal the pattern does not spell is skipped the
 * same way: `climb the rope` reaches `climb rope` (ADR-386 D3). Articles are
 * the English parser's to know; no language-neutral layer lists them.
 */
const ARTICLE_WORDS: ReadonlySet<string> = new Set(englishWords.articles.map((a) => a.toLowerCase()));

/**
 * The most readings one rule may have of one input. Past it the readings
 * found so far stand and the rule is recorded for the parser's debug event,
 * never silently (ADR-386 D2).
 */
export const MAX_READINGS_PER_RULE = 256;

/**
 * What a failure stopped short of, read from the compiled pattern
 * (ADR-382 D4): the element at `index`, the seats of the required entity
 * slots from it on — the objects input that ran out there is missing
 * (ADR-383 D8) — and the first slot after it, the slot a missing
 * preposition would have introduced.
 * @param pattern The rule's compiled pattern
 * @param index The pattern element index the match failed at
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

/** A failure as the search records it, before the rule's tier and index and the consumed items' rank are added. */
type RuleFailure = Omit<PartialMatchFailure, 'tier' | 'definitionIndex' | 'nounRank'>;

/** The readings of one rule, or its furthest failure when it has none. */
interface RuleReadings {
  matches: PatternMatch[];
  failure?: RuleFailure;
  capped: boolean;
}

/** One path of the search through a pattern. */
interface SearchPath {
  /** The next input token to match */
  tokenIndex: number;
  /** The slots filled so far */
  slots: Map<string, SlotMatch>;
  /** Each literal element so far and the input it consumed (ADR-383 D7) */
  literals: MatchedElement[];
  /** Input words consumed by literal and alternate elements (ADR-231 D2b) */
  literalSpecificity: number;
  /** The verb phrase: the words the literals before the first slot consumed */
  verbWords: string[];
  /** Whether a slot has been reached, which closes the verb phrase */
  afterSlot: boolean;
}

/** Whether a literal or alternates element reads the token. */
function literalReads(element: PatternToken, token: Token | undefined): boolean {
  if (!token) return false;
  return element.type === 'literal' ? token.normalized === element.value : (element.alternates ?? []).includes(token.normalized);
}

/**
 * English-specific grammar matching engine
 */
export class EnglishGrammarEngine extends GrammarEngine {
  private slotConsumerRegistry: SlotConsumerRegistry;

  /** Last set of partial match failures (for error reporting) */
  private lastFailures: PartialMatchFailure[] = [];

  /** The patterns whose readings hit MAX_READINGS_PER_RULE in the last match */
  private lastCapped: string[] = [];

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
   * The patterns of the rules whose readings were capped in the last match
   * (ADR-386 D2), for the parser's debug event.
   */
  getLastCapped(): string[] {
    return this.lastCapped;
  }

  /**
   * Find every reading of the input: each rule's complete readings, ranked
   * by `compareGrammarRank` — the noun rank of each reading's items (ADR-386
   * D4, D5) around ADR-384 D2's rule keys — and then by the rule's search
   * order (ADR-386 D2). Rules a gate closes are skipped (ADR-378 D5).
   */
  findMatches(
    tokens: Token[],
    context: GrammarContext,
    options: GrammarMatchOptions = {}
  ): PatternMatch[] {
    const ranked: Array<{ match: PatternMatch; definitionIndex: number; order: number }> = [];
    const failures: PartialMatchFailure[] = [];
    const capped: string[] = [];
    // One namer per input: the items the readings share are named once
    const namer = new ReadingNamer(context);

    // Every rule is tried, in registration (definition) order, and every
    // reading of every rule is ranked: no cap on rules, so the most specific
    // rule is never cut off.
    this.rules.forEach((rule, definitionIndex) => {
      if (!rule.compiledPattern) return;
      // ADR-378 D5: a gated-off rule is not there — neither a match nor a
      // failure, so the input falls through to the rules that remain.
      if (rule.when && !rule.when(context)) return;

      const result = this.readingsOfRule(rule, tokens, context, namer);
      result.matches.forEach((match, order) => ranked.push({ match, definitionIndex, order }));
      if (result.matches.length === 0 && result.failure) {
        // The failure carries the rank of the items it had consumed, for the
        // parser's failure-versus-reading rule (ADR-386 D5)
        const nounRank = namer.rankOf(result.failure.slots ?? new Map());
        failures.push({ ...result.failure, nounRank, tier: rule.tier, definitionIndex });
      }
      if (result.capped) capped.push(rule.pattern);
    });

    this.lastFailures = failures;
    this.lastCapped = capped;

    // Items naming nothing, then literal specificity, tier and definition
    // order, then names and exact names: the one ordering of grammar
    // readings; a rule's readings that tie on it keep search order.
    ranked.sort((a, b) =>
      compareGrammarRank(
        { nounRank: a.match.nounRank, literalSpecificity: a.match.literalSpecificity ?? 0, tier: a.match.rule.tier, definitionIndex: a.definitionIndex },
        { nounRank: b.match.nounRank, literalSpecificity: b.match.literalSpecificity ?? 0, tier: b.match.rule.tier, definitionIndex: b.definitionIndex }
      ) || a.order - b.order
    );

    return ranked.map((entry) => entry.match);
  }

  /**
   * Every complete reading of one rule, in search order, each with the rank
   * of its items, or the rule's furthest failure when it has none (ADR-386
   * D2, D4).
   */
  private readingsOfRule(
    rule: any, // GrammarRule
    tokens: Token[],
    context: GrammarContext,
    namer: ReadingNamer
  ): RuleReadings {
    const pattern: CompiledPattern = rule.compiledPattern!;
    const elements = pattern.tokens;
    const total = elements.length;

    // Quick check: do we have enough tokens? A too-short input still says
    // something when its first word IS the pattern's verb (GH #318: a bare
    // `drop` against `drop :item`): record the matched verb and the element
    // it stopped short of, so the failure classifier can ask "What do you
    // want to drop?" instead of shrugging.
    if (tokens.length < pattern.minTokens) {
      const first = elements[0];
      const verbMatched = first?.type === 'literal' && tokens[0] !== undefined && tokens[0].normalized === first.value;
      // A verb-led short input runs the full search below, which stops on
      // the exact element the input ran out at (the slot for `drop`, the
      // preposition for `put pear`) and records the verb with it.
      if (!verbMatched) {
        return {
          matches: [],
          capped: false,
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

    // A rule's semantics are its per-rule defaults (ADR-148); nothing is
    // derived from the matched words.
    const semantics = rule.defaultSemantics && Object.keys(rule.defaultSemantics).length > 0 ? { ...rule.defaultSemantics } : undefined;

    const matches: PatternMatch[] = [];
    // Two paths can consume the same spans (a pattern article taken, or
    // skipped with the typed article skipped before the next word): one
    // reading, recorded once.
    const seen = new Set<string>();
    let capped = false;
    let furthest: { tokenIndex: number; elementIndex: number; failure: RuleFailure } | undefined;

    // The furthest point any path reached is the failure worth reporting:
    // most input consumed, then most of the pattern matched.
    const fail = (path: SearchPath, elementIndex: number, failure: Omit<RuleFailure, 'pattern' | 'action' | 'progress' | 'tokensConsumed' | 'literalSpecificity' | 'matchedVerb' | 'slots'>) => {
      if (furthest && (path.tokenIndex < furthest.tokenIndex || (path.tokenIndex === furthest.tokenIndex && elementIndex <= furthest.elementIndex))) return;
      furthest = {
        tokenIndex: path.tokenIndex,
        elementIndex,
        failure: {
          pattern: rule.pattern,
          action: rule.action,
          progress: elementIndex >= total ? 0.9 : (elementIndex + 1) / total,
          tokensConsumed: path.tokenIndex,
          literalSpecificity: path.literalSpecificity,
          matchedVerb: path.verbWords.length > 0 ? path.verbWords.join(' ') : undefined,
          slots: new Map(path.slots),
          ...failure
        }
      };
    };

    const walk = (elementIndex: number, path: SearchPath): void => {
      if (matches.length >= MAX_READINGS_PER_RULE) {
        capped = true;
        return;
      }

      if (elementIndex === total) {
        if (path.tokenIndex === tokens.length) {
          const key = [...path.slots.entries()].map(([name, slot]) => `${name}:${slot.tokens.join(',')}`).join('|');
          if (!seen.has(key)) {
            seen.add(key);
            const slots = new Map(path.slots);
            matches.push({
              rule,
              slots,
              consumed: path.tokenIndex,
              literalSpecificity: path.literalSpecificity,
              nounRank: namer.rankOf(slots),
              semantics,
              literals: [...path.literals]
            });
          }
        } else {
          fail(path, elementIndex, { reason: 'LEFTOVER_TOKENS', failedAtToken: tokens[path.tokenIndex]?.word });
        }
        return;
      }

      const element = elements[elementIndex];

      if (element.type === 'literal' || element.type === 'alternates') {
        // An article stands before a noun, never as a command's verb: a
        // pattern's first word is its verb, even spelled `an` (Dungeo's GDT
        // code `an :arg...`), so only a later article is optional.
        const isArticle = elementIndex > 0 && element.type === 'literal' && ARTICLE_WORDS.has(element.value);
        const skippable = element.optional === true || isArticle;

        // ADR-386 D3: a typed article the pattern does not spell, standing
        // before the word the element reads, is skipped and costs nothing.
        let at = path.tokenIndex;
        const typedArticle =
          elementIndex > 0 && !isArticle && at < tokens.length && ARTICLE_WORDS.has(tokens[at].normalized) && literalReads(element, tokens[at + 1]);
        if (typedArticle) at++;

        if (literalReads(element, tokens[at])) {
          const inputTokens = typedArticle ? [path.tokenIndex, at] : [at];
          walk(elementIndex + 1, {
            tokenIndex: at + 1,
            slots: path.slots,
            literals: [...path.literals, { tokenIndex: elementIndex, inputTokens }],
            literalSpecificity: path.literalSpecificity + 1,
            verbWords: path.afterSlot ? path.verbWords : [...path.verbWords, tokens[at].normalized],
            afterSlot: path.afterSlot
          });
        } else if (!skippable) {
          if (path.tokenIndex >= tokens.length) {
            fail(path, elementIndex, { reason: 'NOT_ENOUGH_TOKENS', ...expectationAt(pattern, elementIndex) });
          } else {
            fail(path, elementIndex, {
              reason: path.tokenIndex === 0 ? 'VERB_MISMATCH' : 'LITERAL_MISMATCH',
              failedAtToken: tokens[path.tokenIndex].normalized,
              ...expectationAt(pattern, elementIndex)
            });
          }
        }
        // An article the player left out, or an optional word, is skipped
        // after it was tried taken.
        if (skippable) {
          walk(elementIndex + 1, { ...path, literals: [...path.literals, { tokenIndex: elementIndex, inputTokens: [] }] });
        }
        return;
      }

      // A slot: every extent its consumer admits, shorter first when another
      // element follows, longer first when the slot ends the pattern.
      const slotName = element.value;
      const skipped = () => walk(elementIndex + 1, { ...path, afterSlot: true });

      if (path.tokenIndex >= tokens.length) {
        if (element.optional) {
          skipped();
        } else {
          fail(path, elementIndex, { reason: 'NOT_ENOUGH_TOKENS', ...expectationAt(pattern, elementIndex) });
        }
        return;
      }

      const result = this.consumeSlot(slotName, tokens, path.tokenIndex, pattern, rule, context);
      if (!result || isSlotRefusal(result)) {
        if (element.optional) {
          skipped();
          return;
        }
        // Required slot couldn't be filled - collect the attempted text.
        // A consumer's refusal says what was found and why (ADR-385 D8);
        // without one the failure names the attempted text.
        const attemptedText = tokens.slice(path.tokenIndex).map((t) => t.word).join(' ');
        const refusal = result ? result.failure : { reason: 'NO_MATCH' as const, unknownWord: attemptedText || undefined };
        fail(path, elementIndex, {
          reason: 'SLOT_FAILED',
          slotFailure: { slotName, attemptedText: attemptedText || '(nothing)', ...refusal }
        });
        return;
      }

      const last = elementIndex === total - 1;
      const readings = last ? result.readings : [...result.readings].reverse();
      for (const reading of readings) {
        if (matches.length >= MAX_READINGS_PER_RULE) {
          capped = true;
          return;
        }
        const slots = new Map(path.slots);
        slots.set(slotName, reading);
        walk(elementIndex + 1, {
          tokenIndex: reading.tokens[reading.tokens.length - 1] + 1,
          slots,
          literals: path.literals,
          literalSpecificity: path.literalSpecificity,
          verbWords: path.verbWords,
          afterSlot: true
        });
      }
      if (element.optional) skipped();
    };

    walk(0, { tokenIndex: 0, slots: new Map(), literals: [], literalSpecificity: 0, verbWords: [], afterSlot: false });

    return { matches, capped, ...(matches.length === 0 && furthest ? { failure: furthest.failure } : {}) };
  }

  /**
   * The readings of a slot from a start token, through the consumer
   * registered for its type.
   */
  private consumeSlot(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    rule: any, // GrammarRule
    context: GrammarContext
  ): SlotConsumeResult {
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
