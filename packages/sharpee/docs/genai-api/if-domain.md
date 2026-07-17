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
    /**
     * When true, `error` is already a fully-qualified message id and must
     * not be prefixed with the action id (ADR-231 D1).
     */
    errorQualified?: boolean;
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
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LocaleSettings, RenderContext } from './phrase';
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
     * Get the raw, unresolved template for a message ID (ADR-192 phrase path).
     *
     * Unlike {@link getMessage}, this returns the author template verbatim —
     * no perspective resolution, no parameter substitution — so the phrase
     * pipeline can parse it into a {@link RenderContext}-realized tree.
     *
     * @param messageId The message identifier
     * @returns The raw template, or undefined when the ID is not registered
     */
    getTemplate?(messageId: string): string | undefined;
    /**
     * Locale realization settings (ADR-192). Consumed by the engine when it
     * builds the per-turn {@link RenderContext} so the Assembler agrees over
     * the story's configured knobs (e.g. the serial comma).
     *
     * @returns The provider's current locale settings
     */
    getLocaleSettings?(): LocaleSettings;
    /**
     * The narrative grammatical person of the player subject (ADR-199 §4 B).
     *
     * Derived from the provider's perspective/narrative configuration (ADR-089).
     * The engine reads it when building the per-turn {@link RenderContext} so the
     * Assembler can give the player subject the agreeing verb form ("you are").
     *
     * @returns 'first' | 'second' | 'third'
     */
    getNarrativePerson?(): 'first' | 'second' | 'third';
    /**
     * Render a message to text blocks through the phrase pipeline (ADR-192 §6).
     *
     * The phrase-path replacement for {@link getMessage}: resolves perspective
     * placeholders, parses the template into a `Phrase` tree, and realizes it
     * with the locale Assembler against the supplied render context. Returns
     * `ITextBlock[]` directly — no intermediate string. `getMessage` remains for
     * any non-phrase callers.
     *
     * @param messageId The message identifier
     * @param params Parameter/producer bindings keyed by placeholder name
     * @param ctx The per-message render context (world, settings, seams)
     * @returns The realized text blocks
     */
    renderMessage?(messageId: string, params: Record<string, unknown>, ctx: RenderContext): ITextBlock[];
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
     * Define a constraint for a slot.
     * `.where(slot, scope => scope...)` scope constraints (including the
     * ScopeBuilder's `.hasTrait()`) are the one parse-time gating mechanism;
     * trait-based refusal lives in each action's validate().
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
     * Define a constraint for a slot (applies to all generated patterns).
     * `.where()` scope constraints are the one parse-time gating mechanism;
     * trait-based refusal lives in each action's validate().
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
    /**
     * Literal specificity (ADR-231 D2b): count of input words consumed by the
     * pattern's literal/alternate tokens (as opposed to slots). A rule whose
     * literals consume words outranks a rule whose unconstrained slot swallows
     * the same words. Tiebreak order: confidence desc → rule priority desc →
     * literalSpecificity desc → stable registration order.
     */
    literalSpecificity?: number;
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

### channels/types

```typescript
/**
 * @sharpee/if-domain — channel type contracts (ADR-163, closure-per-channel
 * model, 2026-05-02 rewrite + 2026-05-03 refinement).
 *
 * Owner context: domain layer. These types describe the channel-I/O
 * contract used by every package that participates in the channel system:
 *
 * - `@sharpee/channel-service` runs the closures (`ChannelService.build`).
 * - `@sharpee/stdlib` defines the standard `IOChannel` instances.
 * - `@sharpee/engine` composes the registry with the service and emits
 *   manifest / packet events.
 * - Consumers (`@sharpee/platform-browser`, multi-user web-client, CLI
 *   bundle) consume the wire packets via ADR-165 renderers.
 *
 * Public interface: the `IOChannel<T>` contract, the `IChannelRegistry`
 * registry shape, the `ChannelProduceContext` passed to closures, and the
 * three small enums (`ChannelContentType`, `ChannelMode`,
 * `ChannelEmitPolicy`) plus `ClientCapabilities` and `CapabilityFlag`.
 *
 * No implementation lives here. Per ADR-163 §14 and CLAUDE.md rule 7b:
 * if-domain is the single home for channel type contracts so co-located
 * client and server code share them by direct import, not duplication.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §14
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
/**
 * Channel content types (ADR-163 §3).
 *
 * - `text` — plain string. Renderer writes verbatim or styles.
 * - `number` — integer or float. Producer emits the number; client formats.
 * - `json` — structured object. Escape hatch for author-defined surfaces
 *   and for the platform's `main` channel which carries `MainEntry[]`.
 */
export type ChannelContentType = 'text' | 'number' | 'json';
/**
 * A single entry in the `main` channel's append-mode value array.
 *
 * Each entry corresponds to one `<p>`-equivalent surface in a text
 * renderer. The wire value of the `main` channel is `MainEntry[]` (the
 * new entries produced this turn).
 *
 * Per the prose-pipeline pre-line removal (session 2026-05-12), every
 * intra-block `\n` was lifted to a block boundary. Where the former
 * `\n` was inside a paragraph (book text under its prefix, banner
 * lines under a title), the second-and-later block carries
 * `tight: true` and the renderer collapses the inter-paragraph margin
 * so the lines stack flush.
 *
 * Invariant: a `tight` entry must not appear first in a packet — the
 * renderer relies on a non-tight predecessor in the same packet or in
 * an already-rendered prior packet.
 */
export interface MainEntry {
    /** Content of this entry — strings and decorations, no `\n` in any string. */
    readonly content: ReadonlyArray<TextContent>;
    /** Visual continuation hint. See type-level doc above. */
    readonly tight?: boolean;
    /**
     * Optional semantic CSS class the renderer applies to the rendered
     * element in addition to `main-entry`. Mirrors `ITextBlock.className`
     * — used by the prose pipeline to flow per-piece visual identity
     * through the channel wire to the browser renderer.
     */
    readonly className?: string;
}
/**
 * Channel update modes (ADR-163 §4).
 *
 * - `replace` — newest value supersedes prior values. Persistent: a
 *   mid-session join replays the latest value.
 * - `append` — value added to a chronological list (transcript-shaped).
 *   Persistent: a mid-session join replays the full list (subject to
 *   `clear` truncation per §10).
 * - `event` — transient signal; client renders once and discards. Not
 *   persisted; mid-session joins do not see prior `event` emissions.
 */
export type ChannelMode = 'replace' | 'append' | 'event';
/**
 * Per-channel emit policy (ADR-163 §5).
 *
 * - `always` — channel populated in every turn packet. `replace` emits
 *   current value (changed or not); `append` emits any new entries
 *   (possibly empty array); `event` is the natural exception (only
 *   emits on fire).
 * - `sparse` — channel appears only when its value changed (`replace`)
 *   or new entries were produced (`append`/`event`). Default for
 *   author-defined channels.
 */
export type ChannelEmitPolicy = 'always' | 'sparse';
/**
 * Client capabilities declared at session start (ADR-163 §2).
 *
 * Fields preserve ADR-101's `ClientCapabilities` interface verbatim so
 * existing consumers can adopt without rewriting their declarations.
 *
 * The `ChannelService` filters capability-gated channels at manifest
 * production using these flags (`IOChannel.gatedBy`).
 */
export interface ClientCapabilities {
    /** Always true — every Sharpee surface renders text. */
    readonly text: true;
    readonly images: boolean;
    readonly animations: boolean;
    readonly video: boolean;
    readonly sound: boolean;
    readonly music: boolean;
    readonly speech: boolean;
    readonly splitPane: boolean;
    readonly statusBar: boolean;
    readonly sidebar: boolean;
    readonly clickableText: boolean;
    readonly clickableImage: boolean;
    readonly dragDrop: boolean;
    readonly transitions: boolean;
    readonly layers: boolean;
    readonly customFonts: boolean;
    readonly screenWidth?: number;
    readonly screenHeight?: number;
}
/**
 * Subset of `ClientCapabilities` keys that name boolean flags. The
 * `text` field is always `true`; the dimension fields are numbers.
 *
 * `IOChannel.gatedBy` accepts only `CapabilityFlag` values: a channel
 * cannot gate on `text` (always true) or on screen dimensions (numeric).
 */
export type CapabilityFlag = Exclude<{
    [K in keyof ClientCapabilities]: ClientCapabilities[K] extends boolean ? K : never;
}[keyof ClientCapabilities], 'text'>;
/**
 * Context passed to an `IOChannel.produce` closure (ADR-163 §6).
 *
 * The closure receives:
 *
 * - `world` — current world state (read-only from the producer's POV).
 *   Typed as `unknown` here because if-domain cannot import
 *   `IWorldModel` from `@sharpee/world-model` without creating a cycle
 *   (world-model depends on if-domain). Consumers in stdlib and engine
 *   narrow this at the call site:
 *   ```ts
 *   produce: (ctx) => {
 *     const world = ctx.world as IWorldModel;
 *     return world.getCapability('scoring');
 *   }
 *   ```
 *   The narrowing happens once per channel definition. The trade-off
 *   keeps if-domain dependency-clean; the alternative (replicating
 *   `IWorldModel` in if-domain) is a much larger refactor.
 *
 * - `events` — semantic events fired during the turn just executed.
 *   Frozen array; producers must not mutate.
 *
 * - `blocks` — text blocks produced by `text-service.processTurn` for
 *   the turn just executed. Frozen array.
 *
 * - `turn` — monotonic turn count for this session. Engine increments.
 *
 * - `prevValue` — the value this channel emitted on the previous turn,
 *   or `undefined` if no prior emission. Closures use this for
 *   diff-aware emission decisions and for append-mode awareness.
 *
 * Closures are pure functions of context. They project; they do not
 * mutate.
 */
export interface ChannelProduceContext {
    /**
     * World state for the current turn. Typed `unknown` to avoid an
     * if-domain → world-model cycle. Consumers cast at the call site.
     */
    readonly world: unknown;
    readonly events: readonly ISemanticEvent[];
    readonly blocks: readonly ITextBlock[];
    readonly turn: number;
    readonly prevValue: unknown | undefined;
}
/**
 * A typed channel definition with embedded producer (ADR-163 §6).
 *
 * Channels are objects. They carry identity (`id`), configuration
 * (`contentType`, `mode`, `emit`, optional `gatedBy`), and a
 * `produce(ctx)` closure that computes the channel's value for the
 * current turn.
 *
 * The closure return value drives emission semantics:
 *
 * - `T` — emit this value.
 * - `undefined` — skip emission this turn (sparse channels stay quiet;
 *   always channels re-emit their previous value).
 * - `null` — emit a hide / stop / clear signal (used by media channels
 *   per §9 and by `clear` per §12).
 *
 * For `append`-mode channels, return an array of new entries (or
 * `undefined` for "no new entries this turn"). For `replace` or `event`
 * mode, return a single value (or `undefined`).
 *
 * Story override of a standard channel = re-register an `IOChannel`
 * with the same `id` (last write wins per §6).
 */
export interface IOChannel<T = unknown> {
    readonly id: string;
    readonly contentType: ChannelContentType;
    readonly mode: ChannelMode;
    readonly emit: ChannelEmitPolicy;
    /** Capability flag this channel is gated by, if any. */
    readonly gatedBy?: CapabilityFlag;
    /**
     * Produce this channel's value for the current turn. See class
     * comment above for the return-shape contract.
     */
    readonly produce: (ctx: ChannelProduceContext) => T | T[] | undefined | null;
}
/**
 * Channel registry contract (ADR-163 §7, §14).
 *
 * The registry is a simple keyed collection of `IOChannel` instances.
 * It does not enforce mode invariants, capability filtering, or
 * registration order — those are the `ChannelService`'s job.
 *
 * `add(channel)` is last-write-wins by `channel.id`: re-registering an
 * id replaces the prior definition. This is how stories override
 * standard channels (per §6).
 *
 * Implementations live elsewhere:
 *
 * - `@sharpee/stdlib` exports a populated `channelRegistry` instance
 *   with the standard channels pre-registered (per §7).
 * - Engine bootstrap calls `Story.registerChannels?.(registry)` to let
 *   stories add or override channels.
 */
export interface IChannelRegistry {
    add(channel: IOChannel): void;
    get(id: string): IOChannel | undefined;
    all(): readonly IOChannel[];
}
```

### channels/wire

```typescript
/**
 * @sharpee/if-domain — channel wire-protocol types (ADR-163 §1, §11).
 *
 * Owner context: domain layer. Pure types describing the four packets
 * that cross the wire between server and client in the channel-I/O
 * system.
 *
 * Public interface (per CLAUDE.md rule 7b): single-user and multi-user
 * surfaces both import directly from this module. Co-located client and
 * server code shares the wire contract via direct import to make
 * protocol drift mechanically impossible.
 *
 * Constraint: NO runtime-specific types (no `Buffer`, `fs.Stats`,
 * `DOMException`, no DOM globals, no Node globals). The module must be
 * importable by browser, Node, and CLI contexts without dragging in a
 * runtime they don't have.
 *
 * @see ADR-163 — Channel-Service Platform — §1, §3, §4, §5, §11
 */
import type { ChannelContentType, ChannelEmitPolicy, ChannelMode, ClientCapabilities } from './types';
/**
 * Channel definition as it appears in a CMGT manifest (ADR-163 §11).
 *
 * Wire-shaped subset of `IOChannel` — just identity and configuration.
 * The producer closure does not cross the wire; only its outputs do.
 *
 * Mode lives on the channel, not on the rule (ADR-163 §4). A channel
 * always behaves the same way regardless of which `IOChannel` produced
 * it, and clients dispatch on the manifest entry alone.
 */
export interface ChannelDefinition {
    /** Channel id. String — no integer packing. */
    readonly id: string;
    /** Content type carried by emissions on this channel. */
    readonly contentType: ChannelContentType;
    /** Update mode (replace / append / event). */
    readonly mode: ChannelMode;
    /**
     * Emit policy. Optional in the wire shape because authors may omit
     * it on `IOChannel` registration; the platform standard channels
     * default to `'always'` and author channels default to `'sparse'`.
     */
    readonly emit?: ChannelEmitPolicy;
}
/**
 * Hello packet — client → server at session start (ADR-163 §1, §2).
 *
 * Single-user runtimes synthesize a hello internally. In transport-
 * attached deployments (ADR-164) the client transmits one over the wire.
 * Either way, the `ChannelService` may not emit `cmgt` until a hello
 * has been registered for the session (bootstrap-order invariant per
 * §11).
 */
export interface HelloPacket {
    readonly kind: 'hello';
    readonly capabilities: ClientCapabilities;
}
/**
 * CMGT (channel-management) packet — server → client (ADR-163 §1, §11).
 *
 * Pure schema; no values. The manifest is per-client — derived from the
 * union of registered channels filtered by the client's capability
 * declaration (per §6, §11).
 */
export interface CmgtPacket {
    readonly kind: 'cmgt';
    /**
     * Wire protocol version. Initial value `1`. Bumped on breaking shape
     * changes to packet kinds or `ChannelDefinition` fields. Additive
     * channels do not bump version.
     */
    readonly protocol_version: number;
    /**
     * Capability-filtered channel definitions for this client.
     */
    readonly channels: ReadonlyArray<ChannelDefinition>;
}
/**
 * Turn packet — server → client per turn (ADR-163 §1).
 *
 * The payload is a record keyed by channel id. Per-channel emit policy
 * (§5) governs which channel keys appear: `'always'` channels appear
 * every turn, `'sparse'` channels appear only on change.
 *
 * Append-mode payload values carry NEW ENTRIES THIS TURN ONLY, not the
 * accumulated list (§5). The renderer is responsible for accumulation.
 */
export interface TurnPacket {
    readonly kind: 'turn';
    /**
     * Turn identifier — opaque string. Used for re-emission identity
     * (§14) and for transcript ordering in downstream consumers.
     */
    readonly turn_id: string;
    /**
     * Channel-keyed payload. Channel ids map to type-specific values:
     * text channels carry strings, number channels carry numbers, json
     * channels carry arbitrary objects (or `null` for replace-mode
     * media channels signaling stop/hide per §7).
     */
    readonly payload: Readonly<Record<string, unknown>>;
}
/**
 * Command packet — client → server per input (ADR-163 §1, §9).
 *
 * UI gestures (hotspot click, drag-drop, custom widget) are synthesized
 * into command packets indistinguishable from typed input. The boundary
 * rule (§9): if the action would change what the engine sees on the
 * next turn, it is a `CommandPacket`; otherwise it is renderer-local
 * and never reaches the wire.
 */
export interface CommandPacket {
    readonly kind: 'command';
    readonly text: string;
}
/**
 * Wire packet discriminated union — every packet that crosses the wire.
 *
 * Decoders pattern-match on `kind` to dispatch.
 */
export type WirePacket = HelloPacket | CmgtPacket | TurnPacket | CommandPacket;
```

### sound/types

```typescript
/**
 * @file Sound and AudibilityEvent domain types (ADR-172).
 *
 * The wire-level contract between sound emission, propagation, and
 * rendering. This file defines:
 *
 *  - `VolumeTier` — the discrete emission-volume tier set
 *    (whisper / subdued / normal / raised / shouting) with platform
 *    propagation budgets.
 *  - `AudibilityTier` — the discrete listener-side tier set
 *    (silent / presence-only / fragments / muffled / full).
 *  - `Sound` — the emission shape an action constructs and hands to
 *    `context.emitSound` (Phase 6).
 *  - `AudibilityEvent` — the per-listener delivery shape produced by
 *    the propagation function (Phase 3) and routed through the sound
 *    channel (Phase 5).
 *
 * No behavior — pure shapes. Propagation logic lands in
 * `@sharpee/engine` (Phase 3); trait definitions land in
 * `@sharpee/world-model` (Phase 2). Both depend on this file.
 *
 * Owner context: `@sharpee/if-domain` — domain-layer contracts.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (substrate this rides on)
 */
import type { EntityId } from '@sharpee/core';
/**
 * The five discrete volume tiers an emitter may declare. Ordered from
 * quietest to loudest. Each tier has an integer propagation budget (see
 * `VOLUME_TIER_BUDGETS`); the propagation algorithm subtracts accumulated
 * path cost from this budget to compute clarity at each listener.
 *
 * Discrete tiers are deliberate over continuous numeric volumes: authoring
 * is qualitative, prose layers render per-tier, and continuous values
 * invite balance tuning that produces no gameplay value.
 */
export type VolumeTier = 'whisper' | 'subdued' | 'normal' | 'raised' | 'shouting';
/**
 * Platform-default propagation budgets per volume tier (ADR-172). Stories
 * that want a different acoustic register (a horror story with sound that
 * carries unnaturally far, a soundproofed-bunker setting) override this
 * table without the platform code changing.
 *
 * The budget is consumed against accumulated path cost during propagation;
 * negative remainders below 1 collapse to `silent`.
 */
export declare const VOLUME_TIER_BUDGETS: Readonly<Record<VolumeTier, number>>;
/**
 * The five discrete audibility tiers the propagation function reports per
 * listener. `silent` means the listener does not perceive the sound and
 * receives no event; the other four are delivered as `AudibilityEvent`s
 * with rendering modulated by tier.
 *
 *  - `presence-only` — the listener knows a sound occurred (kind, rough
 *    direction) but no content passes.
 *  - `fragments`     — partial content; key words, broken phrases.
 *  - `muffled`       — full content, rendered with distortion framing at
 *    the prose layer.
 *  - `full`          — verbatim; clean reception.
 */
export type AudibilityTier = 'silent' | 'presence-only' | 'fragments' | 'muffled' | 'full';
/**
 * A sound's *kind*: a coarse semantic classifier the rendering layer uses
 * to pick per-`(kind, audibility_tier)` prose defaults. New kinds are
 * added as the platform grows; this is a string union, not a closed enum,
 * to keep the type extensible to story-level kinds.
 *
 * Examples chosen from ADR-172's running examples; this list is *not*
 * exhaustive and not part of the platform contract — story code may pass
 * any string here, with the language layer falling through to a generic
 * default if no per-kind prose is registered.
 */
export type SoundKind = string;
/**
 * Optional structured content for a sound. Content-bearing sounds carry
 * a content payload that audibility tier modulates: at `full` the content
 * is verbatim; at `muffled` it's distorted; at `fragments` only key
 * fragments pass; at `presence-only` no content passes (the listener
 * only knows the sound happened).
 *
 * The shape carries a `messageId` (resolved by the language layer) and
 * optional `params` for templating. Pattern-as-content (knock codes,
 * rhythmic taps) is *not* a separate dimension — it composes through
 * the same content + tier pipeline, with the language layer rendering
 * pattern degradation per tier.
 */
export interface ISoundContent {
    /** Message ID resolved by the language layer (e.g. story-authored line ID). */
    messageId: string;
    /** Optional params for the message template; keys depend on the messageId. */
    params?: Readonly<Record<string, unknown>>;
}
/**
 * The emission shape an action hands to the platform's sound dispatcher.
 *
 * `sourceLocation` is the room-id the sound originates from; the
 * propagation function uses it as the path-search root. `sourceEntity`
 * is the entity that produced the sound (an actor, a device, an
 * inanimate object) — propagation does not consult it, but downstream
 * handlers and prose templates may.
 *
 * `kind` is the semantic classifier (see `SoundKind`). `volumeTier` is
 * the emission-side tier (see `VolumeTier`). `content` is optional;
 * sounds without content are *ambient* (a gunshot, breaking glass, a
 * closing door) and the prose layer renders the sound itself rather
 * than its content.
 */
export interface ISound {
    readonly sourceLocation: EntityId;
    readonly sourceEntity: EntityId;
    readonly kind: SoundKind;
    readonly volumeTier: VolumeTier;
    readonly content?: ISoundContent;
}
/**
 * The per-listener event the propagation function produces and the sound
 * channel routes. Carries enough context for both prose rendering and
 * audio-cue mapping.
 *
 *  - `sourceRoomId`   — room-id where the sound was emitted.
 *  - `targetRoomId`   — room-id the listener is in when the sound reaches
 *                       them (typically the listener's current room).
 *  - `wallId`         — the wall entity-id whose acoustic cost contributed
 *                       to the lowest-cost path, when the path crosses one
 *                       wall. Optional — may be absent for paths that go
 *                       through doors, conduits, or are within the same
 *                       room. Future ADRs may extend this to a path of
 *                       crossings; today the field is single-valued for
 *                       common single-hop cases.
 *  - `sourceEntityId` — the entity that emitted the sound (mirrors
 *                       `Sound.sourceEntity`).
 *  - `kind`           — the sound's kind, copied from the emission.
 *  - `volumeTier`     — the emission's volume tier, copied as-emitted.
 *  - `audibilityTier` — the propagation result for this listener.
 *                       Never `silent`: silent results suppress event
 *                       delivery entirely (no `AudibilityEvent` is
 *                       produced).
 *  - `content`        — copied from the emission iff content-bearing.
 *  - `timestamp`      — engine-provided turn-sequence integer for ordering.
 *
 * The prose layer maps `(kind, audibilityTier)` to a default rendering
 * pattern; stories override per-kind. The audio-channel renderer maps
 * `audibilityTier` to a playback volume via ADR-169's fade infrastructure.
 *
 * Adding fields to this interface requires a future ADR — it is the
 * contract L2+ ADRs (NPC voice, conversation choreography, stealth
 * observation) ride on.
 */
export interface IAudibilityEvent {
    readonly sourceRoomId: EntityId;
    readonly targetRoomId: EntityId;
    readonly wallId?: EntityId;
    readonly sourceEntityId: EntityId;
    readonly kind: SoundKind;
    readonly volumeTier: VolumeTier;
    /** Always one of the *delivered* tiers — never `'silent'`. */
    readonly audibilityTier: Exclude<AudibilityTier, 'silent'>;
    readonly content?: ISoundContent;
    readonly timestamp: number;
}
```

### phrase

```typescript
/**
 * @file Phrase algebra — language-neutral phrase contracts (ADR-192).
 *
 * Purpose: declare the closed `Phrase` discriminated union, its producer and
 * render-context contracts, and the per-locale `Assembler` interface. These are
 * the language-neutral surface of the phrase algebra that replaces the
 * `messageId → formatter-chain → string` pipeline with
 * `messageId → phrase tree → Assembler → ITextBlock[]`.
 *
 * Public interface: the `Phrase` union (16 members), `PhraseProducer`,
 * `RenderContext` (with the `reference` / `textState` / `contribute` write +
 * `slotContributions` read seams), `Assembler`, and the `isX` kind type guards.
 *
 * Owner context: `@sharpee/if-domain` — language-neutral domain contracts,
 * beside `language-provider.ts` and `contracts.ts`. INVARIANT (ADR-192 AC-10):
 * this file contains NO locale logic and NO article surface strings
 * (a / an / the / some). Article realization belongs to the English Assembler in
 * `@sharpee/lang-en-us`; `articleType` here is a language-neutral selector only.
 *
 * Extensibility (ADR-192 §1): `Phrase` is a CLOSED discriminated union keyed by
 * `kind`. The five foundational kinds are implemented by the Assembler in
 * ADR-192; `Verb` (199), `Verbatim` (200), `Numeral` (198), `Pronoun` (197), and
 * `Contents` (194) are realized follow-on atoms; the remaining three stub kinds are
 * reserved discriminants whose fields and realization land additively in their
 * follow-on ADRs (193 adjectives, 195 Slot, 196 Optional/Choice). Extension is
 * additive only — a new member plus a new Assembler case, never a rewrite.
 */
import { EntityId, IEntity } from '@sharpee/core';
import { IDecoration, ITextBlock } from '@sharpee/text-blocks';
/**
 * Base carried by every composable phrase: decorations (emphasis / code) that
 * survive composition and are realized by the Assembler. The literal article
 * string is deliberately absent — see the file invariant.
 */
export interface PhraseBase {
    /** Emphasis / code decorations carried through composition. */
    decorations?: IDecoration[];
}
/** Raw author text. The whitespace authority collapses `normal`, exempts `verbatim`. */
export interface Literal extends PhraseBase {
    kind: 'literal';
    text: string;
    /** `verbatim` exempts the text from whitespace collapse. Default `normal`. */
    whitespace?: 'normal' | 'verbatim';
}
/**
 * Article + adjectives + noun, agreed as a whole. The `name` is the base noun
 * (computed names → ADR-193); `adjectives` are static in ADR-192 (state-derived
 * contributors → ADR-193). `articleType` selects the article language-neutrally;
 * the a/an/the/some surface is computed by the Assembler over the rendered head.
 */
export interface NounPhrase extends PhraseBase {
    kind: 'noun';
    /** Base noun. */
    name: string;
    /** Static adjectives (ADR-192 AC-4); state-derived adjectives land in ADR-193. */
    adjectives?: string[];
    number: 'singular' | 'plural' | 'mass';
    /**
     * Grammatical person, the verb-agreement surface a referencing `Verb` reads
     * (ADR-199 §4). Unset is treated as third person; the player in 2nd-person
     * narrative is stamped `'second'` so `{verb:is actor}` takes the plural form
     * ("you are"). Language-neutral selector — no verb surface lives here.
     */
    person?: 'first' | 'second' | 'third';
    /** Suppresses the article when true. */
    properName?: boolean;
    articleType: 'indefinite' | 'definite' | 'some' | 'none';
    /** Author override for irregular plurals. */
    pluralForm?: string;
    /** Last-mentioned tracking → `Pronoun` resolution (ADR-197). */
    referableId?: EntityId;
    /** Pronoun set for later gendered / neopronoun reference (ADR-197). */
    pronounSet?: string;
    /**
     * Sentence-start capitalization requested by the `{capitalize …}` template
     * hint (ADR-192 §5). The Assembler's Case authority upper-cases the rendered
     * head's first letter when set. Language-neutral request, not a surface string.
     */
    capitalize?: boolean;
}
/** Combinator: group / pluralize / serial-comma over its items (ports ADR-190). */
export interface PhraseList extends PhraseBase {
    kind: 'list';
    items: Phrase[];
    conj: 'and' | 'or';
}
/**
 * Combinator: ordered join under one punctuation authority.
 *
 * ADR-209 (room-description snippets) reuses this kind as its splice carrier —
 * the ADR's provisional `Seq` was never added because this IS it: the English
 * Assembler realizes `parts` by in-order run concatenation with NO joining
 * punctuation (parts abut byte-exactly; the whitespace authority only
 * collapses, never inserts). A spliced description is a `Sequence` of
 * `Verbatim` prose segments interleaved with resolved snippet values
 * (`Literal` / `Choice`); `Empty` parts are absorbed.
 */
export interface Sequence extends PhraseBase {
    kind: 'seq';
    parts: Phrase[];
}
/** Atom: realizes to "" and is absorbed by combinators (no dangling comma). */
export interface Empty {
    kind: 'empty';
}
/**
 * Verb atom (ADR-199): defers a verb's surface and agrees its number/person
 * with a referenced subject phrase at realize time. Replaces the legacy
 * `{is:}` / `{was:}` / `{has:}` formatters. A follow-on atom of ADR-192 —
 * additive (new union member + one Assembler case), no core rewrite.
 *
 * `lemma` is the 3rd-person-singular surface the author types ('is','was',
 * 'has','opens'); the agreed (plural / person-marked) form is the Assembler's
 * Agreement authority to compute — NO conjugation strings live here, exactly as
 * `NounPhrase` carries `articleType` and never the a/an surface.
 */
export interface Verb extends PhraseBase {
    kind: 'verb';
    /** 3rd-person-singular surface the author types: 'is', 'was', 'has', 'opens'. */
    lemma: string;
    /** Param/producer name of the subject phrase to agree number/person with. */
    subjectRef: string;
    /** Default 'third'; the subject's own `person` takes precedence when present. */
    person?: 'first' | 'second' | 'third';
}
/**
 * Atom — a pronoun ("it"/"them"/"his"/…) agreeing in case, number, and gender
 * with the last-mentioned referent (ADR-197). Language-neutral: the he/she/it/they
 * surface tables live in the locale Assembler; only the grammatical `case` is here.
 */
export interface Pronoun extends PhraseBase {
    kind: 'pronoun';
    case: 'subject' | 'object' | 'possessive' | 'possessive-pronoun' | 'reflexive';
    /**
     * S40 capitalization override (ADR-201 §2, Q1). `true` ⇒ always cap; `false` ⇒
     * never cap (even sentence-initial); absent ⇒ cap iff sentence-initial (driven
     * by `RenderContext.position`). The precedence logic is realizer-side (ADR-201
     * §3.2 / Phase 4); this field is the explicit author opt.
     */
    capitalize?: boolean;
}
/**
 * Atom — a numeric value rendered as digits, spelled-out words, or an ordinal
 * (ADR-198). Language-neutral: `value` is the number; the spelled surface
 * ("seven", "3rd") is the Assembler's to compute (no number words here).
 */
export interface Numeral extends PhraseBase {
    kind: 'number';
    /** The numeric value to render. */
    value: number;
    /** How to render it. Default `digits`. */
    format: 'digits' | 'words' | 'ordinal';
}
/**
 * Atom — opaque text passed through untouched and exempt from whitespace
 * collapse (ADR-200). The phrase home for non-entity scalars (names, directions,
 * free text, banners) the old chain substituted with a bare `String(value)`.
 */
export interface Verbatim extends PhraseBase {
    kind: 'verbatim';
    /** The opaque value, rendered verbatim. */
    text: string;
}
/**
 * Combinator — an entity's direct contents, read from the live world at realize
 * time and grouped as a list (ADR-194). `containerRef` names the container param.
 */
export interface Contents extends PhraseBase {
    kind: 'contents';
    /** Param naming the container (a `NounPhrase` carrying `referableId`, or an id). */
    containerRef: string;
    /** List conjunction. Default `and`. */
    conj?: 'and' | 'or';
}
/**
 * Combinator — an open, named append target (ADR-195). Several independent
 * sources `contribute` bare clause/sentence content to `slotKey` during the
 * turn; at realize time the Assembler collects them, orders them
 * deterministically, and joins them under ONE punctuation authority — the slot
 * owns every comma, "and", and sentence break, the contribution is bare content.
 *
 * `mode` selects the join grammar (default `sentence`): `sentence` joins
 * contributions as independent sentences after the stem's terminator; `clause`
 * joins them as clauses through the punctuation authority (serial comma + final
 * `conj`) before the terminator. `conj` is that final connective for `clause`
 * mode (default `and`). Language-neutral: no connective surface lives here.
 */
export interface Slot extends PhraseBase {
    kind: 'slot';
    /** The contribution channel name (`{slot:here}` → `slotKey: 'here'`). */
    slotKey: string;
    /** Join grammar. Default `sentence`. */
    mode?: 'sentence' | 'clause';
    /** Final connective for `clause` mode. Default `and`. */
    conj?: 'and' | 'or';
}
/**
 * Modifier — a phrase that renders its `child` **or `Empty`**, gated by a boolean
 * the PRODUCER resolves from world state (ADR-196 §1). Realization is stateless:
 * `present ? realize(child) : Empty`. The conditional-clause mechanism (scenarios
 * S9–S10). `present: false` yields `Empty`, absorbed by the enclosing combinator
 * (ADR-192 AC-6) so no dangling comma/whitespace survives. The boolean is resolved
 * at tree-build time — there is NO realize-time world read.
 */
export interface Optional extends PhraseBase {
    kind: 'optional';
    /** The phrase realized when `present` is true. */
    child: Phrase;
    /** Resolved by the producer from world state; NOT read at realize time. */
    present: boolean;
}
/**
 * Modifier — a phrase that renders **one of** `alternatives`, selected by a
 * deterministic, persistent selector keyed to `(entityId, messageKey)` in the
 * text-state store (ADR-196 §2). The ONLY kind that reads/writes `ctx.textState`;
 * the selector advances a per-`(entityId, messageKey)` counter at realize time.
 * Variation / cycling / first-time text (scenarios S12–S14).
 */
export interface Choice extends PhraseBase {
    kind: 'choice';
    /** The variants; length ≥ 1. An alternative MAY be `Empty` (once-only text). */
    alternatives: Phrase[];
    /**
     * Selection strategy (ADR-196 §2):
     * - `cycling` — advance through variants, wrapping (`i = n % len`).
     * - `stopping` — advance to the last variant, then stick (`i = min(n, len-1)`).
     * - `sticky` — pick once (seeded), then replay that variant.
     * - `random` — seeded pick each trigger; deterministic from the counter.
     * - `firstTime` — `alt[0]` first, `alt[1]` after (`alt[1]` may be `Empty`).
     */
    selector: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
    /** The entity the variation is keyed to (text-state primary key). */
    entityId: EntityId;
    /** Stable per-choice-site key (text-state secondary key). */
    messageKey: string;
}
/**
 * Wrapper — a mode-annotated splice part (ADR-211 §Interface contracts). Carries
 * a description-marker fragment together with the join mode its MARKER SITE was
 * classified as (from the authored host prose, never from the fragment text):
 * `clause` (mid-sentence) or `sentence` (after a terminator). The site-mode
 * classification is producer-side (stdlib snippet resolver); the separator
 * CHARACTERS (`', '` / `' '`) are locale realization and belong to the
 * Assembler — none appear here (file invariant). Boundary sites (start of text,
 * paragraph edge) never wrap in `Spliced` at all: their separator is always
 * empty, so the resolver emits `content` directly.
 */
export interface Spliced extends PhraseBase {
    kind: 'spliced';
    /** Join mode computed from the authored marker site. */
    mode: 'clause' | 'sentence';
    /** The fragment (bare — never carries its own separator). */
    content: Phrase;
}
/**
 * Atom — a sentence boundary (ADR-201 §2). Declares that `child` realizes as a
 * sentence: its first glyph is capitalized and a terminal mark is emitted at its
 * close. The structural carrier of "capitalize the start" (ADR-202) — the
 * Assembler drives sentence-start casing from this boundary, not by scanning
 * prose. Not author-facing in v1 (emitted by message structure / `Quote`).
 */
export interface Sentence extends PhraseBase {
    kind: 'sentence';
    /** The content realized as a sentence. */
    child: Phrase;
    /** Terminal punctuation emitted at the sentence close. Default `.`. */
    terminal?: '.' | '?' | '!';
}
/**
 * Atom — a quoted utterance (ADR-201 §2). Wraps an `utterance` `Phrase` and owns
 * the surrounding quote glyphs (locale-tuned via `LocaleSettings`), capitalization
 * of the utterance's first word, terminal-punctuation-INSIDE the closing quote,
 * and the attributive comma owed to an enclosing dialogue tag. Implies a
 * `Sentence` boundary for its contents.
 */
export interface Quote extends PhraseBase {
    kind: 'quote';
    /** The quoted words; glyphs / first-word cap / terminal-inside are realizer-applied. */
    utterance: Phrase;
    /** Punctuation placed INSIDE the closing quote. Default `.`. */
    terminal?: '.' | '?' | '!';
}
/**
 * The closed phrase algebra. Foundational members are realized in ADR-192,
 * `Verb` in ADR-199, and `Sentence`/`Quote` in ADR-201; remaining stubs are
 * reserved for their follow-on ADRs. Extension is additive.
 */
export type Phrase = Literal | NounPhrase | PhraseList | Sequence | Empty | Verb | Pronoun | Numeral | Verbatim | Contents | Slot | Optional | Choice | Spliced | Sentence | Quote;
/**
 * Read-only world access for realization. Language-neutral subset of the world
 * model exposed to the Assembler — no mutation, no parser or command surface.
 */
export interface RenderWorld {
    /** Resolve an entity by id, or undefined if absent. */
    getEntity(entityId: EntityId): IEntity | undefined;
    /** Direct contents of an entity. */
    getEntityContents(entityId: EntityId): IEntity[];
    /** The room transitively containing an entity, if any. */
    getContainingRoom(entityId: EntityId): IEntity | undefined;
    /**
     * Produce the `NounPhrase` for an entity id (ADR-194) — the entity→phrase bridge
     * `Contents`/`Slot` realize through. Optional: present when the engine wired it to
     * the producer (`nounPhraseFor`); absent in bare/world-less render stubs.
     */
    nounPhraseFor?(entityId: EntityId): NounPhrase | undefined;
}
/**
 * Locale-tunable realization settings. Language-neutral knobs only; the English
 * Assembler reads what it needs and ignores the rest.
 */
export interface LocaleSettings {
    /** Serial (Oxford) comma in lists. Default on. */
    serialComma?: boolean;
    /**
     * Opening quote glyph for `Quote` (ADR-201 §2). The default (`"`) is applied by
     * the locale realizer (lang-en-us) — kept out of if-domain so no locale logic
     * lives here.
     */
    openQuote?: string;
    /** Closing quote glyph for `Quote` (ADR-201 §2). Default applied by the realizer. */
    closeQuote?: string;
}
/**
 * Narrative agreement context for verb-person resolution (ADR-199 §4 B).
 *
 * The player is the only subject that takes 1st/2nd-person agreement, and which
 * grammatical person it takes depends on the story's narration. Carrying the
 * player's id plus the narrative person here lets the Assembler's Agreement
 * authority give the player subject the right verb form ("you **are**") without
 * any producer needing the perspective at build time.
 */
