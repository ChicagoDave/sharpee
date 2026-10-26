/**
 * @file Grammar Builder Interfaces
 * @description Language-agnostic interfaces for defining grammar rules
 */

import { type IEntity } from '@sharpee/core';
import type { NounRank } from './rule-order.js';

/**
 * Slot types for grammar patterns
 * Controls how the parser handles slot matching
 */
export enum SlotType {
  /** Default: resolve slot text to an entity via vocabulary lookup */
  ENTITY = 'entity',
  /** Capture raw text without entity resolution (single token) */
  TEXT = 'text',
  /** Capture raw text; the consumer admits every extent to the end of the input and the engine's search chooses (greedy, ADR-386 D1) */
  TEXT_GREEDY = 'text_greedy',
  /** Resolve entity but mark as instrument for the action */
  INSTRUMENT = 'instrument',

  // ADR-082: Built-in typed value slots
  /** Match cardinal/ordinal direction (n, s, e, w, ne, up, down, etc.) */
  DIRECTION = 'direction',
  /** Match integer (digits or words: 1, 29, one, twenty) */
  NUMBER = 'number',
  /** Match ordinal (1st, first, 2nd, second, etc.) */
  ORDINAL = 'ordinal',
  /** Match time expression (10:40, 6:00) */
  TIME = 'time',
  /** Match manner adverb (carefully, quickly, forcefully) - feeds intention.manner */
  MANNER = 'manner',

  // ADR-082: Text variant slots
  /** Match text enclosed in double quotes */
  QUOTED_TEXT = 'quoted_text',
  /** Match conversation topic (one or more words) */
  TOPIC = 'topic',

  // ADR-082: Category-based vocabulary slots
  /** Match word from a story-defined vocabulary category */
  VOCABULARY = 'vocabulary',

  // Deprecated: Use VOCABULARY with named categories instead
  /** @deprecated Use VOCABULARY with .fromVocabulary() instead */
  ADJECTIVE = 'adjective',
  /** @deprecated Use VOCABULARY with .fromVocabulary() instead */
  NOUN = 'noun'
}

/**
 * Constraint types for slot matching.
 *
 * `PropertyConstraint` and `FunctionConstraint` are evaluated by
 * `ScopeBuilder.matching()` only. `.where()` takes a
 * `ScopeConstraintBuilder` and nothing else — ADR-231 D2a Amendment 1:
 * the other two forms never gated at parse time, and admitting them as a
 * union of function types defeated contextual typing of the callback
 * parameter (TS7006).
 */
export type PropertyConstraint = Record<string, any>;
export type FunctionConstraint = (entity: IEntity, context: GrammarContext) => boolean;
export type ScopeConstraintBuilder = (scope: ScopeBuilder) => ScopeBuilder;

/**
 * Context provided to constraint functions
 */
export interface GrammarContext {
  world: any; // WorldModel interface
  actorId: string;
  actionId?: string;
  currentLocation: string;
  slots: Map<string, IEntity[]>; // Other resolved slots
}

/**
 * Scope builder for constraint definitions
 */
export interface ScopeBuilder {
  visible(): ScopeBuilder;
  touchable(): ScopeBuilder;
  carried(): ScopeBuilder;
  nearby(): ScopeBuilder;
  matching(constraint: PropertyConstraint | FunctionConstraint): ScopeBuilder;
  orExplicitly(entityIds: string[]): ScopeBuilder;
  /**
   * Require the entity to have a specific trait
   * @param traitType The trait type constant (e.g., TraitType.PORTABLE)
   */
  hasTrait(traitType: string): ScopeBuilder;
  build(): ScopeConstraint;
}

/**
 * Internal scope constraint representation
 */
export interface ScopeConstraint {
  base: 'visible' | 'touchable' | 'carried' | 'nearby' | 'all';
  filters: Array<PropertyConstraint | FunctionConstraint>;
  /** Required trait types the entity must have */
  traitFilters: string[];
  explicitEntities: string[];
}

/**
 * ADR-082: Typed slot value for non-entity slots
 * Each variant carries the parsed/typed value from the input
 */
