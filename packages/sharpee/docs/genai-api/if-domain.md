# @sharpee/if-domain

Domain events, contracts, grammar system, language/parser provider interfaces.

---

### events

```typescript
/**
 * Standard Interactive Fiction events.
 *
 * These are the core events that can occur in the IF world model.
 * Extensions can add their own events using namespaced identifiers.
 */
export declare const IFEvents: {
    readonly TAKEN: "taken";
    readonly DROPPED: "dropped";
    readonly MOVED: "moved";
    readonly EXAMINED: "examined";
    readonly PUT_IN: "put_in";
    readonly PUT_ON: "put_on";
    readonly REMOVED_FROM: "removed_from";
    readonly ITEM_PUT_ON: "item_put_on";
    readonly ITEM_REMOVED_FROM: "item_removed_from";
    readonly CONTAINER_EMPTIED: "container_emptied";
    readonly CONTAINER_NOT_OPEN: "container_not_open";
    readonly NOT_A_CONTAINER: "not_a_container";
    readonly NOT_A_SUPPORTER: "not_a_supporter";
    readonly DOESNT_FIT: "doesnt_fit";
    readonly OPENED: "opened";
    readonly CLOSED: "closed";
    readonly NOT_OPENABLE: "not_openable";
    readonly LOCKED: "locked";
    readonly UNLOCKED: "unlocked";
    readonly CONTAINER_LOCKED: "container_locked";
    readonly CONTAINER_UNLOCKED: "container_unlocked";
    readonly ALREADY_LOCKED: "already_locked";
    readonly ALREADY_UNLOCKED: "already_unlocked";
    readonly UNLOCK_FAILED: "unlock_failed";
    readonly NOT_LOCKABLE: "not_lockable";
    readonly SWITCHED_ON: "switched_on";
    readonly SWITCHED_OFF: "switched_off";
    readonly DEVICE_SWITCHED_ON: "device_switched_on";
    readonly DEVICE_SWITCHED_OFF: "device_switched_off";
    readonly DEVICE_ACTIVATED: "device_activated";
    readonly WORN: "worn";
    readonly REMOVED: "removed";
    readonly EATEN: "eaten";
    readonly DRUNK: "drunk";
    readonly ITEM_EATEN: "item_eaten";
    readonly ITEM_DRUNK: "item_drunk";
    readonly ITEM_DESTROYED: "item_destroyed";
    readonly ACTOR_MOVED: "actor_moved";
    readonly ACTOR_ENTERED: "actor_entered";
    readonly ACTOR_EXITED: "actor_exited";
    readonly MOVEMENT_BLOCKED: "movement_blocked";
    readonly ENTERED: "entered";
    readonly EXITED: "exited";
    readonly EVACUATED: "evacuated";
    readonly CLIMBED: "climbed";
    readonly ROOM_ENTERED: "room_entered";
    readonly ROOM_EXITED: "room_exited";
    readonly ROOM_DESCRIBED: "room_described";
    readonly ROOM_FIRST_ENTERED: "room_first_entered";
    readonly ROOM_ILLUMINATED: "room_illuminated";
    readonly ROOM_DARKENED: "room_darkened";
    readonly NEW_EXIT_REVEALED: "new_exit_revealed";
    readonly LIGHT_CHANGED: "light_changed";
    readonly LOCATION_ILLUMINATED: "location_illuminated";
    readonly LOCATION_DARKENED: "location_darkened";
    readonly FUEL_DEPLETED: "fuel_depleted";
    readonly FUEL_LOW: "fuel_low";
    readonly REFUELED: "refueled";
    readonly READ: "read";
    readonly SEARCHED: "searched";
    readonly LISTENED: "listened";
    readonly SMELLED: "smelled";
    readonly TOUCHED: "touched";
    readonly GIVEN: "given";
    readonly SHOWN: "shown";
    readonly THROWN: "thrown";
    readonly PUSHED: "pushed";
    readonly PULLED: "pulled";
    readonly TURNED: "turned";
    readonly USED: "used";
    readonly CUSTOM_MESSAGE: "custom_message";
    readonly VISIBILITY_CHANGED: "visibility_changed";
    readonly ACTION_PREVENTED: "action_prevented";
    readonly ACTION_FAILED: "action_failed";
    readonly ACTION_SUCCEEDED: "action_succeeded";
    readonly WAITED: "waited";
    readonly SCORE_DISPLAYED: "score_displayed";
    readonly HELP_DISPLAYED: "help_displayed";
    readonly ABOUT_DISPLAYED: "about_displayed";
    readonly SCORE_GAINED: "if.event.score_gained";
    readonly SCORE_LOST: "if.event.score_lost";
};
export type IFEventType = typeof IFEvents[keyof typeof IFEvents];
/**
 * Event categories for filtering and handling
 */
export declare const IFEventCategory: {
    readonly MANIPULATION: "manipulation";
    readonly MOVEMENT: "movement";
    readonly STATE_CHANGE: "state_change";
    readonly PERCEPTION: "perception";
    readonly META: "meta";
};
export type IFEventCategoryType = typeof IFEventCategory[keyof typeof IFEventCategory];
/**
 * Event processor wiring types (ADR-086)
 *
 * These types allow WorldModel to wire its event handlers to the engine's
 * EventProcessor without creating a circular dependency.
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Callback for registering a handler with the event processor.
 * The handler returns an array (Effect[] in practice, but typed loosely to avoid circular deps).
 */
export type EventProcessorRegisterFn = (eventType: string, handler: (event: ISemanticEvent) => unknown[]) => void;
/**
 * Interface for wiring WorldModel handlers to EventProcessor.
 * WorldModel receives this during engine initialization.
 */
export interface IEventProcessorWiring {
    /**
     * Register a handler with the event processor
     */
    registerHandler: EventProcessorRegisterFn;
}
```

### contracts

