# @sharpee/parser-en-us

English parser, grammar patterns, story grammar extension API.

---

### english-parser

```typescript
/**
 * English Parser Implementation
 *
 * This parser handles English-specific grammar patterns and preserves all information
 * in rich structured commands.
 */
import { type Parser, type ParserOptions, type Token as InternalToken, type InternalParseResult, type ParserLanguageProvider, type VerbVocabulary, type VocabularyEntry } from '@sharpee/if-domain';
import type { IParsedCommand, IValidatedCommand, IParseError as CoreParseError } from '@sharpee/world-model';
import type { ISystemEvent, Result } from '@sharpee/core';
import { type GrammarBuilder } from '@sharpee/if-domain';
import { PronounContextManager } from './pronoun-context.js';
type CommandResult<T, E> = Result<T, E>;
/**
 * English parser with rich information preservation
 */
export declare class EnglishParser implements Parser {
    private options;
    private language;
    private onDebugEvent?;
    private platformEventEmitter?;
    private grammarEngine;
    private worldContext;
    /** Pronoun context manager for "it", "them", "him", "her" resolution (ADR-089) */
    private pronounContext;
    constructor(language: ParserLanguageProvider, options?: ParserOptions);
    /**
     * Initialize vocabulary from language provider
     */
    private initializeVocabulary;
    /**
     * Set debug event callback
     */
    setDebugCallback(callback: ((event: ISystemEvent) => void) | undefined): void;
    /**
     * Set platform event emitter for parser debugging
     */
    setPlatformEventEmitter(emitter: ((event: any) => void) | undefined): void;
    /**
     * Set the world context for scope constraint evaluation
     */
    setWorldContext(world: any, actorId: string, currentLocation: string): void;
    /**
     * Emit a platform debug event
     */
    private emitPlatformEvent;
    /**
     * Register additional verbs after parser creation
     * Used for story-specific vocabulary
     */
    registerVerbs(verbs: VerbVocabulary[]): void;
    /**
     * Register additional vocabulary entries
     * More generic than registerVerbs - can handle any part of speech
     */
    registerVocabulary(entries: VocabularyEntry[]): void;
    /**
     * Parse input text into structured command with rich information
     */
    parse(input: string): CommandResult<IParsedCommand, CoreParseError>;
    /**
     * Parse input that may contain multiple commands separated by periods or commas.
     * Returns an array of parsed commands (or errors).
     *
     * Period chaining:
     * - "take sword. go north." → [take sword, go north]
     *
     * Comma chaining (only when verb detected after comma):
     * - "take sword, drop it" → [take sword, drop it] (verb after comma)
     * - "take knife, lamp" → single command with list (no verb after comma)
     *
     * Examples:
     * - "take sword. go north." → [take sword, go north]
     * - "take sword" → [take sword]
     * - "take sword. invalid. go north" → [take sword, error, go north]
     */
    parseChain(input: string): CommandResult<IParsedCommand, CoreParseError>[];
    /**
     * Split a segment on commas only if a verb is detected after the comma.
     * "take knife, drop lamp" → ["take knife", "drop lamp"] (verb after comma)
     * "take knife, lamp" → ["take knife, lamp"] (no verb, treat as list)
     */
    private splitOnCommasIfChain;
    /**
     * Split input on periods, preserving quoted strings.
     * Handles edge cases like trailing periods and empty segments.
     */
    private splitOnPeriods;
    /**
     * Tokenize input with rich information preservation
     */
    private tokenizeRich;
    /**
     * Find possible command structures in the tokens
     */
    private findCommandStructures;
    /**
     * Convert a grammar match to a RichCandidate
     */
    private convertGrammarMatch;
    /**
     * A noun phrase from a slot match (ADR-385 D2).
     *
     * The slot consumer split the leading articles and determiners once; the
     * words of `text` after that split are the phrase's content: `text`, the
     * `head` (its last word) and the `modifiers` (the words before the head).
     * A pronoun-resolved match carries the referent's name as its text with
     * no split, so the whole of it is content. A bare all-phrase has no
     * content words. A constrained slot's admitted ids travel as `scope`
     * (ADR-385 D4).
     *
     * @param slot The slot match, its items or exclusions
     * @returns The noun phrase, with any pre-resolved entity id (ADR-089)
     */
    private nounPhraseFrom;
    /**
     * Get the grammar builder for story-specific rules.
     * Stories use this to define custom grammar patterns.
     *
     * ADR-084: Returns the grammar builder directly instead of a wrapper,
     * giving stories full access to all PatternBuilder methods.
     *
     * ADR-268 D2: rules built here register at the 'story' tier and outrank
     * the standard grammar unconditionally.
     */
    getStoryGrammar(): GrammarBuilder;
    /**
     * Action ids reachable from this parser's registered grammar rules.
     *
     * On a freshly constructed parser this is exactly the core-grammar surface;
     * after story grammar registration it includes story-added ids too. Consumed
     * by the stdlib reachability gate (ADR-230 D1), which asserts every wired
     * action is player-reachable.
     *
     * @returns set of action ids some grammar pattern maps to
     */
    getReachableActionIds(): Set<string>;
    /**
     * Source pattern strings of this parser's registered grammar rules
     * (e.g. `"lock :target with|using :key"`). Consumed by the stdlib
     * verb-reachability gate (ADR-230 D4 — PIN 1 amendment, 2026-07-17)
     * to assert every lang-declared verb phrase leads some pattern.
     *
     * @returns pattern strings, one per rule
     */
    getGrammarPatterns(): string[];
    /**
     * Get candidate interpretations for a token
     */
    private getTokenCandidates;
    /**
     * Old tokenize method for compatibility
     */
    tokenize(input: string): InternalToken[];
    /**
     * Parse with errors for testing compatibility
     */
    parseWithErrors(input: string, options?: ParserOptions): InternalParseResult;
    /**
     * Add a custom verb to the parser vocabulary
     * @param actionId The action ID this verb maps to
     * @param verbs Array of verb forms to recognize
     * @param pattern Optional grammar pattern for the verb (e.g., 'VERB_OBJ')
     * @param prepositions Optional prepositions this verb can use
     */
    addVerb(actionId: string, verbs: string[], pattern?: string, prepositions?: string[]): void;
    /**
     * Add a custom noun/synonym to the parser vocabulary
     * @param word The word to add
     * @param canonical The canonical form it maps to
     */
    addNoun(word: string, canonical: string): void;
    /**
     * Add a custom adjective to the parser vocabulary
     * @param word The adjective to add
     */
    addAdjective(word: string): void;
    /**
     * Add a custom preposition to the parser vocabulary
     * @param word The preposition to add
     */
    addPreposition(word: string): void;
    /**
     * Build a detailed parse error from failure analysis
     */
    private buildParseError;
    /**
     * Update pronoun context after a successful command execution
     * Called by the engine after command execution succeeds; the referent
     * follows the command's roles (ADR-385 D7)
     * @param command The validated command with resolved entity IDs
     */
    updatePronounContext(command: IValidatedCommand): void;
    /**
     * Register an entity that was mentioned in context
     * Used when entities are referenced outside of standard parsing
     * @param entityId The entity's ID
     * @param text How the player referred to it
     */
    registerPronounEntity(entityId: string, text: string): void;
    /**
     * Reset the pronoun context
     * Called on game restart or when context should be cleared
     */
    resetPronounContext(): void;
    /**
     * Get the last successfully parsed command
     * Used for "again" / "g" command support
     */
    getLastCommand(): IParsedCommand | null;
    /**
     * Get the pronoun context manager (for testing/debugging)
     */
    getPronounContextManager(): PronounContextManager;
}
export {};
```