export interface NarrativeAgreement {
    /** Grammatical person of the player subject under the current narration. */
    person: 'first' | 'second' | 'third';
    /** The player entity's id, matched against a subject's `referableId`. */
    playerId?: EntityId;
}
/**
 * The agreement surface of a last-mentioned referent — enough for a `Pronoun` to
 * choose its surface (case × number × gender) without re-reading the world (ADR-197).
 */
export interface Mentioned {
    /** The referent entity's id. */
    referableId: EntityId;
    /** Its grammatical number. */
    number: 'singular' | 'plural' | 'mass';
    /** Its pronoun set ('he' | 'she' | 'it' | 'they', or a named set); optional. */
    pronounSet?: string;
}
/**
 * Last-mentioned reference context — the seam a later `Pronoun` consumes (ADR-197).
 * The Assembler `note`s each realized `NounPhrase`'s surface; `lastMentioned`
 * returns the most recent.
 */
export interface ReferenceContext {
    /** The referent most recently realized this turn, if any. */
    lastMentioned(): Mentioned | undefined;
    /** Record a referent as last-mentioned. */
    note(mentioned: Mentioned): void;
}
/**
 * Per-`(entityId, messageKey)` persistent store backing deterministic
 * `Choice` / `Optional`. SEAM (ADR-196): implementation and final shape owned by
 * ADR-196; declared here so the seeded-selection contract is named now.
 */