```typescript
/**
 * Domain contracts for world state changes and event processing
 */
import { ISemanticEvent, IEntity } from '@sharpee/core';
/**
 * Represents a change to the world state
 */
export interface WorldChange {
    type: 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
    entityId: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    details?: Record<string, unknown>;
}
/**
 * Configuration for world model behavior
 */
export interface WorldConfig {
    enableSpatialIndex?: boolean;
    maxDepth?: number;
    strictMode?: boolean;
}
/**
 * World state storage
 */
export interface WorldState {
    [key: string]: any;
}
/**
 * Options for finding entities
 */
export interface FindOptions {
    includeScenery?: boolean;
    includeInvisible?: boolean;
    maxDepth?: number;
}
/**
 * Options for getting contents
 */
export interface ContentsOptions {
    recursive?: boolean;
    includeWorn?: boolean;
    visibleOnly?: boolean;
}
/**
 * Result of processing events
 */
export interface ProcessedEvents {
    /**
     * Events that were successfully applied
     */
    applied: ISemanticEvent[];
    /**
     * Events that failed validation
     */
    failed: Array<{
        event: ISemanticEvent;
        reason: string;
    }>;
    /**
     * World changes that occurred
     */
    changes: WorldChange[];
    /**
     * Events generated as reactions to the processed events
     */
    reactions: ISemanticEvent[];
}
/**
 * Options for event processing
 */
export interface ProcessorOptions {
    /**
     * Whether to validate events before applying them
     */
    validate?: boolean;
    /**
     * Whether to preview changes before applying
     */
    preview?: boolean;
    /**
     * Maximum depth for reaction processing
     */
    maxReactionDepth?: number;
}
/**
 * Simple command input for actions
 *
 * This is what actions receive - no parser internals, just the essentials.
 * The rich parsing data stays in world-model where it belongs.
 */
export interface CommandInput {
    /** The action being executed */
    actionId: string;
    /** Direct object if present */
    directObject?: EntityReference;
    /** Indirect object if present */
    indirectObject?: EntityReference;
    /** Preposition used (if any) - raw text for backward compatibility */
    preposition?: string;
    /** Semantic properties derived from grammar */
    semantics?: CommandSemantics;
    /** Original input text for reference */
    inputText: string;
}
/**
 * Semantic properties derived from grammar rules
 *
 * These replace the need for actions to inspect verb.text, preposition variations,
 * or modify parsed commands. The grammar rules provide normalized semantic meaning.
 */
export interface CommandSemantics {
    /** How the action should be performed */
    manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy' | 'quick';
    /** Spatial relationship (normalized from preposition variations) */
    spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside' | 'above' | 'below';
    /** Movement direction (normalized from direction variations) */
    direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'northeast' | 'northwest' | 'southeast' | 'southwest' | 'in' | 'out';
    /** Whether a preposition was implicit in the grammar */
    implicitPreposition?: boolean;
    /** Whether a direction was implicit */
    implicitDirection?: boolean;
    /** Action-specific semantics */
    custom?: Record<string, any>;
}
/**
 * Reference to an entity in a command
 */
export interface EntityReference {
    /** The resolved entity */
    entity: IEntity;
    /** The text that matched this entity */
    matchedText: string;
    /** How the entity was referenced */
    referenceType?: 'name' | 'pronoun' | 'definite' | 'indefinite';
}
/**
 * Validation result from an action
 */
export interface ValidationResult {
    /** Whether the action can proceed */
    valid: boolean;
    /** Error code if validation failed */
    error?: string;
    /** Parameters for error message formatting */
    params?: Record<string, any>;
}
/**
 * Context provided to actions
 *
 * This is the contract for what actions can access.
 * No world-model internals, no parser details.
 */
export interface IActionContext {
    /** The player entity */
    readonly player: IEntity;
    /** The player's current location */
    readonly currentLocation: IEntity;
    /** The command being executed */
    readonly command: CommandInput;
    /** The action being executed */
    readonly action: IAction;
    /**
     * Check if an entity is visible to the player
     */
    canSee(entity: IEntity): boolean;
    /**
     * Check if an entity is reachable by the player
     */
    canReach(entity: IEntity): boolean;
    /**
     * Check if an entity can be taken by the player
     */
    canTake(entity: IEntity): boolean;
    /**
     * Check if an entity is in scope for the player
     */
    isInScope(entity: IEntity): boolean;
    /**
     * Get all visible entities
     */
    getVisible(): IEntity[];
    /**
     * Get all entities in scope
     */
    getInScope(): IEntity[];
    /**
     * Get an entity by ID
     */
    getEntity(entityId: string): IEntity | undefined;
    /**
     * Get an entity's location
     */
    getEntityLocation(entityId: string): string | undefined;
    /**
     * Get entities contained within an entity
     */
    getEntityContents(entityId: string): IEntity[];
    /**
     * Get the room containing an entity
     */
    getContainingRoom(entityId: string): IEntity | undefined;
    /**
     * Get a world capability (scoring, etc.)
     */
    getWorldCapability(name: string): any;
    /**
     * Move an entity to a new location
     */
    moveEntity(entityId: string, newLocationId: string): boolean;
    /**
     * Create an event
     */
    event(type: string, data: any): ISemanticEvent;
}
/**
 * Action contract
 *
 * Actions implement game verbs. They validate and execute commands.
 */
export interface IAction {
    /** Unique identifier */
    id: string;
    /** Validate if the action can be executed */
    validate(context: IActionContext): ValidationResult;
    /** Execute the action and return events */
    execute(context: IActionContext): ISemanticEvent[];
    /** Required message IDs for this action */
    requiredMessages?: string[];
    /** Optional description for help/documentation */
    descriptionMessageId?: string;
    /** Optional examples for help/documentation */
    examplesMessageId?: string;
}
/**
 * Action registry contract
 */
export interface IActionRegistry {
    /** Register an action */
    register(action: IAction): void;
    /** Get an action by ID */
    get(actionId: string): IAction | undefined;
    /** Get all registered actions */
    getAll(): IAction[];
    /** Check if an action exists */
    has(actionId: string): boolean;
}
/**
 * Scope levels for entity visibility and accessibility
 */
export type ScopeLevel = 'carried' | 'reachable' | 'visible' | 'audible' | 'detectable' | 'out_of_scope';
/**
 * Basic scope resolver interface for actions
 */
export interface IScopeResolver {
    /**
     * Get the highest level of scope for a target entity
     */
    getScope(actor: IEntity, target: IEntity): ScopeLevel;
    /**
     * Check if actor can see the target
     */
    canSee(actor: IEntity, target: IEntity): boolean;
    /**
     * Check if actor can physically reach the target
     */
    canReach(actor: IEntity, target: IEntity): boolean;
}
```

### changes

```typescript
/**
 * Domain types for world state changes
 */
/**
 * Types of changes that can occur in the world
 */
export type WorldChangeType = 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
```

### language-provider

```typescript
/**
 * Language provider interface for Interactive Fiction
 *
 * This interface defines the contract for providing localized text,
 * action patterns, and message formatting throughout the IF system.
 *
 * Implementations should handle:
 * - Action patterns (verb synonyms)
 * - Message text with parameter substitution
 * - Localization and customization
 */
/**
 * Structured help information for an action
 */
export interface ActionHelp {
    /**
     * Brief description of what the action does
     */
    description: string;
    /**
     * Verb forms and patterns that trigger this action
     * Extracted from the patterns array
     */
    verbs: string[];
    /**
     * Example commands showing usage
     */
    examples: string[];
    /**
     * The one-line help summary (from help_<action> message)
     * Format: "VERB/VERB - Description. Example: COMMAND"
     */
    summary?: string;
}
/**
 * Language provider interface
 */
export interface LanguageProvider {
    /**
     * The language code this provider supports (e.g., 'en-us', 'es-es')
     */
    readonly languageCode: string;
    /**
     * Get patterns/aliases for an action
     * @param actionId The action identifier (e.g., 'if.action.taking')
     * @returns Array of patterns or undefined if action not found
     */
    getActionPatterns(actionId: string): string[] | undefined;
    /**
     * Get a message by ID with optional parameter substitution
     * @param messageId The message identifier
     * @param params Optional parameters for substitution
     * @returns The formatted message
     */
    getMessage(messageId: string, params?: Record<string, any>): string;
    /**
     * Check if a message exists
     * @param messageId The message identifier
     * @returns True if the message exists
     */
    hasMessage(messageId: string): boolean;
    /**
     * Get structured help information for an action
     * @param actionId The action identifier (e.g., 'if.action.taking')
     * @returns Structured help information or undefined if not found
     */
    getActionHelp?(actionId: string): ActionHelp | undefined;
    /**
     * Get all supported actions
     * @returns Array of action IDs
     */
    getSupportedActions?(): string[];
    /**
     * Get all registered message IDs and their text.
     * Used by tooling (VS Code extension) for language introspection.
     * @returns Map of message ID to text, or undefined if not supported
     */
    getAllMessages?(): Map<string, string>;
}
/**
 * Language provider registry interface
 */
export interface LanguageProviderRegistry {
    /**
     * Register a language provider
     * @param provider The language provider to register
     */
    register(provider: LanguageProvider): void;
    /**
     * Get a language provider by code
     * @param languageCode The language code (e.g., 'en-us')
     * @returns The provider or undefined if not found
     */
    get(languageCode: string): LanguageProvider | undefined;
    /**
     * Get the default language provider
     * @returns The default provider
     * @throws Error if no default provider is set
     */
    getDefault(): LanguageProvider;
    /**
     * Set the default language provider
     * @param languageCode The language code to set as default
     */
    setDefault(languageCode: string): void;
    /**
     * Get all registered language codes
     * @returns Array of language codes
     */
    getAvailableLanguages(): string[];
}
```

