# @sharpee/engine

GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary.

---

### types

```typescript
/**
 * Engine-specific types and interfaces
 *
 * The engine manages game state, turn execution, and event sequencing
 */
import { ISemanticEvent } from '@sharpee/core';
import { IParsedCommand, IValidatedCommand, IFEntity, WorldModel } from '@sharpee/world-model';
import { ITextBlock } from '@sharpee/text-blocks';
export { IPerceptionService, Sense } from '@sharpee/stdlib';
/**
 * Timing data for performance tracking
 */
export interface TimingData {
    parsing?: number;
    execution?: number;
    processing?: number;
    total: number;
    custom?: Record<string, number>;
}
/**
 * Result of executing a meta-command (VERSION, SCORE, HELP, etc.)
 *
 * Meta-commands operate outside the turn cycle - they don't increment turns,
 * trigger NPCs, or get stored in command history. They emit semantic events
 * that are processed immediately through the text service.
 */
export interface MetaCommandResult {
    /**
     * Discriminator for union type
     */
    type: 'meta';
    /**
     * Raw input string
     */
    input: string;
    /**
     * Whether the command succeeded
     */
    success: boolean;
    /**
     * Semantic events emitted by the meta-command
     * These are processed immediately through text service, not stored in turnEvents
     */
    events: ISemanticEvent[];
    /**
     * Error message if command failed
     */
    error?: string;
    /**
     * The action ID that was executed
     */
    actionId?: string;
}
/**
 * Result of executing a turn
 */
export interface TurnResult {
    /**
     * Discriminator for union type (optional for backward compatibility)
     */
    type?: 'turn';
    /**
     * Turn number
     */
    turn: number;
    /**
     * Raw input string
     */
    input: string;
    /**
     * All events generated this turn (in sequence)
     */
    events: ISemanticEvent[];
    /**
     * Structured text blocks from TextService (ADR-133).
     * Clients render these according to their capabilities.
     * Empty array or undefined when no text output was produced.
     */
    blocks?: ITextBlock[];
    /**
     * Whether the turn succeeded
     */
    success: boolean;
    /**
     * Error message if turn failed
     */
    error?: string;
    /**
     * Timing information
     */
    timing?: TimingData;
    /**
     * The action ID that was executed (if any)
     */
    actionId?: string;
    /**
     * The parsed command (if successfully parsed)
     */
    parsedCommand?: IParsedCommand;
    /**
     * The validated command with resolved entity IDs (if successfully validated)
     * Used for pronoun resolution (ADR-089)
     */
    validatedCommand?: IValidatedCommand;
    /**
     * Whether the turn is waiting for additional input (e.g., disambiguation)
     * When true, a client.query event was emitted and the engine expects
     * a follow-up response before continuing.
     */
    needsInput?: boolean;
}
/**
 * Union of all command execution results.
 *
 * executeTurn() returns this union type - callers should check `type` to determine
 * whether a turn was executed (TurnResult) or a meta-command was executed (MetaCommandResult).
 *
 * @example
 * ```typescript
 * const result = await engine.executeTurn(input);
 * if (result.type === 'meta') {
 *   // Meta-command: no turn number, text already emitted
 * } else {
 *   // Regular turn: has turn number, events to process
 *   console.log(`Turn ${result.turn}`);
 * }
 * ```
 */
export type CommandResult = TurnResult | MetaCommandResult;
/**
 * Alternate input mode handler (ADR-137).
 *
 * Registered by stories at init time. When active, the engine routes all
 * input to the handler instead of the standard parser pipeline.
 */
export interface InputModeHandler {
    /**
     * Process raw input and return semantic events.
     * The handler owns parsing, validation, and execution for this mode.
     */
    handleInput(input: string, world: WorldModel): ISemanticEvent[];
    /** Whether commands in this mode advance the game clock */
    advancesTurn: boolean;
}
/**
 * World state key for the active input mode ID.
 * When set, the engine routes input to the registered handler.
 */
export declare const INPUT_MODE_STATE_KEY = "if.inputMode";
/**
 * Game context for execution
 */
export interface GameContext {
    /**
     * Current turn number
     */
    currentTurn: number;
    /**
     * Player entity
     */
    player: IFEntity;
    /**
     * Turn history
     */
    history: TurnResult[];
    /**
     * Game metadata
     */
    metadata: {
        title?: string;
        author?: string;
        version?: string;
        started: Date;
        lastPlayed: Date;
    };
    /**
     * Custom game state
     */
    customState?: Record<string, unknown>;
    /**
     * Implicit actions configuration (ADR-104)
     * Populated from StoryConfig.implicitActions
     */
    implicitActions?: {
        inference?: boolean;
        implicitTake?: boolean;
    };
}
/**
 * Engine configuration
 */
export interface EngineConfig {
    /**
     * Maximum turns to keep in history
     */
    maxHistory?: number;
    /**
     * Whether to validate events before processing
     */
    validateEvents?: boolean;
    /**
     * Whether to emit timing information
     */
    collectTiming?: boolean;
    /**
     * Custom error handler
     */
    onError?: (error: Error, context: GameContext) => void;
    /**
     * Event interceptor for debugging
     */
    onEvent?: (event: ISemanticEvent) => void;
    /**
     * Debug mode - shows more detailed output
     */
    debug?: boolean;
    /**
     * Maximum undo snapshots to keep (default 10)
     * Set to 0 to disable undo
     */
    maxUndoSnapshots?: number;
}
/**
 * Summary of a registered action, suitable for JSON serialization.
 * Produced by GameEngine.introspect().
 */
export interface ActionSummary {
    /** Action identifier (e.g., "if.action.taking" or "dungeo.action.say"). */
    id: string;
    /** Semantic group (e.g., "inventory", "container"). */
    group: string | null;
    /** Pattern matching priority. */
    priority: number;
    /** True for stdlib actions (if.action.* prefix). */
    isStandard: boolean;
    /** Verb patterns from the language provider (e.g., ["take :item", "get :item"]). */
    patterns: string[];
    /** Help text from the language provider, if available. */
    help: {
        description: string;
        verbs: string[];
        examples: string[];
    } | null;
}
/**
 * Summary of a trait type in use across all entities.
 * Produced by GameEngine.introspect().
 */
export interface TraitSummary {
    /** Trait type identifier (e.g., "container", "dungeo.trait.troll_axe"). */
    type: string;
    /** True for world-model/stdlib traits, false for story-defined traits. */
    isStandard: boolean;
    /** Number of entities that have this trait. */
    entityCount: number;
    /** Entity IDs that have this trait. */
    entityIds: string[];
    /** Property names from a sample trait instance. */
    properties: string[];
    /** Capability action IDs this trait declares (from static capabilities). */
    capabilities: string[];
    /** Interceptor action IDs this trait declares (from static interceptors). */
    interceptors: string[];
}
/**
 * Summary of a capability behavior binding (trait + action + phases).
 * Produced by GameEngine.introspect().
 */
export interface BehaviorBindingSummary {
    /** Trait type this behavior is registered on. */
    traitType: string;
    /** Action/capability ID this behavior handles. */
    actionId: string;
    /** Registration priority (higher = checked first). */
    priority: number;
    /** Which 4-phase methods the behavior implements. */
    phases: string[];
    /** "capability" for CapabilityBehavior, "interceptor" for ActionInterceptor. */
    kind: 'capability' | 'interceptor';
}
/**
 * Summary of a registered message ID and its text.
 * Produced by GameEngine.introspect().
 */
export interface MessageSummary {
    /** Full message ID (e.g., "if.action.taking.taken" or "dungeo.thief.appears"). */
    id: string;
    /** The message text or template string. */
    text: string;
    /** "platform" for stdlib/engine messages, "story" for story-registered messages. */
    source: 'platform' | 'story';
}
/**
 * Serializable snapshot of engine state for tooling (VS Code extension, CLI).
 * Returned by GameEngine.introspect().
 */
export interface EngineIntrospection {
    /** All registered actions with patterns and metadata. */
    actions: ActionSummary[];
    /** All trait types in use with usage counts and metadata. */
    traits: TraitSummary[];
    /** All capability behavior and interceptor bindings. */
    behaviors: BehaviorBindingSummary[];
    /** All registered message IDs with text and source classification. */
    messages: MessageSummary[];
}
```