export interface TextStateStore {
    get(entityId: EntityId, messageKey: string): number | undefined;
    set(entityId: EntityId, messageKey: string, value: number): void;
}
/** Options for a slot contribution. SEAM (ADR-195). */
export interface SlotContributionOptions {
    /** Ordering hint among contributions to the same slot. */
    order?: number;
}
/**
 * Read-mostly position state threaded down the recursive realizer (ADR-201 §4).
 * Lets sentence-start capitalization and quote nesting fall out of structure
 * instead of prose-scanning (ADR-202). Per-render and ephemeral — never persisted.
 */
export interface RenderPosition {
    /** The next atom realizes at a sentence start (→ cap-eligible first glyph). */
    sentenceInitial: boolean;
    /** Currently within a `Quote`'s utterance. */
    insideQuote: boolean;
    /** Terminal punctuation owed when the enclosing sentence closes. */
    pendingTerminal?: '.' | '?' | '!';
}
/**
 * The context a producer realizes against: a read-only world, the bound params,
 * locale settings, and the three declared seams. The seam METHODS are part of
 * the contract now; their behavior is filled in by ADR-195–197.
 */
export interface RenderContext {
    /** Read-only world access. */
    readonly world: RenderWorld;
    /** Params bound for this message (producer references resolve against these). */
    readonly params: Record<string, unknown>;
    /** Locale realization settings. */
    readonly settings: LocaleSettings;
    /** Narrative agreement context — player id + person for verb agreement (ADR-199 §4 B). */
    readonly narrative: NarrativeAgreement;
    /** Last-mentioned context (consumed by `Pronoun`, ADR-197). */
    readonly reference: ReferenceContext;
    /** Per-`(entityId, messageKey)` store (consumed by `Choice`/`Optional`, ADR-196). */
    readonly textState: TextStateStore;
    /** Slot contribution channel — write side (ADR-192/195). */
    contribute(slotKey: string, phrase: Phrase, opts?: SlotContributionOptions): void;
    /**
     * Slot contribution channel — read side (ADR-195). Returns the contributions
     * staged for `slotKey` this turn, ordered by `(order asc, insertion asc)`.
     * A PEEK, not a drain: it never consumes the store, so two `{slot:key}` nodes
     * sharing a key see the same contributions and repeated reads are stable.
     *
     * OPTIONAL — matching `RenderWorld.nounPhraseFor?`'s optional-seam precedent
     * (ADR-194): a context that never wired the store (world-less render stubs)
     * omits it, and the Assembler reads `ctx.slotContributions?.(key) ?? []`, so an
     * absent accessor yields no contributions and the slot realizes `Empty`.
     */
    slotContributions?(slotKey: string): Phrase[];
    /**
     * Sentence/quote position state (ADR-201 §4). OPTIONAL — matching the
     * `slotContributions?` optional-seam precedent: an absent `position` degrades
     * to "not sentence-initial, not in quote" (today's behavior), so existing
     * render paths that don't supply it are unaffected.
     */
    readonly position?: RenderPosition;
}
/** Code that emits a phrase from world state. May return `Empty`. */
export type PhraseProducer = (ctx: RenderContext) => Phrase;
/**
 * The single per-locale component that realizes a phrase tree to text and owns
 * every cross-cutting correctness concern (article, agreement, punctuation,
 * whitespace, reference, case). The English implementation lives in
 * `@sharpee/lang-en-us`; it emits the unchanged `ITextBlock[]` contract.
 */