### parser-language-provider

```typescript
/**
 * Parser Language Provider Interface
 *
 * Extends the base LanguageProvider with parser-specific functionality.
 * Language implementations must provide both text/messaging capabilities
 * and parser vocabulary/grammar rules.
 */
import { LanguageProvider } from './language-provider';
import { VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from './vocabulary-contracts/vocabulary-types';
/**
 * Language-specific grammar pattern definition
 * Different from the vocabulary-types GrammarPattern
 */
export interface LanguageGrammarPattern {
    name: string;
    pattern: string;
    example: string;
    priority: number;
}
/**
 * Parser-specific language provider interface
 *
 * Extends the base LanguageProvider with methods needed for parsing
 * natural language commands. Each language implementation must provide
 * vocabulary data and grammar rules specific to that language.
 */
export interface ParserLanguageProvider extends LanguageProvider {
    /**
     * Get verb vocabulary for the language
     * @returns Array of verb vocabulary entries
     */
    getVerbs(): VerbVocabulary[];
    /**
     * Get directional vocabulary for the language
     * @returns Array of direction vocabulary entries
     */
    getDirections(): DirectionVocabulary[];
    /**
     * Get special vocabulary (articles, pronouns, etc.)
     * @returns Special vocabulary object
     */
    getSpecialVocabulary(): SpecialVocabulary;
    /**
     * Get prepositions for the language
     * @returns Array of preposition strings
     */
    getPrepositions(): string[];
    /**
     * Get determiners for the language
     * @returns Array of determiner strings
     */
    getDeterminers(): string[];
    /**
     * Get conjunctions for the language
     * @returns Array of conjunction strings
     */
    getConjunctions(): string[];
    /**
     * Get number words for the language
     * @returns Array of number strings (both words and digits)
     */
    getNumbers(): string[];
    /**
     * Get grammar patterns for the language
     * @returns Array of grammar pattern definitions
     */
    getGrammarPatterns(): LanguageGrammarPattern[];
    /**
     * Lemmatize a word (reduce to base form)
     * @param word The word to lemmatize
     * @returns The base form of the word
     */
    lemmatize(word: string): string;
    /**
     * Expand an abbreviation
     * @param abbreviation The abbreviation to expand
     * @returns The expanded form or null if not recognized
     */
    expandAbbreviation(abbreviation: string): string | null;
    /**
     * Format a list of items with proper conjunction
     * @param items Array of strings to format
     * @param conjunction 'and' or 'or'
     * @returns Formatted string (e.g., "a, b, and c")
     */
    formatList(items: string[], conjunction: 'and' | 'or'): string;
    /**
     * Get the appropriate indefinite article for a noun
     * @param noun The noun to get article for
     * @returns 'a' or 'an'
     */
    getIndefiniteArticle(noun: string): string;
    /**
     * Pluralize a noun
     * @param noun The noun to pluralize
     * @returns The plural form
     */
    pluralize(noun: string): string;
    /**
     * Check if a word should be ignored in parsing
     * @param word The word to check
     * @returns True if the word should be ignored
     */
    isIgnoreWord(word: string): boolean;
    /**
     * Get common adjectives for the language
     * @returns Array of common adjective strings
     */
    getCommonAdjectives(): string[];
    /**
     * Get common nouns for the language
     * @returns Array of common noun strings
     */
    getCommonNouns(): string[];
    /**
     * Get entity name/description
     * @param entity Entity object or ID
     * @returns Entity name or fallback
     */
    getEntityName(entity: any): string;
    /**
     * Get verb mappings (alternative to getVerbs)
     * @returns Record mapping action IDs to verb arrays
     */
    getVerbMappings?(): Record<string, string[]>;
    /**
     * Get verb pattern for a specific action
     * @param actionId The action ID
     * @returns The pattern string or undefined
     */
    getVerbPattern?(actionId: string): string | undefined;
    /**
     * Get direction mappings (alternative to getDirections)
     * @returns Record mapping directions to word arrays
     */
    getDirectionMappings?(): Record<string, string[]>;
    /**
     * Get pronouns (alternative to getSpecialVocabulary)
     * @returns Array of pronoun strings
     */
    getPronouns?(): string[];
    /**
     * Get all words (alternative to getSpecialVocabulary)
     * @returns Array of words meaning "all"
     */
    getAllWords?(): string[];
    /**
     * Get except words (alternative to getSpecialVocabulary)
     * @returns Array of words meaning "except"
     */
    getExceptWords?(): string[];
    /**
     * Get articles (alternative to getSpecialVocabulary)
     * @returns Array of article strings
     */
    getArticles?(): string[];
}
```

### parser-contracts/parser-types

```typescript
/**
 * Parser types and interfaces
 *
 * The parser is world-agnostic and produces parsed commands
 * that must be resolved against the world model.
 */
import { PartOfSpeech, VerbVocabulary, VocabularyEntry } from '../vocabulary-contracts/vocabulary-types';
import type { ISystemEvent } from '@sharpee/core';
/**
 * Base parser interface that can be extended
 */
export interface BaseParser {
    /**
     * Parse input text into structured command
     * @param input Raw text input
     * @returns Parsed command or parse error
     */
    parse(input: string): any;
}
/**
 * A token from the lexer
 */
export interface Token {
    /**
     * The original word
     */
    word: string;
    /**
     * Normalized form (lowercase, etc.)
     */
    normalized: string;
    /**
     * Position in the input
     */
    position: number;
    /**
     * Possible parts of speech for this token
     */
    candidates: TokenCandidate[];
}
/**
 * A candidate interpretation of a token
 */
export interface TokenCandidate {
    /**
     * Part of speech
     */
    partOfSpeech: PartOfSpeech;
    /**
     * What this token maps to
     */
    mapsTo: string;
    /**
     * Priority for disambiguation
     */
    priority: number;
    /**
     * Source of this interpretation
     */
    source?: string;
    /**
     * Additional metadata
     */
    metadata?: Record<string, unknown>;
}
/**
 * Parser options
 */
export interface ParserOptions {
    /**
     * Whether to allow partial matches
     */
    allowPartial?: boolean;
    /**
     * Whether to expand abbreviations
     */
    expandAbbreviations?: boolean;
    /**
     * Whether to ignore articles
     */
    ignoreArticles?: boolean;
    /**
     * Minimum confidence threshold
     */
    minConfidence?: number;
}
/**
 * Parser interface - extends the BaseParser
 */
export interface Parser extends BaseParser {
    /**
     * Tokenize input without parsing
     * Useful for debugging and testing
     */
    tokenize(input: string): Token[];
    /**
     * Set debug event callback for emitting parser debug events
     * @deprecated Use setPlatformEventEmitter instead
     */
    setDebugCallback?(callback: (event: ISystemEvent) => void): void;
    /**
     * Set platform event emitter for parser debugging
     * The emitter should accept SemanticEvent objects
     */
    setPlatformEventEmitter?(emitter: (event: any) => void): void;
    /**
     * Set the world context for scope constraint evaluation
     * @param world The world model
     * @param actorId The current actor performing the command
     * @param currentLocation The actor's current location
     */
    setWorldContext?(world: any, actorId: string, currentLocation: string): void;
    /**
     * Register additional verbs after parser creation
     * Used for story-specific vocabulary
     */
    registerVerbs?(verbs: VerbVocabulary[]): void;
    /**
     * Register additional vocabulary entries after parser creation
     * More generic than registerVerbs - can handle any part of speech
     */
    registerVocabulary?(entries: VocabularyEntry[]): void;
    /**
     * Enable or disable a specific verb by action ID
     */
    setVerbEnabled?(actionId: string, enabled: boolean): void;
}
```