### narrative/narrative-settings

```typescript
/**
 * Narrative Settings - Story-level perspective configuration
 *
 * ADR-089 Phase C: Defines how the story narrates player actions.
 * Stories can be written in 1st, 2nd, or 3rd person perspective.
 */
import { PronounSet } from '@sharpee/world-model';
/**
 * Narrative perspective for player actions
 * - '1st': "I take the lamp" (rare, Anchorhead-style)
 * - '2nd': "You take the lamp" (default, Zork-style)
 * - '3rd': "She takes the lamp" (experimental)
 */
export type Perspective = '1st' | '2nd' | '3rd';
/**
 * Narrative tense (future consideration)
 * - 'present': "You take the lamp" (default)
 * - 'past': "You took the lamp"
 */
export type Tense = 'present' | 'past';
/**
 * Narrative settings for a story
 *
 * Controls how the text service renders player-facing messages.
 * Set via StoryConfig at story definition time.
 */
export interface NarrativeSettings {
    /**
     * Narrative perspective for player actions
     * - '1st': "I take the lamp" (rare)
     * - '2nd': "You take the lamp" (default)
     * - '3rd': "She takes the lamp" (experimental)
     */
    perspective: Perspective;
    /**
     * For 3rd person: which pronoun set to use for the PC.
     * If not specified, derived from player entity's ActorTrait.
     * Ignored for 1st/2nd person perspectives.
     */
    playerPronouns?: PronounSet;
    /**
     * Narrative tense (future consideration)
     * Currently only 'present' is supported.
     */
    tense?: Tense;
}
/**
 * Default narrative settings (2nd person present tense, Zork-style)
 */
export declare const DEFAULT_NARRATIVE_SETTINGS: NarrativeSettings;
/**
 * Narrative configuration for StoryConfig
 *
 * This is the subset of NarrativeSettings that authors specify.
 * Missing fields are filled with defaults.
 */
export interface NarrativeConfig {
    /**
     * Narrative perspective. Defaults to '2nd' if omitted.
     * Only specify if NOT using 2nd person (standard IF convention).
     */
    perspective?: Perspective;
    /**
     * For 3rd person: which pronoun set to use for the PC.
     * Derived from player entity's ActorTrait if not specified.
     */
    playerPronouns?: PronounSet;
}
/**
 * Build full NarrativeSettings from optional NarrativeConfig
 */
export declare function buildNarrativeSettings(config?: NarrativeConfig): NarrativeSettings;
```

### story