### english-pattern-compiler

```typescript
/**
 * @file English Pattern Compiler
 * @description English-specific implementation of pattern compilation.
 *
 * Public interface: EnglishPatternCompiler (parse, compile).
 * Owner context: parser-en-us. `parse` is the `define(text)` front end, the
 * one place pattern text is read (ADR-382 D3); `compile` turns structured
 * parts into the matcher's tokens and one record per slot (D4).
 */
import { type PatternCompiler, type CompiledPattern, type PatternElement, type ParserLanguageProvider } from '@sharpee/if-domain';
/**
 * English-specific pattern compiler
 * Handles patterns like: "put :item in|into :container"
 *
 * The articles come from the language provider the parser was constructed
 * with (ADR-387 D1): a pattern's article after its first element is never
 * required of the player (ADR-380 D2), and which words are articles is the
 * language's to say.
 */
export declare class EnglishPatternCompiler implements PatternCompiler {
    private readonly articles;
    /**
     * @param language the provider whose articles the compiler discounts
     */
    constructor(language: ParserLanguageProvider);
    /**
     * Parse pattern text into parts. Elements are whitespace-separated: a
     * word, an alternation `a|b`, or a slot `:name` (greedy `:name...`); any
     * one element may be bracketed `[…]` to make it optional. A bracket that
     * does not wrap exactly one element is refused (ADR-382 D3, Q-5).
     * @param pattern The pattern text
     * @returns The pattern's elements, in order
     * @throws PatternSyntaxError, with the offending offset, on an empty
     *   pattern, an unclosed `[`, a stray `]`, a nested or empty bracket, a
     *   multi-word optional, an invalid slot name or an empty alternation
     */
    parse(pattern: string): PatternElement[];
    /**
     * Compile parts into tokens and slot records. Words and alternates are
     * lowercased here, the one place every literal passes, Chord's and a TS
     * story's alike (parser review B3).
     * @param parts The pattern's elements
     * @param source The rule's display text, quoted in error messages only
     * @returns The compiled pattern
     * @throws PatternSyntaxError on an empty pattern, an invalid or duplicate
     *   slot name, or an empty alternation
     */
    compile(parts: readonly PatternElement[], source?: string): CompiledPattern;
    /**
     * One unbracketed element's text → its part.
     * @param body The element's text, brackets removed
     * @param optional Whether it was bracketed
     * @param pattern The whole pattern, for error messages
     * @param at The element's offset in the pattern
     */
    private parseElement;
}
```