### parser-contracts/parser-internals

```typescript
/**
 * Internal parser types
 *
 * These types are used internally by the parser implementation
 * and should not be exported as part of the public API.
 *
 * @internal
 */
import { Token } from './parser-types';
/**
 * A candidate command from the parser
 * This is world-agnostic - just the grammatical structure
 *
 * @internal
 */
export interface CandidateCommand {
    /**
     * The action to perform (verb)
     */
    action: string;
    /**
     * Raw text for the primary noun
     */
    nounText?: string;
    /**
     * Possible interpretations of the noun
     */
    nounCandidates?: string[];
    /**
     * Preposition between nouns
     */
    preposition?: string;
    /**
     * Raw text for the secondary noun
     */
    secondNounText?: string;
    /**
     * Possible interpretations of the second noun
     */
    secondNounCandidates?: string[];
    /**
     * Original input text
     */
    originalInput: string;
    /**
     * Tokens that were parsed
     */
    tokens: Token[];
    /**
     * Grammar pattern that was matched
     */
    pattern?: string;
    /**
     * Parser confidence (0-1)
     */
    confidence?: number;
    /**
     * Any special flags (ALL, EXCEPT, etc.)
     */
    flags?: {
        all?: boolean;
        except?: boolean;
        pronoun?: boolean;
    };
}
/**
 * Result of parsing with error handling (internal)
 *
 * @internal
 */
export interface InternalParseResult {
    /**
     * Successful candidate commands
     */
    candidates: CandidateCommand[];
    /**
     * Errors encountered
     */
    errors: ParseError[];
    /**
     * Whether parsing was partially successful
     */
    partial: boolean;
}
/**
 * Internal parse error type
 *
 * @internal
 */
export interface ParseError {
    /**
     * Type of error
     */
    type: ParseErrorType;
    /**
     * Human-readable message
     */
    message: string;
    /**
     * The problematic word(s)
     */
    words?: string[];
    /**
     * Position in input where error occurred
     */
    position?: number;
    /**
     * Suggestions for fixing
     */
    suggestions?: string[];
}
/**
 * Error types for parsing
 *
 * @internal
 */
export declare enum ParseErrorType {
    NO_VERB = "NO_VERB",
    UNKNOWN_VERB = "UNKNOWN_VERB",
    UNKNOWN_WORD = "UNKNOWN_WORD",
    AMBIGUOUS = "AMBIGUOUS",
    INCOMPLETE = "INCOMPLETE",
    PATTERN_MISMATCH = "PATTERN_MISMATCH"
}
```

### parser-contracts/parser-factory

```typescript
/**
 * Parser Factory
 *
 * Creates language-specific parser instances.
 * The actual parser implementations are in separate packages
 * and must be registered before use.
 */
import { Parser } from './parser-types';
/**
 * Registry of parser constructors
 * Language providers are passed as 'any' to avoid coupling
 */
type ParserConstructor = new (languageProvider: any) => Parser;
/**
 * Parser factory for creating language-specific parsers
 */
export declare class ParserFactory {
    /**
     * Register a parser implementation for a language
     *
     * @example
     * import { EnglishParser } from '@sharpee/parser-en-us';
     * ParserFactory.registerParser('en-US', EnglishParser);
     */
    static registerParser(languageCode: string, parserClass: ParserConstructor): void;
    /**
     * Create a parser for the specified language
     *
     * @throws Error if no parser is registered for the language
     */
    static createParser(languageCode: string, languageProvider: any): Parser;
    /**
     * Get list of registered language codes
     */
    static getRegisteredLanguages(): string[];
    /**
     * Check if a parser is registered for a language
     */
    static isLanguageRegistered(languageCode: string): boolean;
    /**
     * Clear all registered parsers (mainly for testing)
     */
    static clearRegistry(): void;
}
export {};
```

### vocabulary-contracts/vocabulary-types