export type TypedSlotValue =
  | { type: 'direction'; direction: string; canonical: string }
  | { type: 'number'; value: number; word: string }
  | { type: 'ordinal'; value: number; word: string }
  | { type: 'time'; hours: number; minutes: number; text: string }
  | { type: 'manner'; word: string }
  | { type: 'quoted_text'; text: string }
  | { type: 'topic'; words: string[] }
  | { type: 'vocabulary'; word: string; category: string }
  // Deprecated: Use 'vocabulary' type instead
  | { type: 'adjective'; word: string }
  | { type: 'noun'; word: string };

/**
 * Pattern builder for defining grammar rules
 */
export interface PatternBuilder {
  /**
   * Define a scope constraint for a slot.
   * `.where(slot, scope => scope...)` scope constraints (including the
   * ScopeBuilder's `.hasTrait()`) are the one parse-time gating mechanism;
   * trait-based refusal lives in each action's validate().
   * @param slot The slot name from the pattern
   * @param constraint A scope-builder callback, e.g. `scope => scope.touchable()`
   */
  where(slot: string, constraint: ScopeConstraintBuilder): PatternBuilder;

  /**
   * Mark a slot as capturing raw text (single token) instead of resolving to entity
   * For greedy text capture, use :slot... syntax in the pattern
   * @param slot The slot name from the pattern
   */
  text(slot: string): PatternBuilder;

  /**
   * Mark a slot as an instrument for the action
   * The slot will still resolve to an entity, but be stored in command.instrument
   * @param slot The slot name from the pattern
   */
  instrument(slot: string): PatternBuilder;

  /**
   * Declare an entity slot's seat (ADR-383 D2), for a line written
   * indirect-first: `define('hand :recipient :item').seat('item', 'direct')`.
   * Undeclared entity slots take the seats left free, in pattern order.
   * @param slot The slot name from the pattern
   * @param seat Where the slot's noun goes in the parsed command
   */
  seat(slot: string, seat: Seat): PatternBuilder;

  /**
   * Map this pattern to an action
   * @param action The action identifier
   */
  mapsTo(action: string): PatternBuilder;

  /**
   * Set default semantic properties
   * @param defaults Default semantic properties
   */
  withDefaultSemantics(defaults: Partial<SemanticProperties>): PatternBuilder;

  /**
   * Gate this rule on the live world (ADR-378 D5): skipped while the
   * predicate answers false, as though the rule did not exist.
   * @param predicate Read against the GrammarContext at match time
   */
  when(predicate: GrammarGate): PatternBuilder;

  // ADR-082: Typed Value Slots

  /**
   * Mark a slot as a number (integer)
   * Matches digits (1, 29, 100) or words (one, twenty)
   * @param slot The slot name from the pattern
   */
  number(slot: string): PatternBuilder;

  /**
   * Mark a slot as an ordinal
   * Matches ordinal words (first, second) or suffixed numbers (1st, 2nd)
   * @param slot The slot name from the pattern
   */
  ordinal(slot: string): PatternBuilder;

  /**
   * Mark a slot as a time expression
   * Matches HH:MM format (10:40, 6:00)
   * @param slot The slot name from the pattern
   */
  time(slot: string): PatternBuilder;

  // ADR-082: Built-in Vocabulary Slots

  /**
   * Mark a slot as a direction
   * Matches built-in direction vocabulary (n, north, up, etc.)
   * @param slot The slot name from the pattern
   */
  direction(slot: string): PatternBuilder;

  /**
   * Mark a slot as a manner adverb
   * Matches built-in manner vocabulary (carefully, quickly, forcefully, etc.)
   * The matched word is stored in command.intention.manner
   * @param slot The slot name from the pattern
   */
  manner(slot: string): PatternBuilder;

  // ADR-082: Category-Based Vocabulary Slots

  /**
   * Mark a slot as matching a story-defined vocabulary category
   * The category must be registered via world.getVocabularyProvider().define()
   *
   * @param slot The slot name from the pattern
   * @param category The vocabulary category name
   *
   * @example
   * ```typescript
   * // Register vocabulary
   * vocab.define('panel-colors', {
   *   words: ['red', 'yellow', 'mahogany', 'pine'],
   *   when: (ctx) => ctx.currentLocation === insideMirrorId
   * });
   *
   * // Use in grammar
   * grammar
   *   .define('push :color panel')
   *   .fromVocabulary('color', 'panel-colors')
   *   .mapsTo('push_panel')
   *   .build();
   * ```
   */
  fromVocabulary(slot: string, category: string): PatternBuilder;