```typescript
/**
 * Story configuration and interfaces
 */
import { WorldModel, IFEntity, IGameEvent, SimpleEventHandler } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { Parser } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import type { GameEngine } from './game-engine';
import { NarrativeConfig } from './narrative';
/**
 * Story configuration
 */
export interface StoryConfig {
    /**
     * Story ID
     */
    id: string;
    /**
     * Story title
     */
    title: string;
    /**
     * Story author(s)
     */
    author: string | string[];
    /**
     * Story version (semantic version, e.g., "1.0.0" or "1.0.0-beta")
     */
    version: string;
    /**
     * Build date (ISO 8601 format, e.g., "2026-01-25T02:58:10Z")
     * Auto-generated by build.sh, used in banner display.
     */
    buildDate?: string;
    /**
     * Story description
     */
    description?: string;
    /**
     * Website URL
     */
    website?: string;
    /**
     * Contact email
     */
    email?: string;
    /**
     * Story tags
     */
    tags?: string[];
    /**
     * IFID (Interactive Fiction ID)
     */
    ifid?: string;
    /**
     * License
     */
    license?: string;
    /**
     * Release date
     */
    releaseDate?: string;
    /**
     * Custom configuration
     */
    custom?: Record<string, any>;
    /**
     * Narrative settings (perspective, tense)
     *
     * ADR-089: Controls how the story narrates player actions.
     * Defaults to 2nd person present tense ("You take the lamp").
     *
     * @example
     * // 1st person narrative (Anchorhead-style)
     * narrative: { perspective: '1st' }
     *
     * @example
     * // 3rd person with specific pronouns
     * narrative: { perspective: '3rd', playerPronouns: PRONOUNS.SHE_HER }
     */
    narrative?: NarrativeConfig;
    /**
     * Implicit action settings (ADR-104)
     *
     * Controls automatic inference and implicit actions like "first taking".
     * All default to true.
     *
     * @example
     * // Disable all implicit behavior (strict mode)
     * implicitActions: { inference: false, implicitTake: false }
     *
     * @example
     * // Allow inference but disable implicit take
     * implicitActions: { implicitTake: false }
     */
    implicitActions?: {
        /**
         * Whether to infer alternative targets when pronouns fail requirements.
         * Example: "read it" (it=mailbox) infers leaflet if only readable thing.
         * Default: true
         */
        inference?: boolean;
        /**
         * Whether to automatically take items when actions require holding them.
         * Example: "read leaflet" auto-takes if not held.
         * Default: true
         */
        implicitTake?: boolean;
    };
}
/**
 * Custom vocabulary that a story can provide
 */
export interface CustomVocabulary {
    /**
     * Custom verbs for this story
     */
    verbs?: Array<{
        actionId: string;
        verbs: string[];
        pattern?: string;
        prepositions?: string[];
    }>;
    /**
     * Custom nouns (future expansion)
     */
    nouns?: Array<{
        word: string;
        entityId?: string;
        priority?: number;
    }>;
    /**
     * Custom adjectives (future expansion)
     */
    adjectives?: Array<{
        word: string;
        entityId?: string;
    }>;
}
/**
 * Story interface - what a story module exports
 */
export interface Story {
    /**
     * Story configuration
     */
    config: StoryConfig;
    /**
     * Initialize the world for this story
     */
    initializeWorld(world: WorldModel): void;
    /**
     * Create the player entity
     */
    createPlayer(world: WorldModel): IFEntity;
    /**
     * Get custom actions for this story (optional)
     */
    getCustomActions?(): any[];
    /**
     * Get custom vocabulary for this story (optional)
     * Called after story initialization to register custom verbs, nouns, etc.
     */
    getCustomVocabulary?(): CustomVocabulary;
    /**
     * Story-specific initialization (optional)
     */
    initialize?(): void;
    /**
     * Check if the story is complete (optional)
     */
    isComplete?(): boolean;
    /**
     * Extend the parser with story-specific vocabulary (optional)
     */
    extendParser?(parser: Parser): void;
    /**
     * Extend the language provider with story-specific messages (optional)
     */
    extendLanguage?(language: LanguageProvider): void;
    /**
     * Called after the engine is fully initialized (optional).
     * Use this to register parsed command transformers or other engine hooks.
     *
     * @param engine - The fully initialized game engine
     */
    onEngineReady?(engine: GameEngine): void;
}
/**
 * Extended story class with event handling capabilities
 */
export declare class StoryWithEvents implements Story {
    config: StoryConfig;
    private eventEmitter;
    constructor(config: StoryConfig);
    /**
     * Register a story-level event handler (daemon)
     */
    on(eventType: string, handler: SimpleEventHandler): void;
    /**
     * Remove a story-level event handler
     */
    off(eventType: string, handler: SimpleEventHandler): void;
    /**
     * Emit an event to story-level handlers
     * Returns any semantic events generated by handlers
     */
    emit(event: IGameEvent): ISemanticEvent[];
    initializeWorld(world: WorldModel): void;
    createPlayer(world: WorldModel): IFEntity;
}
/**
 * Validate story configuration
 */
export declare function validateStoryConfig(config: StoryConfig): void;
```

### command-executor

```typescript
/**
 * Command Executor - Orchestrates command pipeline
 *
 * Responsibilities:
 * - Orchestrate the four-phase pattern (validate → execute → report/blocked)
 * - Handle implicit inference (ADR-104) when validation fails with pronouns
 * - Pass results between phases
 * - Return the final TurnResult
 *
 * All event creation is owned by the action components themselves.
 */
import { ISystemEvent, IGenericEventSource, Result } from '@sharpee/core';
import { IParser, IValidatedCommand, IParsedCommand, IValidationError } from '@sharpee/world-model';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { ActionRegistry } from '@sharpee/stdlib';
import { GameContext, TurnResult, EngineConfig } from './types';
/**
 * Data passed to pre-action hook listeners (ADR-148).
 *
 * Emitted after command validation but before the action's validate phase.
 * Listeners can modify world state (e.g., break concealment before a noisy action).
 */
export interface BeforeActionHookData {
    /** The action about to execute */
    actionId: string;
    /** The actor performing the action */
    actorId?: string;
    /** Direct object entity ID, if any */
    directObjectId?: string;
}
/**
 * Listener for pre-action hooks.
 *
 * @param data - Hook data describing the action about to execute
 * @param world - The world model (mutable — listeners can change state)
 */
export type BeforeActionHookListener = (data: BeforeActionHookData, world: WorldModel) => void;
/**
 * Transformer function for parsed commands.
 * Called after parsing but before validation.
 * Can modify the parsed command to bypass or alter validation behavior.
 *
 * @param parsed - The parsed command from the parser
 * @param world - The world model for checking state (e.g., gdtMode)
 * @returns The (potentially modified) parsed command
 */
export type ParsedCommandTransformer = (parsed: IParsedCommand, world: WorldModel) => IParsedCommand;
export declare class CommandExecutor {
    private parser;
    private validator;
    private actionRegistry;
    private eventProcessor;
    private scopeResolver?;
    private parsedCommandTransformers;
    private beforeActionListeners;
    constructor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>);
    /**
     * Validate a parsed command against the world model.
     *
     * @param command - The parsed command to validate
     * @returns Result with validated command or validation error
     */
    validateCommand(command: IParsedCommand): Result<IValidatedCommand, IValidationError>;
    /**
     * Register a transformer that can modify parsed commands before validation.
     * Transformers are called in order of registration.
     *
     * @param transformer - Function to transform parsed commands
     */
    registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void;
    /**
     * Unregister a previously registered transformer.
     *
     * @param transformer - The transformer to remove
     * @returns true if the transformer was found and removed
     */
    unregisterParsedCommandTransformer(transformer: ParsedCommandTransformer): boolean;
    /**
     * Register a listener for the pre-action hook (ADR-148).
     *
     * Listeners fire after command context creation but before the action's
     * validate phase. They can modify world state (e.g., break concealment).
     *
     * @param listener - The hook listener to register
     */
    onBeforeAction(listener: BeforeActionHookListener): void;
    /**
     * Emit the pre-action hook to all registered listeners.
     */
    private emitBeforeAction;
    execute(input: string, world: WorldModel, context: GameContext, config?: EngineConfig): Promise<TurnResult>;
}
export declare function createCommandExecutor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>): CommandExecutor;
```