```typescript
/**
 * Vocabulary types and interfaces for the parser
 *
 * The vocabulary system is extensible at multiple levels:
 * - Base vocabulary from language packages
 * - Extension vocabulary from extensions
 * - Story-specific vocabulary overrides
 * - Entity-specific vocabulary from traits
 */
/**
 * Part of speech categories
 */
export declare const PartOfSpeech: {
    readonly VERB: "verb";
    readonly NOUN: "noun";
    readonly ADJECTIVE: "adjective";
    readonly PREPOSITION: "preposition";
    readonly ARTICLE: "article";
    readonly PRONOUN: "pronoun";
    readonly DIRECTION: "direction";
    readonly SPECIAL: "special";
    readonly DETERMINER: "determiner";
    readonly CONJUNCTION: "conjunction";
    readonly NUMBER: "number";
};
export type PartOfSpeech = typeof PartOfSpeech[keyof typeof PartOfSpeech];
/**
 * A vocabulary entry
 */
export interface VocabularyEntry {
    /**
     * The word itself
     */
    word: string;
    /**
     * Part of speech
     */
    partOfSpeech: PartOfSpeech;
    /**
     * What this word maps to (action ID, entity ID, etc.)
     */
    mapsTo: string;
    /**
     * Priority for disambiguation (higher = preferred)
     */
    priority?: number;
    /**
     * Source of this vocabulary entry
     */
    source?: 'base' | 'extension' | 'story' | 'entity' | 'dynamic';
    /**
     * Additional metadata
     */
    metadata?: Record<string, unknown>;
}
/**
 * Collection of vocabulary entries
 */
export interface VocabularySet {
    /**
     * All vocabulary entries
     */
    entries: VocabularyEntry[];
    /**
     * Quick lookup by word
     */
    byWord: Map<string, VocabularyEntry[]>;
    /**
     * Quick lookup by part of speech
     */
    byPartOfSpeech: Map<PartOfSpeech, VocabularyEntry[]>;
}
/**
 * Vocabulary provider interface
 *
 * Different sources can provide vocabulary:
 * - Language packages provide base vocabulary
 * - Extensions can add domain-specific vocabulary
 * - Stories can override or add vocabulary
 * - Entities register their own vocabulary dynamically
 */
export interface VocabularyProvider {
    /**
     * Unique identifier for this provider
     */
    id: string;
    /**
     * Get vocabulary entries from this provider
     */
    getVocabulary(): VocabularyEntry[];
    /**
     * Priority for this provider (higher = override lower)
     */
    priority?: number;
}
/**
 * Standard verb vocabulary
 */
export interface VerbVocabulary {
    /**
     * The canonical action ID this verb maps to
     */
    actionId: string;
    /**
     * All verb forms that map to this action
     */
    verbs: string[];
    /**
     * Grammar pattern for this verb
     */
    pattern?: string;
    /**
     * Required prepositions (if any)
     */
    prepositions?: string[];
}
/**
 * Direction vocabulary entry
 */
export interface DirectionVocabulary {
    /**
     * Canonical direction (NORTH, SOUTH, etc.)
     */
    direction: string;
    /**
     * All words that map to this direction
     */
    words: string[];
    /**
     * Short forms (n, s, e, w, etc.)
     */
    abbreviations?: string[];
}
/**
 * Special vocabulary for pronouns and references
 */
export interface SpecialVocabulary {
    /**
     * Pronouns that refer to last noun
     */
    pronouns: string[];
    /**
     * Words that mean "everything"
     */
    allWords: string[];
    /**
     * Words that mean "except"
     */
    exceptWords: string[];
    /**
     * Common articles to ignore
     */
    articles: string[];
}
/**
 * Dynamic vocabulary entry from an entity
 */
export interface EntityVocabulary {
    /**
     * Entity ID this vocabulary belongs to
     */
    entityId: string;
    /**
     * Nouns that refer to this entity
     */
    nouns: string[];
    /**
     * Adjectives that can describe this entity
     */
    adjectives: string[];
    /**
     * Whether this entity is in scope
     */
    inScope?: boolean;
    /**
     * Priority for disambiguation
     */
    priority?: number;
}
/**
 * Grammar pattern for verb syntax
 */
export interface GrammarPattern {
    /**
     * Pattern name
     */
    name: string;
    /**
     * Pattern elements (VERB, NOUN, PREP, etc.)
     */
    elements: string[];
    /**
     * Example usage
     */
    example?: string;
    /**
     * Actions that use this pattern
     */
    actions?: string[];
}
/**
 * Common grammar patterns
 */
export declare const GrammarPatterns: Readonly<{
    VERB_ONLY: Readonly<{
        name: "verb_only";
        elements: readonly string[];
        example: "look";
    }>;
    VERB_NOUN: Readonly<{
        name: "verb_noun";
        elements: readonly string[];
        example: "take sword";
    }>;
    VERB_NOUN_PREP_NOUN: Readonly<{
        name: "verb_noun_prep_noun";
        elements: readonly string[];
        example: "put sword in chest";
    }>;
    VERB_PREP_NOUN: Readonly<{
        name: "verb_prep_noun";
        elements: readonly string[];
        example: "look at painting";
    }>;
    VERB_DIRECTION: Readonly<{
        name: "verb_direction";
        elements: readonly string[];
        example: "go north";
    }>;
    DIRECTION_ONLY: Readonly<{
        name: "direction_only";
        elements: readonly string[];
        example: "north";
    }>;
}>;
/**
 * Type for standard grammar pattern names
 */
export type GrammarPatternName = keyof typeof GrammarPatterns;
```

### vocabulary-contracts/vocabulary-registry

```typescript
/**
 * Vocabulary Registry - Central management of all vocabulary in the system
 *
 * The registry aggregates vocabulary from multiple sources:
 * - Base vocabulary from language packages
 * - Extension vocabulary
 * - Story-specific vocabulary
 * - Dynamic entity vocabulary
 */
import { VocabularyEntry, VocabularySet, VocabularyProvider, PartOfSpeech, EntityVocabulary, VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from './vocabulary-types';
/**
 * Central vocabulary registry
 */
export declare class VocabularyRegistry {
    private providers;
    private entityVocabulary;
    private cachedVocabulary;
    private dirtyCache;
    /**
     * Register a vocabulary provider
     */
    registerProvider(provider: VocabularyProvider): void;
    /**
     * Unregister a vocabulary provider
     */
    unregisterProvider(providerId: string): void;
    /**
     * Register vocabulary for an entity
     */
    registerEntity(vocab: EntityVocabulary): void;
    /**
     * Unregister vocabulary for an entity
     */
    unregisterEntity(entityId: string): void;
    /**
     * Update entity scope status
     */
    updateEntityScope(entityId: string, inScope: boolean): void;
    /**
     * Get all vocabulary
     */
    getVocabulary(): VocabularySet;
    /**
     * Look up a word in the vocabulary
     */
    lookup(word: string, partOfSpeech?: PartOfSpeech): VocabularyEntry[];
    /**
     * Get all words of a specific part of speech
     */
    getByPartOfSpeech(partOfSpeech: PartOfSpeech): VocabularyEntry[];
    /**
     * Check if a word exists in vocabulary
     */
    hasWord(word: string, partOfSpeech?: PartOfSpeech): boolean;
    /**
     * Get vocabulary for entities in scope
     */
    getInScopeEntities(): EntityVocabulary[];
    /**
     * Clear all vocabulary
     */
    clear(): void;
    /**
     * Register standard verb vocabulary
     */
    registerVerbs(verbs: VerbVocabulary[]): void;
    /**
     * Register additional verbs dynamically (e.g., from stories)
     * These have lower priority than standard verbs by default
     */
    registerDynamicVerbs(verbs: VerbVocabulary[], source?: string): void;
    /**
     * Register direction vocabulary
     */
    registerDirections(directions: DirectionVocabulary[]): void;
    /**
     * Register prepositions
     */
    registerPrepositions(prepositions: string[]): void;
    /**
     * Register determiners (beyond articles)
     */
    registerDeterminers(determiners: string[]): void;
    /**
     * Register conjunctions
     */
    registerConjunctions(conjunctions: string[]): void;
    /**
     * Register numbers (both words and digits)
     */
    registerNumbers(numbers: string[]): void;
    /**
     * Register special vocabulary (pronouns, articles, etc.)
     */
    registerSpecial(special: SpecialVocabulary): void;
}
export declare const vocabularyRegistry: VocabularyRegistry;
```

### vocabulary-contracts/vocabulary-adapters

```typescript
/**
 * Vocabulary adapters for converting language-specific vocabulary
 * to the standard vocabulary types used by the parser
 */
import { VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from './vocabulary-types';
import { ParserLanguageProvider } from '../parser-language-provider';
/**
 * Adapt verb vocabulary from language provider format
 */
export declare function adaptVerbVocabulary(languageProvider: ParserLanguageProvider): VerbVocabulary[];
/**
 * Adapt direction vocabulary from language provider format
 */
export declare function adaptDirectionVocabulary(languageProvider: ParserLanguageProvider): DirectionVocabulary[];
/**
 * Adapt special vocabulary from language provider format
 */
export declare function adaptSpecialVocabulary(languageProvider: ParserLanguageProvider): SpecialVocabulary;
```

### grammar/grammar-builder