  // Deprecated methods - use fromVocabulary() instead

  /**
   * @deprecated Use fromVocabulary() with a named category instead
   * Mark a slot as an adjective from story vocabulary
   */
  adjective(slot: string): PatternBuilder;

  /**
   * @deprecated Use fromVocabulary() with a named category instead
   * Mark a slot as a noun from story vocabulary
   */
  noun(slot: string): PatternBuilder;

  // ADR-082: Text Variant Slots

  /**
   * Mark a slot as quoted text
   * Matches text enclosed in double quotes
   * @param slot The slot name from the pattern
   */
  quotedText(slot: string): PatternBuilder;

  /**
   * Mark a slot as a conversation topic
   * Consumes one or more words as a topic
   * @param slot The slot name from the pattern
   */
  topic(slot: string): PatternBuilder;

  /**
   * Build the final grammar rule
   */
  build(): GrammarRule;
}

/**
 * Main grammar builder interface
 */
export interface GrammarBuilder {
  /**
   * Define a new grammar pattern
   * @param pattern The pattern string (e.g., "put :item in|into :container")
   */
  define(pattern: string): PatternBuilder;

  /**
   * Register one rule from structured parts (ADR-382 D2), at this
   * builder's tier. The Chord loader's and the generated standard
   * grammar's entry: no text is parsed.
   * @param spec The rule's action, parts, display text and per-slot configuration
   * @throws PatternSyntaxError when the parts are malformed; Error when a
   *   slot configuration names a slot the parts lack, or types a greedy slot
   *   as anything but TEXT_GREEDY
   */
  rule(spec: GrammarRuleSpec): void;

  /**
   * Get all defined rules
   */
  getRules(): GrammarRule[];

  /**
   * Clear all rules
   */
  clear(): void;

  /**
   * ADR-270 D3: remove registered rules by shape — (action id, shape,
   * tier), the shape test supplied by the caller over each rule (ADR-382 D6;
   * Chord's is `samePatternShape` on `rule.parts`). Diagnostic-free:
   * returns the count removed (0 = no rule matched); the caller owns any
   * miss diagnostic. `tier` defaults to 'standard' — the alteration model
   * removes platform rules, never story rules, unless explicitly asked.
   */
  removeRules(action: string, shapeMatches: (rule: GrammarRule) => boolean, tier?: GrammarTier): number;
}

/**
 * Grammar tier: which layer defined the rule. At equal literal specificity a
 * story-tier rule outranks a standard-tier one; a more specific standard rule
 * still wins, and a story replaces one by removing it (ADR-384 D2,
 * `compareGrammarRank`; a reading with an item naming nothing ranks below
 * both, ADR-386 D5). Set at the registration entry
 * point: the standard grammar's builder registers 'standard'; the story
 * grammar surface (getStoryGrammar()) and the Chord loader register 'story'.
 */
export type GrammarTier = 'standard' | 'story';

/**
 * A compiled grammar rule
 */
/**
 * A rule-level gate (ADR-378 D5, GH #317): read against the live world
 * before matching. A rule whose gate answers false is skipped — neither a
 * match nor a failure — so the input parses as though the rule did not
 * exist. Story-tier only in practice: a Chord `define action … while
 * <condition>` head, or a passage's command words gated to the room that
 * declares the passage.
 */
export type GrammarGate = (context: GrammarContext) => boolean;

export interface GrammarRule {
  id: string;
  /** Display text for diagnostics and failure messages; nothing parses it (ADR-382 D2). */
  pattern: string;
  /** The rule's structure — the only source of its words and slots. */
  parts: readonly PatternElement[];
  compiledPattern?: CompiledPattern; // Set during compilation
  slots: Map<string, SlotConstraint>;
  action: string;
  /** ADR-268 D2: resolution layer — story outranks standard */
  tier: GrammarTier;
  /** ADR-378 D5: skip the rule while this answers false (absent = always on) */
  when?: GrammarGate;
  defaultSemantics?: Partial<SemanticProperties>; // Default semantics
}

