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
import { Parser, ParserOptions, Token as InternalToken, InternalParseResult, ParserLanguageProvider, VerbVocabulary, VocabularyEntry, Constraint } from '@sharpee/if-domain';
import type { IParsedCommand, IValidatedCommand, IParseError as CoreParseError } from '@sharpee/world-model';
import type { ISystemEvent, Result } from '@sharpee/core';
import { GrammarBuilder } from '@sharpee/if-domain';
import { PronounContextManager } from './pronoun-context';
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
     * Replace direction word mappings and grammar patterns (ADR-143).
     *
     * Called when the direction vocabulary changes. Updates both
     * the parseDirection() maps and the grammar's bare-direction patterns.
     */
    setDirectionVocabulary(vocab: import('@sharpee/world-model').DirectionVocabulary): void;
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
     * Register story-specific grammar rules
     * @deprecated Use getStoryGrammar() for full API
     */
    registerGrammar(pattern: string, action: string, constraints?: Record<string, Constraint>): void;
    /**
     * Get the grammar builder for story-specific rules.
     * Stories use this to define custom grammar patterns.
     *
     * ADR-084: Returns the grammar builder directly instead of a wrapper,
     * giving stories full access to all PatternBuilder methods.
     */
    getStoryGrammar(): GrammarBuilder;
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
     * Called by the engine after command execution succeeds
     * @param command The validated command with resolved entity IDs
     * @param turnNumber Current turn number
     */
    updatePronounContext(command: IValidatedCommand, turnNumber: number): void;
    /**
     * Register an entity that was mentioned in context
     * Used when entities are referenced outside of standard parsing
     * @param entityId The entity's ID
     * @param text How the player referred to it
     * @param turnNumber Current turn number
     */
    registerPronounEntity(entityId: string, text: string, turnNumber: number): void;
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

### parse-failure

```typescript
/**
 * @file Parse Failure Tracking
 * @description Types and utilities for tracking partial match failures
 *              to provide better error messages (Phase 1.2 of parser recommendations)
 */
import type { ParseErrorCode } from '@sharpee/world-model';
/**
 * Reason why a pattern match failed
 */
export type MatchFailureReason = 'NO_TOKENS' | 'VERB_MISMATCH' | 'LITERAL_MISMATCH' | 'SLOT_FAILED' | 'LEFTOVER_TOKENS' | 'NOT_ENOUGH_TOKENS';
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
export declare function analyzeBestFailure(failures: PartialMatchFailure[], input: string, hasVerb: boolean): {
    code: ParseErrorCode;
    messageId: string;
    context: Record<string, any>;
};
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
 * - "take all. drop them" → "them" = all items taken
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
    /** Turn number when this reference was set */
    turnNumber: number;
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
     * Update pronoun context after a successful command execution
     * @param command The validated command with resolved entity IDs
     * @param world The world model (for entity lookup)
     * @param turnNumber Current turn number
     */
    updateFromCommand(command: IValidatedCommand, world: any, // WorldModel
    turnNumber: number): void;
    /**
     * Process a validated object reference and update context
     * Uses the already-resolved entity ID from validation
     */
    private processValidatedReference;
    /**
     * Register an entity that was mentioned (for external use)
     * This allows actions to register entities they interact with
     */
    registerEntity(entityId: string, text: string, world: any, turnNumber: number): void;
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
export { EnglishParser } from './english-parser';
export { EnglishParser as Parser } from './english-parser';
export type { Parser as ParserInterface } from '@sharpee/if-domain';
export type { PartialMatchFailure, SlotFailure, MatchFailureReason } from './parse-failure';
export { analyzeBestFailure } from './parse-failure';
export type { EntityReference, PronounContext, RecognizedPronoun } from './pronoun-context';
export { PronounContextManager, isRecognizedPronoun, RECOGNIZED_PRONOUNS, INANIMATE_IT, INANIMATE_THEM } from './pronoun-context';
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