```typescript
/**
 * @file Grammar Builder Interfaces
 * @description Language-agnostic interfaces for defining grammar rules
 */
import { IEntity } from '@sharpee/core';
/**
 * Slot types for grammar patterns
 * Controls how the parser handles slot matching
 */
export declare enum SlotType {
    /** Default: resolve slot text to an entity via vocabulary lookup */
    ENTITY = "entity",
    /** Capture raw text without entity resolution (single token) */
    TEXT = "text",
    /** Capture raw text until next pattern element or end (greedy) */
    TEXT_GREEDY = "text_greedy",
    /** Resolve entity but mark as instrument for the action */
    INSTRUMENT = "instrument",
    /** Match cardinal/ordinal direction (n, s, e, w, ne, up, down, etc.) */
    DIRECTION = "direction",
    /** Match integer (digits or words: 1, 29, one, twenty) */
    NUMBER = "number",
    /** Match ordinal (1st, first, 2nd, second, etc.) */
    ORDINAL = "ordinal",
    /** Match time expression (10:40, 6:00) */
    TIME = "time",
    /** Match manner adverb (carefully, quickly, forcefully) - feeds intention.manner */
    MANNER = "manner",
    /** Match text enclosed in double quotes */
    QUOTED_TEXT = "quoted_text",
    /** Match conversation topic (one or more words) */
    TOPIC = "topic",
    /** Match word from a story-defined vocabulary category */
    VOCABULARY = "vocabulary",
    /** @deprecated Use VOCABULARY with .fromVocabulary() instead */
    ADJECTIVE = "adjective",
    /** @deprecated Use VOCABULARY with .fromVocabulary() instead */
    NOUN = "noun"
}
/**
 * Constraint types for slot matching
 */
export type PropertyConstraint = Record<string, any>;
export type FunctionConstraint = (entity: IEntity, context: GrammarContext) => boolean;
export type ScopeConstraintBuilder = (scope: ScopeBuilder) => ScopeBuilder;
export type Constraint = PropertyConstraint | FunctionConstraint | ScopeConstraintBuilder;
/**
 * Context provided to constraint functions
 */
export interface GrammarContext {
    world: any;
    actorId: string;
    actionId?: string;
    currentLocation: string;
    slots: Map<string, IEntity[]>;
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
    kind(kind: string): ScopeBuilder;
    orExplicitly(entityIds: string[]): ScopeBuilder;
    orRule(ruleId: string): ScopeBuilder;
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
    includeRules: string[];
}
/**
 * ADR-082: Typed slot value for non-entity slots
 * Each variant carries the parsed/typed value from the input
 */
export type TypedSlotValue = {
    type: 'direction';
    direction: string;
    canonical: string;
} | {
    type: 'number';
    value: number;
    word: string;
} | {
    type: 'ordinal';
    value: number;
    word: string;
} | {
    type: 'time';
    hours: number;
    minutes: number;
    text: string;
} | {
    type: 'manner';
    word: string;
} | {
    type: 'quoted_text';
    text: string;
} | {
    type: 'topic';
    words: string[];
} | {
    type: 'vocabulary';
    word: string;
    category: string;
} | {
    type: 'adjective';
    word: string;
} | {
    type: 'noun';
    word: string;
};
/**
 * Pattern builder for defining grammar rules
 */
export interface PatternBuilder {
    /**
     * Require a slot's entity to have a specific trait
     * This is the primary method for semantic constraints in grammar.
     * @param slot The slot name from the pattern
     * @param traitType The trait type constant (e.g., TraitType.CONTAINER)
     *
     * @example
     * ```typescript
     * grammar.define('board :target')
     *   .hasTrait('target', TraitType.ENTERABLE)
     *   .mapsTo('if.action.entering')
     *   .build();
     * ```
     */
    hasTrait(slot: string, traitType: string): PatternBuilder;
    /**
     * Define a constraint for a slot (advanced use)
     * Prefer .hasTrait() for trait-based constraints.
     * @param slot The slot name from the pattern
     * @param constraint The constraint to apply
     */
    where(slot: string, constraint: Constraint): PatternBuilder;
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
     * Map this pattern to an action
     * @param action The action identifier
     */
    mapsTo(action: string): PatternBuilder;
    /**
     * Set the priority for this pattern (higher = preferred)
     * @param priority The priority value
     */
    withPriority(priority: number): PatternBuilder;
    /**
     * Add semantic mappings for verbs
     * @param verbs Map of verb text to semantic properties
     */
    withSemanticVerbs(verbs: Record<string, Partial<SemanticProperties>>): PatternBuilder;
    /**
     * Add semantic mappings for prepositions
     * @param prepositions Map of preposition text to spatial relations
     */
    withSemanticPrepositions(prepositions: Record<string, string>): PatternBuilder;
    /**
     * Add semantic mappings for directions
     * @param directions Map of direction text to normalized directions
     */
    withSemanticDirections(directions: Record<string, string>): PatternBuilder;
    /**
     * Set default semantic properties
     * @param defaults Default semantic properties
     */
    withDefaultSemantics(defaults: Partial<SemanticProperties>): PatternBuilder;
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
     * ADR-087: Define grammar patterns for an action with verb aliases
     * @param actionId The action identifier to map patterns to
     * @returns An ActionGrammarBuilder for fluent configuration
     *
     * @example
     * ```typescript
     * grammar
     *   .forAction('if.action.pushing')
     *   .verbs(['push', 'press', 'shove', 'move'])
     *   .pattern(':target')
     *   .where('target', scope => scope.touchable())
     *   .build();
     * ```
     */
    forAction(actionId: string): ActionGrammarBuilder;
    /**
     * Get all defined rules
     */
    getRules(): GrammarRule[];
    /**
     * Clear all rules
     */
    clear(): void;
}
/**
 * ADR-087: Action-centric grammar builder
 * Allows defining multiple patterns for an action with verb aliases
 */
export interface ActionGrammarBuilder {
    /**
     * Define verb aliases for this action
     * Each verb will generate a separate pattern
     * @param verbs Array of verb strings (e.g., ['push', 'press', 'shove'])
     */
    verbs(verbs: string[]): ActionGrammarBuilder;
    /**
     * Define a pattern template (without verb)
     * Will be combined with each verb to create full patterns
     * @param pattern Pattern template (e.g., ':target' becomes 'push :target', 'press :target', etc.)
     */
    pattern(pattern: string): ActionGrammarBuilder;
    /**
     * Define multiple pattern templates
     * Each pattern will be combined with each verb
     * @param patterns Array of pattern templates
     *
     * @example
     * ```typescript
     * grammar
     *   .forAction('if.action.pushing')
     *   .verbs(['push', 'press'])
     *   .patterns([':target', ':target :direction'])
     *   .build();
     * // Generates: push :target, press :target, push :target :direction, press :target :direction
     * ```
     */
    patterns(patterns: string[]): ActionGrammarBuilder;
    /**
     * Define direction patterns with aliases
     * Creates standalone direction patterns (no verb prefix)
     * @param directionMap Map of canonical direction to aliases
     *
     * @example
     * ```typescript
     * grammar
     *   .forAction('if.action.going')
     *   .directions({
     *     'north': ['north', 'n'],
     *     'south': ['south', 's'],
     *   })
     *   .build();
     * // Generates patterns 'north', 'n', 'south', 's' each with direction semantics
     * ```
     */
    directions(directionMap: Record<string, string[]>): ActionGrammarBuilder;
    /**
     * Require a slot's entity to have a specific trait (applies to all generated patterns)
     * This is the primary method for semantic constraints in grammar.
     * @param slot The slot name from the pattern
     * @param traitType The trait type constant (e.g., TraitType.CONTAINER)
     */
    hasTrait(slot: string, traitType: string): ActionGrammarBuilder;
    /**
     * Define a constraint for a slot (applies to all generated patterns)
     * Prefer .hasTrait() for trait-based constraints.
     * @param slot The slot name from the pattern
     * @param constraint The constraint to apply
     */
    where(slot: string, constraint: Constraint): ActionGrammarBuilder;
    /**
     * Set priority for all generated patterns
     * @param priority The priority value (higher = preferred)
     */
    withPriority(priority: number): ActionGrammarBuilder;
    /**
     * Set default semantic properties for all generated patterns
     * @param defaults Default semantic properties
     */
    withDefaultSemantics(defaults: Partial<SemanticProperties>): ActionGrammarBuilder;
    /**
     * Mark a slot as a specific type (applies to all generated patterns)
     * @param slot The slot name
     * @param slotType The slot type
     */
    slotType(slot: string, slotType: SlotType): ActionGrammarBuilder;
    /**
     * Build all patterns and add them to the grammar
     * Generates patterns from: verbs × patterns combinations
     */
    build(): void;
}
/**
 * A compiled grammar rule
 */
export interface GrammarRule {
    id: string;
    pattern: string;
    compiledPattern?: CompiledPattern;
    slots: Map<string, SlotConstraint>;
    action: string;
    priority: number;
    semantics?: SemanticMapping;
    defaultSemantics?: Partial<SemanticProperties>;
    experimentalConfidence?: number;
}
/**
 * Semantic properties that can be derived from grammar
 */
export interface SemanticProperties {
    /** How an action is performed */
    manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy' | 'quick';
    /** Spatial relationship for placement actions */
    spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside' | 'above' | 'below';
    /** Direction for movement */
    direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'northeast' | 'northwest' | 'southeast' | 'southwest' | 'in' | 'out';
    /** Whether the preposition was implicit */
    implicitPreposition?: boolean;
    /** Whether a direction was implicit */
    implicitDirection?: boolean;
    /** Custom properties for specific actions */
    [key: string]: any;
}
/**
 * Mapping from text variations to semantic properties
 */
export interface SemanticMapping {
    /** Map verb variations to properties */
    verbs?: Record<string, Partial<SemanticProperties>>;
    /** Map preposition variations to spatial relations */
    prepositions?: Record<string, string>;
    /** Map direction variations to normalized directions */
    directions?: Record<string, string>;
    /** Function to compute dynamic semantics based on match */
    compute?: (match: any) => Partial<SemanticProperties>;
}
/**
 * Slot constraint definition
 */
export interface SlotConstraint {
    name: string;
    constraints: Constraint[];
    /** Required trait types the entity must have (from .hasTrait()) */
    traitFilters?: string[];
    /** How the parser should handle this slot (default: ENTITY) */
    slotType?: SlotType;
    /** For VOCABULARY slots: the category name to match against */
    vocabularyCategory?: string;
}
/**
 * Token in a pattern
 */
export interface PatternToken {
    type: 'literal' | 'slot' | 'alternates';
    value: string;
    alternates?: string[];
    optional?: boolean;
    slotType?: SlotType;
    greedy?: boolean;
    vocabularyCategory?: string;
}
/**
 * Compiled pattern for efficient matching
 */
export interface CompiledPattern {
    tokens: PatternToken[];
    slots: Map<string, number>;
    minTokens: number;
    maxTokens: number;
}
/**
 * Slot match data with multi-object support
 */
export interface SlotMatch {
    tokens: number[];
    text: string;
    slotType?: SlotType;
    confidence?: number;
    isAll?: boolean;
    isList?: boolean;
    items?: SlotMatch[];
    excluded?: SlotMatch[];
    category?: string;
    matchedWord?: string;
    manner?: string;
    isPronoun?: boolean;
    entityId?: string;
    resolvedText?: string;
}
/**
 * Result of pattern matching
 */
export interface PatternMatch {
    rule: GrammarRule;
    confidence: number;
    slots: Map<string, SlotMatch>;
    consumed: number;
    semantics?: SemanticProperties;
    matchedTokens?: {
        verb?: string;
        preposition?: string;
        direction?: string;
    };
}
```