### parse-failure

```typescript
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
import { type GrammarTier, type NounRank, type PatternElement, type Seat, type SlotMatch } from '@sharpee/if-domain';
/**
 * Reason why a pattern match failed
 */
export type MatchFailureReason = 'NO_TOKENS' | 'VERB_MISMATCH' | 'LITERAL_MISMATCH' | 'SLOT_FAILED' | 'LEFTOVER_TOKENS' | 'NOT_ENOUGH_TOKENS';
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
export declare function bestFailure(failures: readonly PartialMatchFailure[]): PartialMatchFailure | undefined;
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
export declare function failureOutranking(failures: readonly PartialMatchFailure[], reading: NounRank): PartialMatchFailure | undefined;
/**
 * Analyze partial match failures to determine the best error to report
 */
export declare function analyzeBestFailure(failures: PartialMatchFailure[], input: string, hasVerb: boolean): {
    code: ParseErrorCode;
    messageId: string;
    context: Record<string, any>;
};
```

### reading-names

```typescript
/**
 * @file Reading names — how a reading's entity items resolve, for ranking
 * @description Computes a reading's noun rank (ADR-386 D4): each entity item
 * of the reading — a single noun, each list item, each exclusion, an all
 * phrase, a pronoun — is named through the one noun matcher over everything
 * in the world, and the rank counts the items naming nothing, the distinct
 * entities named and the items named exactly. The parser ranks by it; the
 * validator resolves, so no entity id leaves this module.
 *
 * Public interface: ReadingNamer (rankOf).
 * Owner context: parser-en-us grammar matching (the English grammar engine
 * is the caller, once per `findMatches`).
 */
import { type GrammarContext, type NounRank, type SlotMatch } from '@sharpee/if-domain';
/**
 * Names the items of readings against one world, remembering each item's
 * answer for the readings that share it.
 */
export declare class ReadingNamer {
    private readonly world;
    private readonly actorId;
    private readonly cache;
    constructor(context: GrammarContext);
    /**
     * The noun rank of a reading, or of the slots a failure had filled.
     * @param slots The slot matches of the reading
     * @returns Items naming nothing, distinct entities named, items named exactly
     */
    rankOf(slots: ReadonlyMap<string, SlotMatch>): NounRank;
    private tallySlot;
    private tallyItem;
    /**
     * The entities one item names: a pronoun's referent, exact; a gated item's
     * admitted ids (ADR-385 D4), exact when any admitted entity is named
     * exactly; otherwise everything in the world the matcher names, at the
     * best tier any entity reaches.
     */
    private namesOf;
    /** A gated item names what its gate admitted. */
    private namesAmong;
    /** An ungated item names every entity in the world the matcher names, at the best tier reached. */
    private namesInWorld;
}
```

### pronoun-context