### capability-dispatch-helper

```typescript
/**
 * Capability Dispatch Helper for Universal Dispatch
 *
 * Enables capability dispatch for ALL stdlib actions, not just specialized verbs.
 * When an entity's trait declares a capability for an action, the trait's behavior
 * handles the action instead of the stdlib default.
 *
 * This enables patterns like:
 * - Troll blocking: TrollTrait handles 'if.action.going' to block passage
 * - Custom containers: ChestTrait handles 'if.action.opening' for locked chest
 * - Guardian items: AxeTrait handles 'if.action.taking' while troll guards it
 *
 * Resolution modes (ADR-090 extension):
 * - first-wins: First entity with capability determines result
 * - any-blocks: Any entity returning valid: false blocks
 * - all-must-pass: All entities must return valid: true
 * - highest-priority: Only highest priority entity is checked
 */
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, CapabilityBehavior, CapabilitySharedData, ITrait, CapabilityResolution } from '@sharpee/world-model';
import { ActionContext, ValidationResult } from '@sharpee/stdlib';
/**
 * A single capability claim from an entity.
 */
export interface CapabilityClaim {
    /** The entity making the claim */
    entity: IFEntity;
    /** The trait claiming the capability */
    trait: ITrait;
    /** The behavior to use */
    behavior: CapabilityBehavior;
    /** Priority for resolution ordering */
    priority: number;
    /** Resolution override from binding (if any) */
    resolutionOverride?: CapabilityResolution;
}
/**
 * Result of checking for capability dispatch.
 */
export interface CapabilityDispatchCheck {
    /** Whether capability dispatch should be used */
    shouldDispatch: boolean;
    /** The trait claiming the capability (if found) - for single dispatch */
    trait?: ITrait;
    /** The behavior to use (if found) - for single dispatch */
    behavior?: CapabilityBehavior;
    /** The entity with the capability - for single dispatch */
    entity?: IFEntity;
    /** All claims found (for multi-entity resolution) */
    claims?: CapabilityClaim[];
    /** Resolution mode to use */
    resolution?: CapabilityResolution;
}
/**
 * Data stored for capability dispatch between phases.
 */
export interface CapabilityDispatchData {
    trait: ITrait;
    behavior: CapabilityBehavior;
    entityId: string;
    entityName: string;
    sharedData: CapabilitySharedData;
}
/**
 * Check if capability dispatch should be used for this action and target.
 *
 * @param actionId - The action being executed
 * @param target - The target entity (directObject) - for backward compatibility
 * @returns Check result with trait and behavior if dispatch should be used
 */
export declare function checkCapabilityDispatch(actionId: string, target: IFEntity | undefined): CapabilityDispatchCheck;
/**
 * Check if capability dispatch should be used for this action across multiple entities.
 *
 * Collects all capability claims from the provided entities, sorts by priority,
 * and returns the appropriate dispatch information based on resolution config.
 *
 * @param actionId - The action being executed
 * @param entities - All entities involved in the action (directObject, indirectObject, etc.)
 * @returns Check result with claims and resolution mode
 */
export declare function checkCapabilityDispatchMulti(actionId: string, entities: (IFEntity | undefined)[]): CapabilityDispatchCheck;
/**
 * Execute capability dispatch validation phase.
 *
 * Handles resolution modes:
 * - first-wins/highest-priority: Single behavior validates
 * - any-blocks: All behaviors validate, any false blocks
 * - all-must-pass: All behaviors must return true
 *
 * @returns ValidationResult with dispatch data if valid
 */
export declare function executeCapabilityValidate(check: CapabilityDispatchCheck, context: ActionContext): ValidationResult;
/**
 * Execute capability dispatch execute phase.
 */
export declare function executeCapabilityExecute(context: ActionContext): void;
/**
 * Execute capability dispatch report phase.
 */
export declare function executeCapabilityReport(context: ActionContext): ISemanticEvent[];
/**
 * Execute capability dispatch blocked phase.
 */
export declare function executeCapabilityBlocked(context: ActionContext, result: ValidationResult, actionId: string): ISemanticEvent[];
```

### parser-interface

```typescript
/**
 * Extended parser interface for engine integration
 *
 * The base IParser interface (from world-model) defines only the parse() method.
 * This interface extends it with optional methods that the engine can use when
 * available, replacing duck-typing with proper type guards.
 */
import type { IParser, IValidatedCommand, WorldModel } from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Extended parser interface for engine integration.
 *
 * Parsers can optionally implement these methods to enable:
 * - World-aware scope constraints (setWorldContext)
 * - Debug event emission (setPlatformEventEmitter)
 * - Pronoun resolution (updatePronounContext, resetPronounContext)
 */
export interface IEngineAwareParser extends IParser {
    /**
     * Set the world context for scope constraint evaluation.
     * Called before parsing to enable entity resolution based on
     * visibility, reachability, etc.
     *
     * @param world The current world model
     * @param actorId The player's entity ID
     * @param currentLocation The player's current location ID
     */
    setWorldContext?(world: WorldModel, actorId: string, currentLocation: string): void;
    /**
     * Set platform event emitter for parser debugging.
     * When set, parser emits debug events during parsing.
     *
     * @param emitter Function to emit events, or undefined to disable
     */
    setPlatformEventEmitter?(emitter: ((event: ISemanticEvent) => void) | undefined): void;
    /**
     * Update pronoun context after successful command execution.
     * Called by the engine to track entities referenced by pronouns
     * like "it", "them", "him", "her".
     *
     * @param command The validated command with resolved entity IDs
     * @param turnNumber Current turn number for context decay
     */
    updatePronounContext?(command: IValidatedCommand, turnNumber: number): void;
    /**
     * Reset the pronoun context.
     * Called on game restart or when context should be cleared.
     */
    resetPronounContext?(): void;
}
/**
 * Type guard to check if a parser implements engine-aware methods.
 *
 * @param parser The parser to check
 * @returns True if the parser has any engine-aware methods
 */
export declare function isEngineAwareParser(parser: IParser): parser is IEngineAwareParser;
/**
 * Type guard for parser with world context support.
 */
export declare function hasWorldContext(parser: IParser): parser is IEngineAwareParser & {
    setWorldContext: NonNullable<IEngineAwareParser['setWorldContext']>;
};
/**
 * Type guard for parser with pronoun context support.
 */
export declare function hasPronounContext(parser: IParser): parser is IEngineAwareParser & {
    updatePronounContext: NonNullable<IEngineAwareParser['updatePronounContext']>;
    resetPronounContext: NonNullable<IEngineAwareParser['resetPronounContext']>;
};
/**
 * Type guard for parser with platform event emitter support.
 */
export declare function hasPlatformEventEmitter(parser: IParser): parser is IEngineAwareParser & {
    setPlatformEventEmitter: NonNullable<IEngineAwareParser['setPlatformEventEmitter']>;
};
```