### grammar/pattern-compiler

```typescript
/**
 * @file Pattern Compiler Interface
 * @description Language-agnostic interface for compiling grammar patterns
 */
import { CompiledPattern } from './grammar-builder';
/**
 * Pattern compiler interface
 * Language-specific implementations handle their own syntax
 */
export interface PatternCompiler {
    /**
     * Compile a pattern string into tokens
     * @param pattern The pattern string (e.g., "put :item in|into :container")
     * @returns Compiled pattern with tokens and metadata
     */
    compile(pattern: string): CompiledPattern;
    /**
     * Validate a pattern string
     * @param pattern The pattern to validate
     * @returns True if valid, false otherwise
     */
    validate(pattern: string): boolean;
    /**
     * Extract slot names from a pattern
     * @param pattern The pattern string
     * @returns Array of slot names
     */
    extractSlots(pattern: string): string[];
}
/**
 * Pattern syntax error
 */
export declare class PatternSyntaxError extends Error {
    pattern: string;
    position?: number | undefined;
    constructor(message: string, pattern: string, position?: number | undefined);
}
```

### grammar/grammar-engine

```typescript
/**
 * @file Grammar Engine Base
 * @description Abstract base class for grammar matching engines
 */
import { Token } from '../parser-contracts/parser-types';
import { GrammarRule, PatternMatch, GrammarContext, GrammarBuilder } from './grammar-builder';
import { PatternCompiler } from './pattern-compiler';
/**
 * Grammar matching options
 */
export interface GrammarMatchOptions {
    /** Minimum confidence threshold */
    minConfidence?: number;
    /** Maximum number of matches to return */
    maxMatches?: number;
    /** Whether to allow partial matches */
    allowPartial?: boolean;
}
/**
 * Abstract base class for grammar engines
 * Language-specific implementations provide concrete matching logic
 */
export declare abstract class GrammarEngine {
    protected rules: GrammarRule[];
    protected rulesByAction: Map<string, GrammarRule[]>;
    protected compiler: PatternCompiler;
    constructor(compiler: PatternCompiler);
    /**
     * Add a grammar rule
     */
    addRule(rule: GrammarRule): void;
    /**
     * Add multiple rules
     */
    addRules(rules: GrammarRule[]): void;
    /**
     * Find matching grammar rules for tokens
     */
    abstract findMatches(tokens: Token[], context: GrammarContext, options?: GrammarMatchOptions): PatternMatch[];
    /**
     * Get the best match from a set of tokens
     */
    getBestMatch(tokens: Token[], context: GrammarContext, options?: GrammarMatchOptions): PatternMatch | null;
    /**
     * Clear all rules
     */
    clear(): void;
    /**
     * Get all rules
     */
    getRules(): GrammarRule[];
    /**
     * Get rules for a specific action
     */
    getRulesForAction(action: string): GrammarRule[];
    /**
     * Sort rules by priority (descending)
     */
    protected sortRules(): void;
    /**
     * Create a grammar builder connected to this engine
     */
    createBuilder(): GrammarBuilder;
}
```