```typescript
/**
 * @file Pronoun Context for Parser (ADR-089 Phase B)
 * @description Tracks entity references for pronoun resolution
 *
 * Enables commands like:
 * - "take lamp. light it" → "it" = lamp
 * - "talk to Alice. give her the key" → "her" = Alice
 * - "take sword and lantern. drop them" → "them" = the list's entities
 *
 * The referent follows the command's roles (ADR-385 D7): the direct object,
 * else the indirect object, else the instrument; a list sets `them` to every
 * entity it resolved. `take all. drop them` is not supported: `all` expands
 * inside the action, after validation, where the pronoun context never sees it.
 */
import type { IParsedCommand, IValidatedCommand, PronounSet } from '@sharpee/world-model';
/**
 * Reference to an entity mentioned in a command
 */
export interface EntityReference {
    /** The entity's ID */
    entityId: string;
    /** How the player referred to it ("the lamp", "Alice") */
    text: string;
}
/**
 * Context for resolving pronouns in commands
 */
export interface PronounContext {
    /**
     * Inanimate singular - last direct object that's not an actor
     * Used for "it" resolution
     */
    it: EntityReference | null;
    /**
     * Plural - last list, "all" result, or plural entity
     * Used for "them" resolution (inanimate plural)
     */
    them: EntityReference[] | null;
    /**
     * Animate by object pronoun - keyed by the object pronoun form
     * "him" → entity using he/him
     * "her" → entity using she/her
     * Also handles animate singular "them" and neopronouns
     */
    animateByPronoun: Map<string, EntityReference>;
    /**
     * Last successful command (for "again"/"g" command)
     */
    lastCommand: IParsedCommand | null;
}
/**
 * Standard pronouns that the parser should recognize
 */
export declare const RECOGNIZED_PRONOUNS: readonly ["it", "them", "him", "her", "xem", "zir", "hir", "em", "faer"];
export type RecognizedPronoun = typeof RECOGNIZED_PRONOUNS[number];
/**
 * Check if a word is a recognized pronoun
 */
export declare function isRecognizedPronoun(word: string): word is RecognizedPronoun;
/**
 * Inanimate pronoun sets for objects without ActorTrait
 */
export declare const INANIMATE_IT: PronounSet;
export declare const INANIMATE_THEM: PronounSet;
/**
 * Set the global pronoun context manager (called by parser)
 */
export declare function setPronounContextManager(manager: PronounContextManager | null): void;
/**
 * Get the global pronoun context manager (used by slot consumers)
 */
export declare function getPronounContextManager(): PronounContextManager | null;
/**
 * Manager for pronoun context
 * Handles updating and resolving pronoun references
 */
export declare class PronounContextManager {
    private context;
    constructor();
    /**
     * Create an empty pronoun context
     */
    private createEmptyContext;
    /**
     * Reset the pronoun context (e.g., on game restart)
     */
    reset(): void;
    /**
     * Get the current pronoun context (for debugging/testing)
     */
    getContext(): Readonly<PronounContext>;
    /**
     * Resolve a pronoun to entity references
     * @param pronoun The pronoun to resolve ("it", "him", "her", "them", etc.)
     * @returns Entity reference(s) or null if no match
     */
    resolve(pronoun: string): EntityReference[] | null;
    /**
     * Update pronoun context after a successful command execution (ADR-385 D7).
     *
     * The referent follows the command's roles: a list sets `them` to every
     * entity in `directObjects`; otherwise the direct object sets the pronoun,
     * and only when there is none does the indirect object, and then the
     * instrument. So after `unlock door with key`, `it` is the door.
     *
     * @param command The validated command with resolved entity IDs
     * @param world The world model (for entity lookup)
     */
    updateFromCommand(command: IValidatedCommand, world: any): void;
    /**
     * Process a validated object reference and update context
     * Uses the already-resolved entity ID from validation
     */
    private processValidatedReference;
    /**
     * Register an entity that was mentioned (for external use)
     * This allows actions to register entities they interact with
     */
    registerEntity(entityId: string, text: string, world: any): void;
    /**
     * Get the last successful command (for "again" support)
     */
    getLastCommand(): IParsedCommand | null;
}
```

### index

```typescript
/**
 * English (US) Parser for Sharpee Interactive Fiction Platform
 *
 * This package provides English-specific parsing functionality
 * for converting natural language commands into structured commands.
 */
export { EnglishParser } from './english-parser.js';
export { EnglishParser as Parser } from './english-parser.js';
export { EnglishPatternCompiler } from './english-pattern-compiler.js';
export type { Parser as ParserInterface } from '@sharpee/if-domain';
export type { PartialMatchFailure, SlotFailure, MatchFailureReason } from './parse-failure.js';
export { analyzeBestFailure, bestFailure, failureOutranking } from './parse-failure.js';
export { ReadingNamer } from './reading-names.js';
export type { EntityReference, PronounContext, RecognizedPronoun } from './pronoun-context.js';
export { PronounContextManager, getPronounContextManager, isRecognizedPronoun, RECOGNIZED_PRONOUNS, INANIMATE_IT, INANIMATE_THEM } from './pronoun-context.js';
/**
 * Package metadata
 */
export declare const metadata: {
    languageCode: string;
    languageName: string;
    parserVersion: string;
    supportedPatterns: string[];
    features: string[];
};
```