### shared-data-keys

```typescript
/**
 * Typed constants for sharedData keys used by the engine orchestration.
 *
 * SharedData is passed between action phases (validate/execute/report/blocked)
 * and allows phases to communicate without modifying the context directly.
 *
 * This file defines only engine-level keys. Actions define their own
 * action-specific keys as needed.
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { IFEntity } from '@sharpee/world-model';
import type { ValidationResult } from '@sharpee/stdlib';
/**
 * Constants for engine-level sharedData keys.
 * Using constants prevents typos and enables IDE autocomplete.
 */
export declare const SharedDataKeys: {
    /** Whether pronoun inference was performed (ADR-104) */
    readonly INFERENCE_PERFORMED: "inferencePerformed";
    /** The original target entity before inference */
    readonly ORIGINAL_TARGET: "originalTarget";
    /** The inferred target entity after inference */
    readonly INFERRED_TARGET: "inferredTarget";
    /** Events from implicit take actions (ADR-104) */
    readonly IMPLICIT_TAKE_EVENTS: "implicitTakeEvents";
    /** Validation result from the validate phase */
    readonly VALIDATION_RESULT: "validationResult";
};
/**
 * Type for the value type of a SharedDataKey
 */
export type SharedDataKeyType = typeof SharedDataKeys[keyof typeof SharedDataKeys];
/**
 * Typed interface for engine-level shared data.
 *
 * Note: Actions can store additional keys beyond these.
 * This interface covers only the engine orchestration keys.
 */
export interface EngineSharedData {
    /** Whether pronoun inference was performed */
    [SharedDataKeys.INFERENCE_PERFORMED]?: boolean;
    /** The original target entity before inference */
    [SharedDataKeys.ORIGINAL_TARGET]?: IFEntity;
    /** The inferred target entity after inference */
    [SharedDataKeys.INFERRED_TARGET]?: IFEntity;
    /** Events from implicit take actions */
    [SharedDataKeys.IMPLICIT_TAKE_EVENTS]?: ISemanticEvent[];
    /** Validation result from the validate phase */
    [SharedDataKeys.VALIDATION_RESULT]?: ValidationResult;
    /** Allow additional action-specific keys */
    [key: string]: unknown;
}
```

### game-engine