/**
 * Semantic properties that can be derived from grammar
 */
export interface SemanticProperties {
  /** How an action is performed */
  manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy' | 'quick';
  
  /** Spatial relationship for placement actions */
  spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside' | 'above' | 'below';
  
  /**
   * The direction a movement rule carries, as the action's own vocabulary
   * names it: a compass word (`world-model`'s `DirectionType`, `in` and
   * `out` included), a passage key (`passage:<name>`, ADR-378 D1 — a way
   * answered by a custom command rather than a compass word), or a ship
   * direction under `use sailing` (`port`, `starboard`, `ahead`, ADR-375).
   * The word is per action, so the contract does not close the set; the
   * consumer that reads it resolves it against the ways it knows.
   */
  direction?: string;
  
  /** Whether the preposition was implicit */
  implicitPreposition?: boolean;
  
  /** Whether a direction was implicit */
  implicitDirection?: boolean;
  
  /** Custom properties for specific actions */
  [key: string]: any;
}

/**
 * Slot constraint definition
 */
export interface SlotConstraint {
  name: string;
  constraints: ScopeConstraintBuilder[];
  /** How the parser should handle this slot (default: ENTITY) */
  slotType?: SlotType;
  /** For VOCABULARY slots: the category name to match against */
  vocabularyCategory?: string;
  /** Declared seat of an entity slot (ADR-383 D1) */
  seat?: Seat;
}

/**
 * Token in a pattern
 */
export interface PatternToken {
  type: 'literal' | 'slot' | 'alternates';
  value: string;
  alternates?: string[]; // For alternates like "in|into|inside"
  optional?: boolean;   // For optional elements like "[carefully]"
  slotType?: SlotType;  // For slot tokens: how to handle matching
  greedy?: boolean;     // For :slot... syntax: every extent to the end of the input is a reading (ADR-386 D1)
  vocabularyCategory?: string; // For VOCABULARY slots: category name
}

/**
 * One element of a grammar pattern, as a rule is registered (ADR-382 D1).
 * A rule crosses into the engine as these parts, never as text to re-split:
 * a word, an alternation of words, or a named slot, each optionally
 * optional. No element fixes where a slot ends: each slot admits every
 * extent it can read and the engine searches them (ADR-386 D1, D2); a
 * greedy slot is a text slot whose extents run to the end of the input.
 */
export type PatternElement =
  | { kind: 'word'; word: string; optional?: boolean }
  | { kind: 'alt'; words: readonly string[]; optional?: boolean }
  | { kind: 'slot'; name: string; optional?: boolean; greedy?: boolean };

/**
 * Where an entity slot's noun goes in the parsed command (ADR-383 D1).
 * Every other slot type is seated by its type (instrument, topic, text,
 * vocabulary, manner, direction).
 */
export type Seat = 'direct' | 'indirect';

/**
 * Per-slot configuration on a rule spec: the slot's type, its scope
 * constraints and, for an entity slot, its declared seat. Keyed by slot
 * name; a name no part carries is a build error.
 */
export interface GrammarRuleSlotSpec {
  type?: SlotType;
  constraints?: readonly ScopeConstraintBuilder[];
  /** For VOCABULARY slots: the category name to match against */
  vocabularyCategory?: string;
  /** The entity slot's seat; undeclared seats take the positional default (ADR-383 D2). */
  seat?: Seat;
}

/**
 * A grammar rule, as data (ADR-382 D2) — what `GrammarBuilder.rule()` takes.
 */
export interface GrammarRuleSpec {
  action: string;
  parts: readonly PatternElement[];
  /** How the rule displays in diagnostics and failure messages; never parsed. */
  pattern: string;
  defaults?: Partial<SemanticProperties>;
  slots?: Readonly<Record<string, GrammarRuleSlotSpec>>;
  when?: GrammarGate;
}

/**
 * One slot of a compiled pattern (ADR-382 D4): the single source of a
 * slot's name, position, optionality, greediness and resolved type.
 */