export interface Assembler {
    /**
     * Realize a phrase tree to text blocks. Pure function of `(tree, world, ctx)`
     * (ADR-192 §7): identical inputs yield identical output.
     *
     * @param tree the phrase tree to realize
     * @param ctx the render context (world, params, settings, seams)
     * @returns the realized text blocks
     */
    realize(tree: Phrase, ctx: RenderContext): ITextBlock[];
}
/** @returns true if the phrase is a `Literal`. */
export declare function isLiteral(p: Phrase): p is Literal;
/** @returns true if the phrase is a `NounPhrase`. */
export declare function isNounPhrase(p: Phrase): p is NounPhrase;
/** @returns true if the phrase is a `PhraseList`. */
export declare function isPhraseList(p: Phrase): p is PhraseList;
/** @returns true if the phrase is a `Sequence`. */
export declare function isSequence(p: Phrase): p is Sequence;
/** @returns true if the phrase is `Empty`. */
export declare function isEmpty(p: Phrase): p is Empty;
/** @returns true if the phrase is a `Verb` (ADR-199). */
export declare function isVerb(p: Phrase): p is Verb;
/** @returns true if the phrase is a `Pronoun` (ADR-197). */
export declare function isPronoun(p: Phrase): p is Pronoun;
/** @returns true if the phrase is a `Numeral` (ADR-198). */
export declare function isNumeral(p: Phrase): p is Numeral;
/** @returns true if the phrase is `Verbatim`. */
export declare function isVerbatim(p: Phrase): p is Verbatim;
/** @returns true if the phrase is `Contents` (ADR-194). */
export declare function isContents(p: Phrase): p is Contents;
/** @returns true if the phrase is a `Slot` (ADR-195). */
export declare function isSlot(p: Phrase): p is Slot;
/** @returns true if the phrase is `Optional` (ADR-196). */
export declare function isOptional(p: Phrase): p is Optional;
/** @returns true if the phrase is a `Choice` (ADR-196). */
export declare function isChoice(p: Phrase): p is Choice;
/** @returns true if the phrase is a `Spliced` wrapper (ADR-211). */
export declare function isSpliced(p: Phrase): p is Spliced;
/** @returns true if the phrase is a `Sentence` (ADR-201). */
export declare function isSentence(p: Phrase): p is Sentence;
/** @returns true if the phrase is a `Quote` (ADR-201). */
export declare function isQuote(p: Phrase): p is Quote;
```

### snippets

```typescript
/**
 * @file Room-description snippet contracts (ADR-209).
 *
 * Purpose: declare the wire types for author-written snippet maps — text
 * spliced into room descriptions at explicit `{snippet:name}` markers — and
 * the shared marker-extraction helper both the engine (load-time validation)
 * and stdlib (render-time scan) consume.
 *
 * Public interface: `SnippetText`, `SnippetEntry`, `SnippetMap`,
 * `SNIPPET_MARKER_PATTERN`, `extractSnippetMarkers`.
 *
 * Owner context: `@sharpee/if-domain` — these types are shared by world-model
 * (RoomTrait storage), stdlib (scan/gate/resolve in the looking action), and
 * lang-en-us (realization), so per the co-located wire-type rule they live
 * here, beside the phrase contract. INVARIANT: no runtime-specific types and
 * no locale logic — snippet TEXT is opaque author prose; selection semantics
 * ride the existing `Choice` machinery (phrase.ts).
 */