```typescript
/**
 * Game Engine - Main runtime for Sharpee IF games
 *
 * Manages game state, turn execution, and coordinates all subsystems
 */
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { Parser, IPerceptionService } from '@sharpee/stdlib';
import { LanguageProvider } from '@sharpee/if-domain';
import { ITextService } from '@sharpee/text-service';
import { ITextBlock } from '@sharpee/text-blocks';
import { ISemanticEvent, ISaveRestoreHooks, ISemanticEventSource } from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { GameContext, TurnResult, EngineConfig, InputModeHandler, EngineIntrospection } from './types';
import { Story } from './story';
import { NarrativeSettings } from './narrative';
import { ParsedCommandTransformer, BeforeActionHookListener } from './command-executor';
/**
 * Game engine events
 */
export interface GameEngineEvents {
    'turn:start': (turn: number, input: string) => void;
    'turn:complete': (result: TurnResult) => void;
    'turn:failed': (error: Error, turn: number) => void;
    'event': (event: ISemanticEvent) => void;
    'state:changed': (context: GameContext) => void;
    'game:over': (context: GameContext) => void;
    'text:output': (blocks: ITextBlock[], turn: number) => void;
}
type GameEngineEventName = keyof GameEngineEvents;
type GameEngineEventListener<K extends GameEngineEventName> = GameEngineEvents[K];
/**
 * Main game engine
 */
export declare class GameEngine {
    private world;
    private sessionStartTime?;
    private sessionTurns;
    private sessionMoves;
    private context;
    private config;
    private commandExecutor;
    private eventProcessor;
    private platformEvents;
    private actionRegistry;
    private textService?;
    private turnEvents;
    private running;
    private story?;
    private languageProvider?;
    private parser?;
    private eventListeners;
    private saveRestoreHooks?;
    private eventSource;
    private systemEventSource;
    private pendingPlatformOps;
    private perceptionService?;
    private pluginRegistry;
    private random;
    private narrativeSettings;
    private inputModeHandlers;
    private vocabularyManager;
    private saveRestoreService;
    private turnEventProcessor;
    private platformOpHandler?;
    private hasEmittedInitialized;
    constructor(options: {
        world: WorldModel;
        player: IFEntity;
        parser: Parser;
        language: LanguageProvider;
        perceptionService?: IPerceptionService;
        config?: EngineConfig;
    });
    /**
     * Set the story for this engine
     */
    setStory(story: Story): void;
    /**
     * Get the current parser
     */
    getParser(): Parser | undefined;
    /**
     * Get the current language provider
     */
    getLanguageProvider(): LanguageProvider | undefined;
    /**
     * Returns a serializable snapshot of the engine's internal state for
     * tooling (VS Code extension, CLI --world-json). The engine owns the
     * serialization — callers consume the plain data shape.
     *
     * @returns EngineIntrospection with actions, patterns, and metadata
     */
    introspect(): EngineIntrospection;
    /**
     * Start the game engine
     */
    start(): void;
    /**
     * Stop the game engine
     */
    stop(reason?: 'quit' | 'victory' | 'defeat' | 'abort', details?: any): void;
    /**
     * Restart the game from scratch.
     *
     * Clears the world, resets engine state, and re-initializes the story.
     * Called from both processMetaPlatformOperation and processPlatformOperations.
     */
    private restartGame;
    /**
     * Execute a turn
     */
    executeTurn(input: string): Promise<TurnResult>;
    /**
     * Execute a meta-command (VERSION, SCORE, HELP, etc.)
     *
     * Meta-commands operate outside the turn cycle:
     * - They don't increment turns
     * - They don't trigger NPC ticks or scheduler
     * - They don't create undo snapshots
     * - They don't get stored in command history
     * - Events are processed immediately through text service (not stored in turnEvents)
     *
     * @param input - Raw command string
     * @param parsedCommand - Parsed command from parser
     * @returns MetaCommandResult with events and success status
     */
    private executeMetaCommand;
    /**
     * Process meta-command events: text service → emit to clients
     *
     * - Does NOT store in turnEvents
     * - Passes currentTurn for display context (turn/score shown to player)
     * - Turn counter is NOT incremented
     */
    private processMetaEvents;
    /**
     * Process a single platform operation for meta-commands.
     *
     * This is similar to processPlatformOperations but handles one operation
     * at a time and returns completion events for inclusion in the result.
     */
    private processMetaPlatformOperation;
    /**
     * Get current game context
     */
    getContext(): GameContext;
    /**
     * Switch the player character to a different entity (ADR-132).
     *
     * Synchronizes all three player identity layers:
     * 1. ActorTrait.isPlayer on old/new entities
     * 2. WorldModel.playerId
     * 3. GameContext.player
     *
     * Also resets parser context, vocabulary, and narrative settings.
     *
     * Must be called between turns only. Appropriate call sites:
     * - An interceptor's postExecute() phase
     * - A daemon/fuse callback
     * - A story-specific action's execute() phase
     *
     * Story code must position the new PC (via world.moveEntity) BEFORE
     * calling switchPlayer, since parser context uses the entity's current location.
     */
    switchPlayer(entityId: string): void;
    /**
     * Get world model
     */
    getWorld(): WorldModel;
    /**
     * Get the current story
     */
    getStory(): Story | undefined;
    /**
     * Get the event source for save/restore
     */
    getEventSource(): ISemanticEventSource;
    /**
     * Get narrative settings (ADR-089)
     *
     * Returns the story's narrative perspective and related settings.
     * Use this for text rendering that needs to know 1st/2nd/3rd person.
     */
    getNarrativeSettings(): NarrativeSettings;
    /**
     * Configure language provider with narrative settings (ADR-089)
     *
     * Sets up the language provider for perspective-aware message resolution.
     * For 3rd person narratives, extracts player pronouns from ActorTrait.
     */
    private configureLanguageProviderNarrative;
    /**
     * Synchronize all derived player state after a player identity change (ADR-132).
     *
     * Updates GameContext.player, parser world context, pronoun context,
     * scope vocabulary, and narrative settings. WorldModel.playerId and
     * ActorTrait.isPlayer must already be set before calling this.
     */
    private syncPlayerState;
    /**
     * Get plugin registry for registering turn-cycle plugins (ADR-120)
     */
    getPluginRegistry(): PluginRegistry;
    /**
     * Get event processor for handler registration (ADR-075)
     */
    getEventProcessor(): EventProcessor;
    /**
     * Register an alternate input mode handler (ADR-137).
     *
     * Stories call this at init time. The handler is invoked when the
     * world state key `if.inputMode` matches the registered ID.
     *
     * @param id Mode identifier (e.g., 'dungeo.mode.gdt')
     * @param handler The input mode handler
     */
    registerInputMode(id: string, handler: InputModeHandler): void;
    /**
     * Execute input through an alternate input mode handler (ADR-137).
     *
     * Bypasses the standard parser pipeline. Events go through the text
     * service for rendering. Turn counter advances only if the handler says so.
     */
    private executeInputMode;
    /**
     * Append a PROMPT block to the output (ADR-137).
     *
     * Reads the current prompt from world state, resolves through the
     * language provider, and appends as the last block.
     */
    private appendPromptBlock;
    /**
     * Get the text service
     */
    getTextService(): ITextService | undefined;
    /**
     * Set a custom text service
     */
    setTextService(service: ITextService): void;
    /**
     * Register save/restore hooks
     */
    registerSaveRestoreHooks(hooks: ISaveRestoreHooks): void;
    /**
     * Get currently registered save/restore hooks
     */
    getSaveRestoreHooks(): ISaveRestoreHooks | undefined;
    /**
     * Register a transformer for parsed commands.
     * Transformers are called after parsing but before validation,
     * allowing stories to modify commands (e.g., for debug tools).
     *
     * @param transformer - Function to transform parsed commands
     */
    registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void;
    /**
     * Unregister a parsed command transformer.
     *
     * @param transformer - The transformer to remove
     * @returns true if the transformer was found and removed
     */
    unregisterParsedCommandTransformer(transformer: ParsedCommandTransformer): boolean;
    /**
     * Register a pre-action hook listener (ADR-148).
     *
     * Listeners fire after command context creation but before the action's
     * validate phase. They can modify world state (e.g., break concealment
     * before a noisy action executes).
     *
     * @param listener - The hook listener
     */
    onBeforeAction(listener: BeforeActionHookListener): void;
    /**
     * Save game state using registered hooks
     */
    save(): Promise<boolean>;
    /**
     * Restore game state using registered hooks
     */
    restore(): Promise<boolean>;
    /**
     * Create an undo snapshot of the current world state
     */
    private createUndoSnapshot;
    /**
     * Undo to previous turn
     * @returns true if undo succeeded, false if nothing to undo
     */
    undo(): boolean;
    /**
     * Check if undo is available
     */
    canUndo(): boolean;
    /**
     * Get number of undo levels available
     */
    getUndoLevels(): number;
    /**
     * Process events from a plugin through the shared pipeline (ADR-120)
     * Enriches, filters, stores, and emits events.
     */
    private processPluginEvents;
    /**
     * Create save data from current engine state
     */
    private createSaveData;
    /**
     * Load save data into engine
     */
    private loadSaveData;
    /**
     * Get turn history
     */
    getHistory(): TurnResult[];
    /**
     * Get recent events
     */
    getRecentEvents(count?: number): ISemanticEvent[];
    /**
     * Update vocabulary for an entity
     */
    updateEntityVocabulary(entity: IFEntity, inScope: boolean): void;
    /**
     * Update vocabulary for all entities in scope
     */
    updateScopeVocabulary(): void;
    /**
     * Emit a platform event with turn metadata
     */
    emitPlatformEvent(event: Omit<ISemanticEvent, 'id' | 'timestamp'>): void;
    /**
     * Update context after a turn
     */
    private updateContext;
    /**
     * Update command history capability
     */
    private updateCommandHistory;
    /**
     * Process pending platform operations
     */
    private processPlatformOperations;
    /**
     * Emit a game lifecycle event.
     * All game events now use ISemanticEvent with data in the `data` field.
     * (IGameEvent with `payload` is deprecated - see ADR-097)
     */
    private emitGameEvent;
    /**
     * Emit an event to listeners
     */
    private emit;
    /**
     * Check if game is over
     */
    private isGameOver;
    /**
     * Add event listener
     */
    on<K extends GameEngineEventName>(event: K, listener: GameEngineEventListener<K>): this;
    /**
     * Remove event listener
     */
    off<K extends GameEngineEventName>(event: K, listener: GameEngineEventListener<K>): this;
}
export {};
```