### grammar/scope-builder

```typescript
/**
 * @file Scope Builder Implementation
 * @description Concrete implementation of the scope builder interface
 */
import { ScopeBuilder, ScopeConstraint, PropertyConstraint, FunctionConstraint } from './grammar-builder';
/**
 * Concrete scope builder implementation
 */
export declare class ScopeBuilderImpl implements ScopeBuilder {
    private constraint;
    visible(): ScopeBuilder;
    touchable(): ScopeBuilder;
    carried(): ScopeBuilder;
    nearby(): ScopeBuilder;
    matching(constraint: PropertyConstraint | FunctionConstraint): ScopeBuilder;
    kind(kind: string): ScopeBuilder;
    orExplicitly(entityIds: string[]): ScopeBuilder;
    orRule(ruleId: string): ScopeBuilder;
    hasTrait(traitType: string): ScopeBuilder;
    build(): ScopeConstraint;
}
/**
 * Create a new scope builder
 */
export declare function scope(): ScopeBuilder;
```

### grammar/vocabulary-provider

```typescript
/**
 * @file Grammar Vocabulary Provider
 * @description Context-aware vocabulary system for grammar pattern matching (ADR-082)
 *
 * This is distinct from vocabulary-contracts/VocabularyProvider which is for
 * providing vocabulary entries to VocabularyRegistry. This system is specifically
 * for context-aware vocabulary categories used in grammar slot matching.
 *
 * Vocabulary categories are registered with optional context predicates.
 * The parser only considers a pattern if its vocabulary is active in the current context.
 */
import { GrammarContext } from './grammar-builder';
/**
 * Configuration for a vocabulary category
 */
export interface GrammarVocabularyConfig {
    /** Words in this vocabulary category */
    words: string[];
    /**
     * Optional context predicate - if provided, vocabulary is only active
     * when this function returns true for the current GrammarContext.
     *
     * @example
     * ```typescript
     * vocab.define('panel-colors', {
     *   words: ['red', 'yellow', 'mahogany', 'pine'],
     *   when: (ctx) => ctx.currentLocation === insideMirrorId
     * });
     * ```
     */
    when?: (ctx: GrammarContext) => boolean;
}
/**
 * Result of a grammar vocabulary match
 */
export interface GrammarVocabularyMatch {
    /** The matched word (normalized to lowercase) */
    word: string;
    /** The category this word was matched from */
    category: string;
}
/**
 * Context-aware vocabulary provider for grammar pattern matching.
 *
 * Stories register vocabulary categories with optional context predicates.
 * The parser checks if a category is active before attempting to match words.
 *
 * @example
 * ```typescript
 * // Story initialization
 * const vocab = world.getGrammarVocabularyProvider();
 *
 * // Global vocabulary (always active)
 * vocab.define('manner', {
 *   words: ['carefully', 'quickly', 'forcefully']
 * });
 *
 * // Context-specific vocabulary
 * vocab.define('panel-colors', {
 *   words: ['red', 'yellow', 'mahogany', 'pine'],
 *   when: (ctx) => ctx.currentLocation === insideMirrorId
 * });
 *
 * // Grammar pattern references the category
 * grammar
 *   .define('push :color panel')
 *   .fromVocabulary('color', 'panel-colors')
 *   .mapsTo('push_panel')
 *   .build();
 * ```
 */
export interface IGrammarVocabularyProvider {
    /**
     * Define a named vocabulary category.
     *
     * @param category - Unique category name (e.g., 'panel-colors', 'dial-positions')
     * @param config - Words and optional context predicate
     * @throws Error if category already exists (use extend() to add words)
     */
    define(category: string, config: GrammarVocabularyConfig): void;
    /**
     * Extend an existing category with additional words.
     * The context predicate is inherited from the original definition.
     *
     * @param category - Existing category name
     * @param words - Additional words to add
     * @throws Error if category doesn't exist
     */
    extend(category: string, words: string[]): void;
    /**
     * Check if a word matches a category in the current context.
     *
     * Returns true only if:
     * 1. The category exists
     * 2. The category is active in the context (when predicate passes or is absent)
     * 3. The word is in the category's word list
     *
     * @param category - Category name to check
     * @param word - Word to match (case-insensitive)
     * @param ctx - Current grammar context
     * @returns true if word matches category in context
     */
    match(category: string, word: string, ctx: GrammarContext): boolean;
    /**
     * Get all words in a category (for tooling/debugging).
     * Returns empty set if category doesn't exist.
     *
     * @param category - Category name
     * @returns Set of words in the category
     */
    getWords(category: string): Set<string>;
    /**
     * Check if a category is active in the current context.
     *
     * @param category - Category name
     * @param ctx - Current grammar context
     * @returns true if category exists and its when predicate passes (or is absent)
     */
    isActive(category: string, ctx: GrammarContext): boolean;
    /**
     * Check if a category exists (regardless of context).
     *
     * @param category - Category name
     * @returns true if category has been defined
     */
    hasCategory(category: string): boolean;
    /**
     * Get all defined category names (for tooling/debugging).
     *
     * @returns Array of category names
     */
    getCategories(): string[];
    /**
     * Remove a category.
     *
     * @param category - Category name to remove
     * @returns true if category was removed, false if it didn't exist
     */
    removeCategory(category: string): boolean;
    /**
     * Clear all vocabulary categories.
     */
    clear(): void;
}
/**
 * Default implementation of IGrammarVocabularyProvider.
 *
 * Stores vocabulary categories with their words and context predicates.
 * All word matching is case-insensitive.
 */
export declare class GrammarVocabularyProvider implements IGrammarVocabularyProvider {
    private categories;
    define(category: string, config: GrammarVocabularyConfig): void;
    extend(category: string, words: string[]): void;
    match(category: string, word: string, ctx: GrammarContext): boolean;
    getWords(category: string): Set<string>;
    isActive(category: string, ctx: GrammarContext): boolean;
    hasCategory(category: string): boolean;
    getCategories(): string[];
    removeCategory(category: string): boolean;
    clear(): void;
}
```

### prompt

```typescript
/**
 * GamePrompt — input prompt as a first-class domain type (ADR-137)
 *
 * The prompt is a channel primitive (FyreVM heritage). Each prompt is a named
 * constant with a messageId resolved through the language provider.
 *
 * @public GamePrompt, DefaultPrompt, PROMPT_STATE_KEY
 * @context if-domain (platform-level type)
 */
/**
 * A game prompt resolved through the language layer.
 *
 * Concrete prompts are named constants:
 * ```typescript
 * const GDTPrompt: GamePrompt = { messageId: 'dungeo.gdt.prompt' };
 * ```
 */
export interface GamePrompt {
    /** Message ID resolved by the language provider */
    readonly messageId: string;
    /** Optional parameters for template substitution */
    readonly params?: Record<string, unknown>;
}
/**
 * Platform default prompt.
 * Resolves to '> ' via lang-en-us registration of 'if.platform.prompt'.
 */
export declare const DefaultPrompt: GamePrompt;
/**
 * World state key for storing the active prompt.
 */
export declare const PROMPT_STATE_KEY = "if.prompt";
```