/**
 * One snippet text: a raw author string, or a message id resolved through the
 * language provider (the multilingual path — consistent with NPC actions'
 * `{ text } | { messageId }` split, ADR-209 resolution Q6).
 */
export type SnippetText = {
    text: string;
} | {
    messageId: string;
};
/**
 * One marker's entry in a room's snippet map (ADR-209 Interface contracts):
 * - `string` — one text, spliced verbatim every render.
 * - `string[]` — short form: `cycling` over the texts (resolution Q3).
 * - `SnippetText & { mentions? }` — one text with an optional presence gate.
 * - long form — explicit selector over `texts`, optional presence gate.
 *
 * `mentions` is a serializable entity id doing two jobs (resolution Q7):
 * coverage-lint metadata, and a presence gate — the entry renders only while
 * that entity is transitively contained in the room (resolution Q9).
 */
export type SnippetEntry = string | string[] | (SnippetText & {
    mentions?: string;
}) | {
    selector?: 'cycling' | 'stopping' | 'sticky' | 'random' | 'firstTime';
    texts: Array<string | SnippetText>;
    mentions?: string;
};
/**
 * A room's marker→snippet table, supplied by the author. Plain, serializable
 * data: it rides the room trait through save/load; selection counters live in
 * the text-state store (`Choice`), never here.
 */