### scene-evaluation-plugin

```typescript
/**
 * Scene evaluation turn plugin (ADR-149).
 *
 * Evaluates scene begin/end conditions each turn. Runs after NPC turns
 * and state machines, before daemons/fuses (priority 60).
 *
 * For each registered scene:
 * - If state='waiting' and begin() returns true → activate, emit scene_began
 * - If state='active' and end() returns true → end (or reset if recurring), emit scene_ended
 * - If state='active' → increment activeTurns
 *
 * Public interface: SceneEvaluationPlugin (TurnPlugin implementation).
 * Owner context: @sharpee/engine — turn cycle
 */
import { ISemanticEvent } from '@sharpee/core';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';
export declare class SceneEvaluationPlugin implements TurnPlugin {
    id: string;
    priority: number;
    /**
     * Evaluates all registered scene conditions after a successful action.
     */
    onAfterAction(context: TurnPluginContext): ISemanticEvent[];
}
```

### vocabulary-manager

```typescript
/**
 * Vocabulary Manager - Manages entity vocabulary for parser scope resolution
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Handles registering entity nouns/adjectives with the vocabulary registry
 * to enable parser noun resolution within the current scope.
 */
import { IFEntity, WorldModel } from '@sharpee/world-model';
/**
 * Manages vocabulary registration for entities in scope
 */
export declare class VocabularyManager {
    /**
     * Update vocabulary for a single entity
     *
     * @param entity - The entity to register
     * @param inScope - Whether the entity is currently in scope
     */
    updateEntityVocabulary(entity: IFEntity, inScope: boolean): void;
    /**
     * Update vocabulary for all entities based on current scope
     *
     * Marks all entities as out of scope first, then marks
     * entities visible to the player as in scope.
     *
     * @param world - The world model
     * @param playerId - The player entity ID
     */
    updateScopeVocabulary(world: WorldModel, playerId: string): void;
}
/**
 * Create a vocabulary manager instance
 */
export declare function createVocabularyManager(): VocabularyManager;
```

### save-restore-service

```typescript
/**
 * Save/Restore Service — manages game state persistence and undo.
 *
 * Public interface: {@link SaveRestoreService} class — `createSaveData`,
 * `loadSaveData`, plus undo helpers (`createUndoSnapshot`, `undo`,
 * `canUndo`, `getUndoLevels`, `clearUndoSnapshots`).
 *
 * Bounded context: `@sharpee/engine` runtime. Every Sharpee host (CLI,
 * platform-browser, multi-user sandbox) routes saves through this
 * service.
 *
 * Save format v2.0.0 (one-shot cutover from v1.0.0; v1 saves rejected):
 *   - `IEngineState.worldSnapshot` carries the verbatim
 *     `WorldModel.toJSON()` output, gzipped, then base64-encoded for
 *     JSON-safety. Hydration: base64-decode → gunzip → `world.loadJSON()`.
 *   - This replaces v1's partial `spatialIndex` serializer, which
 *     captured only entity traits + room contents and silently dropped
 *     the ScoreLedger, capabilities, world state values, relationships,
 *     ID counters, and sub-container containment.
 */
import { WorldModel } from '@sharpee/world-model';
import { ISaveData, ISerializedTurn, ISemanticEventSource } from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { TurnResult, GameContext } from './types';
import { Story } from './story';
/**
 * Interface for accessing engine state needed for save/restore
 */
export interface ISaveRestoreStateProvider {
    getWorld(): WorldModel;
    getContext(): GameContext;
    getStory(): Story | undefined;
    getEventSource(): ISemanticEventSource;
    getPluginRegistry(): PluginRegistry;
    getParser(): unknown | undefined;
}
/**
 * Configuration for the undo system
 */
export interface UndoConfig {
    maxSnapshots: number;
}
/**
 * Service for managing save/restore and undo functionality
 */
export declare class SaveRestoreService {
    private undoSnapshots;
    private undoSnapshotTurns;
    private maxUndoSnapshots;
    constructor(config?: UndoConfig);
    /**
     * Create an undo snapshot of the current world state
     */
    createUndoSnapshot(world: WorldModel, currentTurn: number): void;
    /**
     * Undo to previous turn
     * @returns The turn number restored to, or null if nothing to undo
     */
    undo(world: WorldModel): {
        turn: number;
    } | null;
    /**
     * Check if undo is available
     */
    canUndo(): boolean;
    /**
     * Get number of undo levels available
     */
    getUndoLevels(): number;
    /**
     * Clear all undo snapshots (e.g., after restore)
     */
    clearUndoSnapshots(): void;
    /**
     * Create save data from current engine state
     */
    createSaveData(provider: ISaveRestoreStateProvider): ISaveData;
    /**
     * Load save data into engine state
     * @returns New event source with restored events
     */
    loadSaveData(saveData: ISaveData, provider: ISaveRestoreStateProvider): {
        eventSource: ISemanticEventSource;
        currentTurn: number;
    };
    /**
     * Serialize event source
     */
    private serializeEventSource;
    /**
     * Serialize event data, handling functions and special types
     */
    private serializeEventData;
    /**
     * Deserialize event source
     */
    private deserializeEventSource;
    /**
     * Deserialize event data, handling function markers
     */
    private deserializeEventData;
    /**
     * Serialize turn history
     */
    private serializeTurnHistory;
    /**
     * Deserialize turn history
     */
    deserializeTurnHistory(turns: ISerializedTurn[], eventSource: ISemanticEventSource): TurnResult[];
    /**
     * Serialize parser state
     */
    private serializeParserState;
}
/**
 * Create a save/restore service instance
 */
export declare function createSaveRestoreService(config?: UndoConfig): SaveRestoreService;
```