export interface CompiledSlot {
  name: string;
  /** Index of the slot's token in `CompiledPattern.tokens`. */
  tokenIndex: number;
  optional: boolean;
  greedy: boolean;
  /** The configured type, `TEXT_GREEDY` for a greedy slot, else `ENTITY`. */
  slotType: SlotType;
  /** Set on every ENTITY slot at build (ADR-383 D1, D2); absent on every other slot type. */
  seat?: Seat;
}

/**
 * Compiled pattern for efficient matching
 */
export interface CompiledPattern {
  tokens: PatternToken[];
  /** Every slot, in pattern order. */
  slots: CompiledSlot[];
  /** The same slot records, by name. */
  slotsByName: ReadonlyMap<string, CompiledSlot>;
  minTokens: number;
}

/**
 * Slot match data with multi-object support
 */
export interface SlotMatch {
  tokens: number[];       // Token indices
  text: string;           // Combined text, as typed (its leading articles and determiners included)
  slotType?: SlotType;    // How the slot was matched
  // The one split of a noun phrase's leading articles and determiners (ADR-385 D2).
  // The English parser's slot consumers fill these from the tokens' parts of
  // speech; `articles.length + determiners.length` leading words of `text` are
  // the split, the rest are the phrase's content words.
  articles?: string[];     // Leading articles, normalized ("the", "a", "an")
  determiners?: string[];  // Leading determiners, normalized ("my", "some", "all"); for an all-phrase, the all word first
  ownedByActor?: boolean;  // A determiner marked the phrase as the actor's own ("my")
  // The entity ids a constrained slot admitted at parse time (ADR-385 D4), for
  // the validator to resolve among; absent for an unconstrained slot. A list
  // item carries its own.
  scope?: string[];
  // Multi-object support (ADR-080 Phase 2)
  isAll?: boolean;        // True if "all" keyword
  isList?: boolean;       // True if "X and Y" list
  items?: SlotMatch[];    // List items when isList is true
  excluded?: SlotMatch[]; // Excluded items for "all but X"
  // ADR-082: Vocabulary slots
  category?: string;      // For VOCABULARY: the category name matched
  matchedWord?: string;   // For VOCABULARY: normalized word that matched
  // ADR-082: Manner slots
  manner?: string;        // For MANNER: the manner adverb matched
  // ADR-089: Pronoun resolution
  isPronoun?: boolean;    // True if resolved via pronoun context
  entityId?: string;      // Pre-resolved entity ID from pronoun/scope resolution
  resolvedText?: string;  // Display text after resolution
}

/**
 * Result of pattern matching
 */
export interface PatternMatch {
  rule: GrammarRule;
  slots: Map<string, SlotMatch>;
  consumed: number; // Number of tokens consumed
  /**
   * Literal specificity (ADR-231 D2b): count of input words consumed by the
   * pattern's literal/alternate tokens (as opposed to slots). A rule whose
   * literals consume words outranks a rule whose unconstrained slot swallows
   * the same words. Resolution order (ADR-386 D5, ADR-384 D2,
   * `compareGrammarRank`): items naming nothing asc → literalSpecificity
   * desc → tier (story over standard) → definition order → names desc →
   * exact names desc.
   */
  literalSpecificity?: number;
  /**
   * How the reading's entity items resolve through the one noun matcher
   * (ADR-386 D4): items naming nothing, distinct entities named, items named
   * exactly. The engine computes it for every complete reading and ranks by
   * it; the parser compares it with the best failure's (D5).
   */
  nounRank: NounRank;
  semantics?: SemanticProperties; // Derived semantic properties
  /**
   * Every literal (word or alternation) element, in pattern order, with the
   * input tokens it consumed (ADR-383 D7) — where the verb phrase and the
   * preposition are read from.
   */
  literals: readonly MatchedElement[];
}

/** One pattern element as it matched the input (ADR-383 D7). */
export interface MatchedElement {
  /** Index of the element in `rule.compiledPattern.tokens`. */
  tokenIndex: number;
  /** Input token indices it consumed; empty for a skipped optional or article. */
  inputTokens: readonly number[];
}