export type SnippetMap = Record<string, SnippetEntry>;
/**
 * The `{snippet:name}` marker pattern. Marker names are identifier-like
 * (letters, digits, `_`, `-`); anything else inside the braces is not a
 * marker and passes through as literal prose (a room WITHOUT a snippet map is
 * never scanned at all — ADR-209 semantics 5, AC-7).
 */
export declare const SNIPPET_MARKER_PATTERN: RegExp;
/**
 * Extract the marker names appearing in a description text, in order of first
 * appearance, deduplicated (a duplicate marker resolves once per render —
 * ADR-209 resolution Q8).
 *
 * Shared, pure helper: the engine's load-time unbound-marker validation and
 * stdlib's render-time scan must agree on what a marker IS, so both import
 * this one implementation.
 *
 * @param text a room `description` or `initialDescription` text
 * @returns the distinct marker names, in first-appearance order
 */
export declare function extractSnippetMarkers(text: string): string[];
```

### endings

```typescript
/**
 * @file Story ending contract (ADR-210 Platform Prerequisite 3).
 *
 * Purpose: bless the existing story-ending convention as a stable wire
 * contract — the event types stories/loaders emit when a story ends and the
 * world-state key the generic `isComplete()` reads. No behavior lives here;
 * emitters build the events with existing primitives.
 *
 * Public interface: `StoryEndingEvents`, `STORY_ENDING_FLAG`,
 * `StoryEndingKind`, `IStoryEndingData`.
 *
 * Owner context: `@sharpee/if-domain` — shared by the story-loader (emits on
 * `win`/`lose`), the engine/clients (react to endings), and transcript tests
 * (assert on the event types), so per the co-located wire-type rule it lives
 * here. INVARIANT: values are frozen contract — changing them breaks saved
 * games and golden transcripts; additions only.
 */
/** Semantic event types emitted when a story ends. */
export declare const StoryEndingEvents: {
    /** The player has won (`win` in Chord; `story.victory` by convention). */
    readonly VICTORY: "story.victory";
    /** The player has lost (`lose` in Chord; `story.defeat` by convention). */
    readonly DEFEAT: "story.defeat";
};
/** How a story ended. */
export type StoryEndingKind = 'victory' | 'defeat';
/**
 * World-state key holding the ending once one is reached (a
 * `StoryEndingKind`), or unset while play continues. The generic
 * `isComplete()` reads this key; stories never implement completion logic.
 */
export declare const STORY_ENDING_FLAG = "story.ending";
/** Payload carried by a `StoryEndingEvents` event. */
export interface IStoryEndingData {
    ending: StoryEndingKind;
    /** Message ID of the ending phrase, when the author supplied one. */
    messageId?: string;
}
```