### turn-event-processor

```typescript
/**
 * Turn Event Processor - Processes events during turn execution
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Handles event enrichment, perception filtering, and event emission.
 */
import { ISemanticEvent, ISemanticEventSource, IPlatformEvent } from '@sharpee/core';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { IPerceptionService } from '@sharpee/stdlib';
import { EngineConfig } from './types';
/**
 * Context for event processing pipeline
 */
export interface EventProcessingContext {
    turn?: number;
    playerId?: string;
    locationId?: string;
}
/**
 * Process an event through normalization and enrichment
 */
export declare function processEvent(event: ISemanticEvent, context?: EventProcessingContext): ISemanticEvent;
/**
 * Context for event enrichment - matches EventProcessingContext
 */
export interface EnrichmentContext {
    turn: number;
    playerId: string;
    locationId: string | undefined;
}
/**
 * Result of processing events for a turn phase
 */
export interface ProcessedEventsResult {
    /** Processed semantic events */
    semanticEvents: ISemanticEvent[];
    /** Platform events that need handling */
    platformEvents: IPlatformEvent[];
}
/**
 * Callback type for emitting events
 */
export type EventEmitCallback = (event: ISemanticEvent) => void;
/**
 * Callback type for dispatching to entity handlers
 */
export type EntityHandlerDispatcher = (event: ISemanticEvent) => void;
/**
 * Service for processing turn events
 */
export declare class TurnEventProcessor {
    private perceptionService?;
    constructor(perceptionService?: IPerceptionService | undefined);
    /**
     * Process action events from command execution
     *
     * @param events - Raw events from command executor
     * @param enrichmentContext - Context for event enrichment
     * @param player - Player entity for perception filtering
     * @param world - World model for perception filtering
     * @returns Processed events and platform events
     */
    processActionEvents(events: ISemanticEvent[], enrichmentContext: EnrichmentContext, player: IFEntity, world: WorldModel): ProcessedEventsResult;
    /**
     * Process semantic events (e.g., from NPC or scheduler ticks)
     *
     * @param events - Semantic events to process
     * @param enrichmentContext - Context for event enrichment
     * @param player - Player entity for perception filtering
     * @param world - World model for perception filtering
     * @returns Processed events and platform events
     */
    processSemanticEvents(events: ISemanticEvent[], enrichmentContext: EnrichmentContext, player: IFEntity, world: WorldModel): ProcessedEventsResult;
    /**
     * Emit events through all configured channels
     *
     * @param semanticEvents - Events to emit
     * @param eventSource - Event source for tracking
     * @param turnEvents - Turn events map to update
     * @param turn - Current turn number
     * @param config - Engine config with event callback
     * @param eventEmitter - Callback for engine event emission
     * @param entityDispatcher - Optional callback for entity handler dispatch
     */
    emitEvents(semanticEvents: ISemanticEvent[], eventSource: ISemanticEventSource, turnEvents: Map<number, ISemanticEvent[]>, turn: number, config: EngineConfig, eventEmitter: EventEmitCallback, entityDispatcher?: EntityHandlerDispatcher): void;
    /**
     * Check for victory events in the processed events
     *
     * @param events - Events to check
     * @returns Victory details if found, null otherwise
     */
    checkForVictory(events: ISemanticEvent[]): {
        reason: string;
        score: number;
    } | null;
}
/**
 * Create a turn event processor instance
 */
export declare function createTurnEventProcessor(perceptionService?: IPerceptionService): TurnEventProcessor;
```

### platform-operations

```typescript
/**
 * Platform Operations Handler - Handles platform events (save/restore/quit/restart/undo)
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Uses strategy pattern to handle different platform operation types.
 */
import { IPlatformEvent, ISemanticEvent, ISemanticEventSource, ISaveRestoreHooks } from '@sharpee/core';
import type { IParser } from '@sharpee/world-model';
import { SaveRestoreService, ISaveRestoreStateProvider } from './save-restore-service';
import { VocabularyManager } from './vocabulary-manager';
/**
 * Context for platform operation handling
 */
export interface PlatformOperationContext {
    currentTurn: number;
    turnEvents: Map<number, ISemanticEvent[]>;
    eventSource: ISemanticEventSource;
    emitEvent: (event: ISemanticEvent) => void;
}
/**
 * Callbacks for engine-level operations that require engine access
 */
export interface EngineCallbacks {
    stopEngine: (reason?: 'quit' | 'victory' | 'defeat' | 'abort') => void;
    restartStory: () => Promise<void>;
    updateContext: (updates: {
        currentTurn?: number;
    }) => void;
    updateScopeVocabulary: () => void;
    emitStateChanged: () => void;
    getParser: () => IParser | undefined;
}
/**
 * Handler for platform operations
 */
export declare class PlatformOperationHandler {
    private saveRestoreHooks;
    private saveRestoreService;
    private stateProvider;
    private vocabularyManager;
    constructor(saveRestoreHooks: ISaveRestoreHooks | undefined, saveRestoreService: SaveRestoreService, stateProvider: ISaveRestoreStateProvider, vocabularyManager: VocabularyManager);
    /**
     * Process all pending platform operations
     *
     * @param pendingOps - Array of pending platform operations
     * @param context - Platform operation context
     * @param engineCallbacks - Callbacks for engine-level operations
     */
    processAll(pendingOps: IPlatformEvent[], context: PlatformOperationContext, engineCallbacks: EngineCallbacks): Promise<void>;
    /**
     * Handle a single platform operation
     */
    private handleOperation;
    /**
     * Handle save request
     */
    private handleSave;
    /**
     * Handle restore request
     */
    private handleRestore;
    /**
     * Handle quit request
     */
    private handleQuit;
    /**
     * Handle restart request
     */
    private handleRestart;
    /**
     * Handle undo request
     */
    private handleUndo;
    /**
     * Create an error event for a failed operation
     */
    private createErrorEvent;
}
/**
 * Create a platform operation handler instance
 */
export declare function createPlatformOperationHandler(saveRestoreHooks: ISaveRestoreHooks | undefined, saveRestoreService: SaveRestoreService, stateProvider: ISaveRestoreStateProvider, vocabularyManager: VocabularyManager): PlatformOperationHandler;
```
