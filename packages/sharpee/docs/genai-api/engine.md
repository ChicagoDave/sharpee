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
import { LanguageProvider, IChannelRegistry } from '@sharpee/if-domain';
import { Parser } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import type { GameEngine } from './game-engine.js';
import { NarrativeConfig } from './narrative/index.js';
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
     * Credit lines for the opening banner's `author-list` section. Each
     * string becomes one `author-list`-classed paragraph. Use this when
     * the banner needs distinct credit lines (e.g., a primary author
     * line plus a "Ported by …" line, or multiple separate roles).
     *
     * When omitted, the engine falls back to a single `author-list`
     * entry built from `author` (joined with ", " if it's an array).
     */
    credits?: string[];
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
 * Story interface — what a story module's `createStory()` factory returns.
 *
 * ADR-248 factory-only contract: a story module exports exactly
 * `export function createStory(): Story` (no `story`/`config`/default
 * singleton exports). Every boot — including an in-process restart reboot —
 * calls the factory for a fresh instance, so all mutable story state must
 * live on the instance (or in closures created during initializeWorld),
 * never at module level. `initializeWorld` runs at most once per instance.
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
    /**
     * Register or override channels on the platform's channel registry
     * (ADR-163 §6, §7, §14). Invoked by `engine.start()` before the
     * `ChannelService` is constructed.
     *
     * Stories use this hook to:
     *  - Add story-specific channels (e.g., a `debug-stats` JSON channel
     *    for renderer overlays).
     *  - Override a standard channel by re-registering an `IOChannel`
     *    with the same id (last-write-wins per ADR-163 §6).
     *  - Register dynamic image / ambient channels via stdlib's
     *    `createImageChannel` / `createAmbientChannel` builders.
     *
     * The registry passed in is the same instance for the lifetime of
     * the engine. Re-registrations persist across the session.
     */
    registerChannels?(registry: IChannelRegistry): void;
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
import { ISystemEvent, IGenericEventSource, Result, SeededRandom } from '@sharpee/core';
import { IParser, IValidatedCommand, IParsedCommand, IValidationError } from '@sharpee/world-model';
import { ISound } from '@sharpee/if-domain';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { ActionRegistry } from '@sharpee/stdlib';
import { GameContext, TurnResult, EngineConfig } from './types.js';
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
    /**
     * Engine-owned dedicated action RNG stream (ADR-231 D6), threaded into
     * every ActionContext this executor creates. Optional so bare test
     * harnesses still work; the engine always provides it.
     */
    private actionRandom?;
    constructor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>, actionRandom?: SeededRandom);
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
    execute(input: string, world: WorldModel, context: GameContext, config?: EngineConfig, soundBuffer?: ISound[]): Promise<TurnResult>;
}
export declare function createCommandExecutor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>, actionRandom?: SeededRandom): CommandExecutor;
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
import { IFEntity, IWorldModel, CapabilityBehavior, CapabilitySharedData, ITrait, CapabilityResolution } from '@sharpee/world-model';
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
 * @param world - The world whose binding map resolves behaviors (ADR-207)
 * @param actionId - The action being executed
 * @param target - The target entity (directObject) - for backward compatibility
 * @returns Check result with trait and behavior if dispatch should be used
 */
export declare function checkCapabilityDispatch(world: IWorldModel, actionId: string, target: IFEntity | undefined): CapabilityDispatchCheck;
/**
 * Check if capability dispatch should be used for this action across multiple entities.
 *
 * Collects all capability claims from the provided entities, sorts by priority,
 * and returns the appropriate dispatch information based on resolution config.
 *
 * @param world - The world whose binding map resolves behaviors (ADR-207)
 * @param actionId - The action being executed
 * @param entities - All entities involved in the action (directObject, indirectObject, etc.)
 * @returns Check result with claims and resolution mode
 */
export declare function checkCapabilityDispatchMulti(world: IWorldModel, actionId: string, entities: (IFEntity | undefined)[]): CapabilityDispatchCheck;
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

### snippet-validation

```typescript
/**
 * Load-time room-snippet validation (ADR-209 AC-5; ADR-211 AC-3 bare-fragment
 * gate).
 *
 * After a story's `initializeWorld` returns, every snippet-bearing room's
 * `description` and `initialDescription` are scanned with the shared
 * marker-extraction helper; a `{snippet:name}` marker with no entry in the
 * room's map fails story load synchronously, naming room and marker — the
 * same posture as `PhraseParseError`. Rooms without a snippet map are never
 * scanned (the opt-in rule, AC-7). Additionally (ADR-211), every LITERAL
 * snippet text must be a bare fragment: a non-empty text leading with
 * punctuation or whitespace fails load with the fix-it — the separator is
 * platform-owned. `{ messageId }` texts resolve at render and stay
 * render-graceful there (ADR-211 AC-10), never checked here.
 *
 * Public interface: `validateRoomSnippets`, `SnippetValidationError`.
 *
 * Owner context: `@sharpee/engine` — story-load orchestration
 * (`GameEngine.setStory`). Render-time degradation for maps mutated after
 * load lives in the room-description handler path, not here.
 */
import type { WorldModel } from '@sharpee/world-model';
/**
 * Story-load failure for room snippets: unbound `{snippet:name}` markers
 * (ADR-209 AC-5) and non-bare literal fragments (ADR-211 AC-3).
 */
export declare class SnippetValidationError extends Error {
    /** `(room, marker)` pairs with no snippet entry, in discovery order. */
    readonly unbound: ReadonlyArray<{
        room: string;
        marker: string;
    }>;
    /** `(room, marker, text)` triples whose literal text is not bare, in discovery order. */
    readonly notBare: ReadonlyArray<{
        room: string;
        marker: string;
        text: string;
    }>;
    constructor(unbound: Array<{
        room: string;
        marker: string;
    }>, notBare?: Array<{
        room: string;
        marker: string;
        text: string;
    }>);
}
/**
 * Validate every snippet-bearing room's descriptions against its snippet map.
 *
 * @param world the initialized world model (after `initializeWorld`)
 * @throws SnippetValidationError naming every unbound `(room, marker)` pair
 */
export declare function validateRoomSnippets(world: WorldModel): void;
/**
 * Lint for snippet entries whose marker appears in NEITHER description text
 * (ADR-209 AC-6, resolution Q4): usually mid-edit author drift. A warning,
 * never an error — an unused entry renders nothing, unlike an unbound marker
 * which puts broken text on screen. The devkit build prints these.
 *
 * @param world the initialized world model
 * @returns `(room, entry)` pairs with no matching marker, in discovery order
 */
export declare function lintUnusedSnippetEntries(world: WorldModel): Array<{
    room: string;
    entry: string;
}>;
```

### combatant-health-validation

```typescript
/**
 * Load-time combatant/health validation (ADR-226 / ADR-223 child A, AC-7).
 *
 * After a story's `initializeWorld` returns, every entity carrying a
 * `CombatantTrait` is checked for the `HealthTrait` it requires — health/life-state
 * is the single source combat operates on (ADR-226 §2), so a combatant with no
 * health has no target for damage. A missing health trait fails story load
 * synchronously, naming every offending entity — the same fail-fast posture as
 * `validateRoomSnippets`. This is a story-authoring mistake, not a
 * runtime-recoverable state.
 *
 * Public interface: `validateCombatantHealth`, `CombatantHealthValidationError`.
 *
 * Owner context: `@sharpee/engine` — story-load orchestration (`GameEngine.setStory`).
 */
import type { WorldModel } from '@sharpee/world-model';
/**
 * Story-load failure: entities with `CombatantTrait` but no required `HealthTrait`.
 */
export declare class CombatantHealthValidationError extends Error {
    /** `(id, name)` of every combatant missing a `HealthTrait`, in discovery order. */
    readonly missing: ReadonlyArray<{
        id: string;
        name: string;
    }>;
    constructor(missing: Array<{
        id: string;
        name: string;
    }>);
}
/**
 * Validate that every combatant carries the health trait combat requires.
 *
 * @param world the initialized world model (after `initializeWorld`)
 * @throws CombatantHealthValidationError naming every combatant with no `HealthTrait`
 */
export declare function validateCombatantHealth(world: WorldModel): void;
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
import { LanguageProvider, ClientCapabilities, CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { IProsePipeline, type SlotContributor, type SlotEntry } from './prose-pipeline/index.js';
import { ITextBlock } from '@sharpee/text-blocks';
import { ISemanticEvent, ISaveRestoreHooks, ISemanticEventSource, SeededRandom } from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { GameContext, TurnResult, EngineConfig, InputModeHandler, EngineIntrospection } from './types.js';
import { Story } from './story.js';
import { NarrativeSettings } from './narrative/index.js';
import { ParsedCommandTransformer, BeforeActionHookListener } from './command-executor.js';
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
    /**
     * CMGT manifest emission (ADR-163 §11). Fires once per session
     * during `start()` after `Story.registerChannels?` has run and the
     * `ChannelService` is constructed. Carries the capability-filtered
     * channel definitions for this client.
     */
    'channel:manifest': (cmgt: CmgtPacket) => void;
    /**
     * Per-turn channel packet emission (ADR-163 §1, §5). Fires after
     * `text-service.processTurn` produces the turn's blocks; carries
     * payload entries for every standard, story, and media channel that
     * had something to emit this turn.
     */
    'channel:packet': (packet: TurnPacket, turn: number) => void;
}
type GameEngineEventName = keyof GameEngineEvents;
type GameEngineEventListener<K extends GameEngineEventName> = GameEngineEvents[K];
/**
 * Conservative client-capability profile used when `start()` is called
 * without an explicit `capabilities` option. Mirrors a CLI / text-only
 * surface — every media flag is `false`, so capability-gated channels
 * (`image:*`, `sound`, `music`, `animation`, etc.) are filtered out of
 * the manifest. Single-user CLI bundles and existing test harnesses
 * use this profile by default; graphical surfaces pass their own
 * capabilities through.
 */
export declare const DEFAULT_TEXT_CAPABILITIES: ClientCapabilities;
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
    /**
     * Per-turn sound buffer (ADR-172 Phase 6). Cleared at the start of every
     * `executeTurn()`; populated as actions call `context.emitSound`;
     * dispatched once after the plugin tick by `soundDispatcher.dispatch`.
     * Engine-internal — never serialized into save/restore snapshots
     * because sounds do not survive turn boundaries.
     */
    private soundBuffer;
    /**
     * Per-turn sound dispatcher (ADR-172 Phase 6). Stateless — owns no
     * per-turn data; the buffer is passed in. Held as a field to leave
     * room for future extension seams (e.g., custom propagate injection
     * via `setSoundDispatcher` in tests).
     */
    private soundDispatcher;
    private random;
    /**
     * Dedicated action RNG stream (ADR-231 D6), exposed to actions as
     * `ActionContext.random`. A separate instance from `random` (the
     * turn-plugin stream) so plugin draws can never shift action rolls;
     * its seed rides the save blob (`IEngineState.actionRngSeed`) so
     * post-restore action outcomes replay deterministically.
     */
    private actionRandom;
    private narrativeSettings;
    private inputModeHandlers;
    private vocabularyManager;
    private saveRestoreService;
    private turnEventProcessor;
    private platformOpHandler?;
    private hasEmittedInitialized;
    /**
     * Channel-I/O service (ADR-163 §13, §14). Constructed in `start()`
     * once `Story.registerChannels?` has populated the registry and the
     * client capabilities are known. Optional — engines started without
     * a `capabilities` argument default to a text-only profile.
     */
    private channelService?;
    /**
     * Negotiated client capabilities for this session. Populated by
     * `start({ capabilities })`; defaults to text-only when omitted.
     */
    private clientCapabilities?;
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
     * Start the game engine.
     *
     * @param options.capabilities — client capabilities for the channel-I/O
     *   subsystem (ADR-163 §2). When provided, `start()` invokes
     *   `Story.registerChannels?` to let the story extend or override
     *   channels, constructs a `ChannelService`, and emits
     *   `channel:manifest` plus a `channel:packet` per turn. When
     *   omitted, the engine uses `DEFAULT_TEXT_CAPABILITIES` so
     *   single-bundle and legacy callers receive packets without an
     *   explicit declaration.
     */
    start(options?: {
        capabilities?: ClientCapabilities;
    }): void;
    /**
     * Refresh the `storyInfo` capability from the current
     * `StoryInfoTrait`. Called once during `start()` (before the
     * `ChannelService` is constructed) so `infoChannel` / `ifidChannel`
     * project the trait's late-stage values (`engineVersion`,
     * `clientVersion`, `buildDate`) that consumers may have patched
     * after `setStory()`.
     *
     * No-op when no `StoryInfoTrait` is found (legacy stories that
     * don't use the trait still get the `StoryConfig`-only values from
     * the initial `setStory()` registration).
     */
    private refreshStoryInfoCapability;
    /**
     * Build and emit a `channel:packet` for the turn just processed.
     * Co-fires with `text:output` at every block-emission site so
     * channel consumers and legacy text-service consumers see the same
     * turn boundary. No-op when the engine has no channel service yet
     * (`start()` has not run).
     */
    private emitChannelPacket;
    /**
     * Resume a stopped engine without touching world state.
     *
     * The post-mortem revival seam: after `stop('defeat')`, a harness (or a
     * story resurrection policy) that has restored the world to a live-player
     * snapshot — e.g. the transcript-tester's RETRY block via
     * `world.loadJSON()` — needs turn execution back without any world
     * teardown (a full reboot would clear the world it just restored).
     * Flips `running` back on; emits nothing, rebuilds nothing.
     *
     * No-op when already running. Throws if the engine was never started
     * (no command executor) — resuming presumes a completed `start()`.
     */
    resume(): void;
    /**
     * Stop the game engine
     */
    stop(reason?: 'quit' | 'victory' | 'defeat' | 'abort' | 'restart', details?: any): void;
    /**
     * Build the restart acknowledgment event (ADR-248).
     *
     * On confirmed restart the engine does NOT rebuild in place — it renders
     * this acknowledgment ("The story restarts.") in the final packet, then
     * stops with reason 'restart'; the client owns the reboot via its own
     * boot path. No pre-emptive restart_completed(true) is emitted: the new
     * boot's opening banner is the success signal.
     */
    private createRestartAckEvent;
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
     * The negotiated client capabilities for this session (ADR-216): the
     * `client has <capability>` predicate reads these live, and channel
     * gating uses the same flags at manifest time. Text-only before
     * `start({ capabilities })` runs or when none were negotiated.
     */
    getClientCapabilities(): ClientCapabilities;
    /**
     * Get the dedicated action RNG stream (ADR-231 D6). Part of the
     * ISaveRestoreStateProvider contract — the save service persists this
     * stream's seed and the restore path re-seeds it.
     */
    getActionRandom(): SeededRandom;
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
    getTextService(): IProsePipeline | undefined;
    /**
     * Set a custom text service
     */
    setTextService(service: IProsePipeline): void;
    /**
     * Register a realize-time slot contributor (ADR-195 §3).
     *
     * Stories call this from `onEngineReady` to stage slot contributions (room
     * occupants, object detail clauses) into each turn's slot store before its
     * messages realize. The contributor runs once per turn at the top of the prose
     * pipeline's `processTurn`. No-op if the text service is not yet constructed.
     *
     * @param contributor the slot contributor to register.
     */
    registerSlotContributor(contributor: SlotContributor): void;
    /**
     * Register a declarative slot entry (ADR-212 §1).
     *
     * Stories (and the Chord loader) call this from `onEngineReady` instead of
     * hand-writing a presence closure: the entry's gate is evaluated once per
     * turn in the staging pass, before story-registered contributors, and its
     * content contributes to `slotKey` while the gate holds. Keyed
     * `(slotKey, owner)`, last-wins; nothing is serialized — re-register every
     * story load. No-op if the text service is not yet constructed.
     *
     * @param entry the slot entry to register (or replace).
     */
    registerSlotEntry(entry: SlotEntry): void;
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
     * The `cause` of a canonical player-death event (ADR-224) emitted during the
     * given turn, or `undefined` if the player did not die this turn. Scans the
     * turn's accumulated events, so it sees deaths from the action, interceptors,
     * and scheduler daemons alike. When several fire in one turn (rare), the first
     * is authoritative — `killPlayer` is idempotent, so later calls emit nothing.
     * @param turn the turn number whose events to scan
     */
    private playerDeathCauseThisTurn;
    /**
     * Whether the player is currently dead by their derived `HealthTrait` state
     * (ADR-226/ADR-224). A player with no `HealthTrait` is alive by default (the
     * opt-in rule) — `killPlayer` lazily attaches one, so a real death always has a
     * trait to read. This is the engine's "final word" after story policy has run.
     */
    private isPlayerDead;
    /**
     * Add event listener
     */
    on<K extends GameEngineEventName>(event: K, listener: GameEngineEventListener<K>): this;
    /**
     * Remove event listener
     */
    off<K extends GameEngineEventName>(event: K, listener: GameEngineEventListener<K>): this;
}
/**
 * Split a raw input line into chained statements (ADR pending — classic IF
 * command chaining). Separators are `.`, `;`, and the standalone word `then`.
 * Commas are NOT separators — they belong to multi-object phrases
 * ("take lamp, sword"). Empty statements (doubled or trailing separators)
 * are dropped.
 */
export declare function splitChainedInput(input: string): string[];
export {};
```

### scene-evaluation-plugin

```typescript
/**
 * Scene evaluation turn plugin (ADR-149, ADR-186).
 *
 * Evaluates scene begin/end conditions each turn. Runs after NPC turns
 * and state machines, before daemons/fuses (priority 60).
 *
 * For each registered scene:
 * - If state='waiting' and begin() returns true → activate, emit scene_began,
 *   then invoke the scene's onBegin reaction (ADR-186)
 * - If state='active' and end() returns true → end (or reset if recurring),
 *   emit scene_ended, then invoke the scene's onEnd reaction (ADR-186)
 * - If state='active' → increment activeTurns
 *
 * scene_began / scene_ended are emitted as observable facts (perception,
 * tooling, transcripts). Author-visible reactions come from the typed
 * onBegin/onEnd callbacks, translated here into game.message events — the
 * event the prose pipeline renders — so reactions are visible by construction
 * (ADR-186).
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
import { ISaveData, ISerializedTurn, ISemanticEventSource, SeededRandom } from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { TurnResult, GameContext } from './types.js';
import { Story } from './story.js';
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
    /**
     * The engine's dedicated action RNG stream (ADR-231 D6,
     * `ActionContext.random`). Its current seed is captured into
     * `IEngineState.actionRngSeed` on save and re-applied on restore.
     */
    getActionRandom(): SeededRandom;
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
import { EngineConfig } from './types.js';
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
import { SaveRestoreService, ISaveRestoreStateProvider } from './save-restore-service.js';
import { VocabularyManager } from './vocabulary-manager.js';
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

### sound/propagation

```typescript
/**
 * Spatial sound propagation function (ADR-172 Phase 3).
 *
 * Pure logic: given a `Sound` emission, a listener entity-id, and the
 * world-model, returns the `AudibilityEvent` the listener perceives —
 * or `null` if the sound is silent at the listener's location.
 *
 * The function is structured around three pieces:
 *
 *  1. **Edge-graph construction** (`getAcousticEdges`) — for any room,
 *     enumerate the rooms it's acoustically connected to, with each
 *     edge's cost. Today's edge sources are exits-with-doors and walls
 *     (per ADR-173). Future acoustic conduits ride on the same shape
 *     without changes here.
 *
 *  2. **Path search** (`findShortestAcousticPath`) — Dijkstra from
 *     source room to listener's room. Path cost = sum of edge costs +
 *     1 unit per intermediate room. Wall edges traversed are recorded
 *     so the resulting `AudibilityEvent` can name a wall when the path
 *     crosses exactly one.
 *
 *  3. **Clarity → tier mapping** (`clarityToTier`) — the ADR-172
 *     audibility-tier table.
 *
 * The propagation function does *not* enumerate listeners — that is
 * Phase 5/6's dispatcher. This file is `propagate(sound, listenerId,
 * world, timestamp) → event | null`, intended to be called per
 * listener.
 *
 * Owner context: `@sharpee/engine` — runtime / sound subsystem.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-173 — Wall Adjacency Primitive (substrate)
 */
import type { EntityId } from '@sharpee/core';
import { type AudibilityTier, type IAudibilityEvent, type ISound } from '@sharpee/if-domain';
import { WorldModel } from '@sharpee/world-model';
/**
 * Propagate a sound emission to a single listener.
 *
 * Returns an `AudibilityEvent` for the listener if the sound reaches
 * them at any tier above `silent`; returns `null` if the sound is
 * silent at the listener's location (no reachable path, cost too high
 * for the volume budget, or the listener has no resolvable room).
 *
 * Same-room emissions short-circuit to `full` audibility regardless of
 * intervening boundaries (degenerate case from ADR-172 §Propagation
 * function step 5).
 *
 * @param sound        The emission shape.
 * @param listenerId   The entity id of the listener.
 * @param world        The world-model carrying rooms, walls, doors,
 *                     and obstructors.
 * @param timestamp    Engine-provided turn-sequence integer for event
 *                     ordering. Phase 6's dispatcher threads this from
 *                     the turn manager.
 */
export declare function propagate(sound: ISound, listenerId: EntityId, world: WorldModel, timestamp: number): IAudibilityEvent | null;
/**
 * Map a clarity value (volume budget − accumulated path cost) to the
 * ADR-172 audibility tier table.
 *
 * Exposed for testability and so that future composition layers can
 * reuse the mapping (e.g., a conversation-choreography layer that
 * wants to show a "what would the audibility be at this volume from
 * here?" debug overlay).
 */
export declare function clarityToTier(clarity: number): AudibilityTier;
```

### sound/dispatcher

```typescript
/**
 * Per-turn audibility dispatcher (ADR-172 Phase 6).
 *
 * Closes the loop between `emitSound` (authoring API; Step 6.1) and the
 * `audibility` channel (Phase 5). For each `ISound` buffered during a
 * turn, the dispatcher walks every entity carrying `ListenerTrait`,
 * calls `propagate(sound, listenerId, world, timestamp)`, and emits one
 * `sound.audibility.heard` `ISemanticEvent` per (sound × listener) pair
 * that produced a non-null `IAudibilityEvent`.
 *
 * The dispatcher is pure: same buffer + same world state + same
 * timestamp → same event array. Listeners are processed in entity-id
 * sort order for deterministic event ordering across turns and runs.
 *
 * Owner context: `@sharpee/engine` — runtime / sound subsystem.
 *
 * Public interface:
 *   - `class SoundDispatcher` — the dispatcher itself.
 *   - `SoundDispatcher.dispatch(buffer, world, timestamp)` — produces
 *     the `sound.audibility.heard` events for the turn.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-163 — Channel-Service Platform (audibility channel)
 */
import { type ISemanticEvent } from '@sharpee/core';
import type { IAudibilityEvent, ISound } from '@sharpee/if-domain';
import { type WorldModel } from '@sharpee/world-model';
/**
 * Semantic-event type fired by the dispatcher when a listener perceives
 * a propagated sound. Mirrors `SOUND_EVENT_TYPES.AUDIBILITY_HEARD` in
 * `@sharpee/stdlib/channels/sound-events`. The constant is duplicated
 * here as a string literal so the engine package does not depend on
 * stdlib at compile time (engine → stdlib is the existing dependency
 * direction; the inverse would be a cycle). The string value is the
 * contract — both sides must agree.
 */
export declare const AUDIBILITY_HEARD_EVENT_TYPE = "sound.audibility.heard";
/**
 * Per-turn audibility dispatcher.
 *
 * The class shape (rather than a free function) leaves room for a
 * future propagate-injection point in tests and for caching listener
 * lookups across multi-action turns. For Phase 6 the dispatcher is a
 * thin wrapper around `propagate()`; the class structure is the
 * extension seam for L2's "NPC voice profile" layer.
 */
export declare class SoundDispatcher {
    /**
     * The propagation function the dispatcher uses. Defaulted to the
     * production `propagate` from `./propagation`; tests may inject a
     * fake to isolate dispatcher behavior from edge-graph + Dijkstra
     * complexity.
     */
    private readonly propagate;
    constructor(propagateFn?: (sound: ISound, listenerId: string, world: WorldModel, timestamp: number) => IAudibilityEvent | null);
    /**
     * Dispatch every buffered sound to every listener.
     *
     * @param buffer    The per-turn sound buffer; iterated in insertion
     *                  order. May be empty (quiet turn).
     * @param world     The world model the propagation function reads
     *                  from. Must be the same instance the actions
     *                  mutated during the turn.
     * @param timestamp The turn-sequence integer the engine assigns to
     *                  this turn. Used as the `IAudibilityEvent.timestamp`
     *                  for ordering across multi-emission turns.
     * @returns         Array of `sound.audibility.heard` events, one per
     *                  (sound × listener) where `propagate()` returned
     *                  non-null. Order: outer iteration over the buffer in
     *                  emission order, inner iteration over listeners
     *                  sorted by entity id ascending.
     */
    dispatch(buffer: readonly ISound[], world: WorldModel, timestamp: number): ISemanticEvent[];
}
```

### prose-pipeline/pipeline

```typescript
/**
 * Prose pipeline — orchestrates the per-turn event → block translation.
 *
 * Pipeline stages (from `processTurn`):
 *  1. Filter — drop `system.*` and `platform.*` events.
 *  2. Sort   — apply ADR-094 chain-metadata ordering.
 *  3. Route  — try the messageId path first (ADR-097), then dispatch
 *              by event type to a handler family.
 *  4. Assemble — handlers themselves call `createBlock`, so by the
 *                time blocks return here they already carry parsed
 *                bracket decorations and final `className`s.
 *
 * Public interface: `class ProsePipeline implements IProsePipeline`.
 * Engine constructs one instance during `setStory()` and calls
 * `processTurn` per turn (same three call sites as the retiring
 * `TextService`).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Internal interfaces
 * @see ADR-094 Event Chaining (sort stage)
 * @see ADR-097 Domain Events with messageId (domain-message handler)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import { type WorldModelLike } from './render-context.js';
import type { IProsePipeline, SlotContributor, SlotEntry } from './types.js';
/**
 * Engine-internal prose pipeline.
 *
 * Stateless transformer: events in, blocks out. Constructed once per
 * `setStory()` call with the active language provider; called per
 * turn by `GameEngine.executeTurn` and the meta-command path (the
 * same sites the retired `TextService.processTurn` had).
 */
export declare class ProsePipeline implements IProsePipeline {
    private readonly languageProvider;
    private readonly world?;
    /** Realize-time slot contributors, run in registration order each turn (ADR-195 §3). */
    private readonly slotContributors;
    /**
     * Declarative slot entries (ADR-212 §1), keyed `(slotKey, owner)` — the
     * `\0`-joined memo-key shape. Last-wins on re-registration (AC-7); never
     * serialized, dropped with the pipeline on reload.
     */
    private readonly slotEntries;
    /**
     * @param languageProvider the active language provider (template → text)
     * @param world the read-only world model; when supplied, each turn builds a
     *   phrase-pipeline render-context factory (ADR-192, W2). Optional so legacy
     *   and test construction (string path only) keeps working without a world.
     */
    constructor(languageProvider: LanguageProvider, world?: WorldModelLike);
    /**
     * Register a realize-time slot contributor (ADR-195 §3). Contributors run once
     * per turn at the top of `processTurn`, in registration order; that order feeds
     * the `(order, insertion)` tie-break of the slot store.
     *
     * @param contributor the slot contributor to run each turn.
     */
    registerSlotContributor(contributor: SlotContributor): void;
    /**
     * Register a declarative slot entry (ADR-212 §1). Keyed `(slotKey, owner)`,
     * last-wins: `Map.set` replaces any prior entry under the same key, so a
     * loader re-registering on story load never double-contributes (AC-7).
     *
     * `Choice` content carries its own counter keys; the caller contract
     * (ADR-212 §4) is `entityId === owner` and `messageKey === counterKey ??
     * slotKey`. A mismatch is a silent double-counter bug, so it is warned on
     * here — never rewritten, never thrown (render-graceful posture).
     *
     * @param entry the slot entry to register (or replace).
     */
    registerSlotEntry(entry: SlotEntry): void;
    /**
     * Evaluate every registered slot entry against this turn's staging context
     * (ADR-212 §3) and contribute the content of each whose gate holds. Runs
     * BEFORE story-registered contributors — platform entries first, then
     * closures in registration order (deterministic `(order, insertion)` seq).
     *
     * Gate semantics: `owner-present` holds iff the owner shares the player's
     * containing room at staging time; an owner missing from the world resolves
     * to no room and simply never holds (AC-3 — a removed owner is inert, not an
     * error). A `predicate` gate is story/runtime code: a throw is warned and
     * treated as not-holding (render-graceful), never allowed to abort the turn.
     *
     * @param staging this turn's shared staging render context.
     */
    private stageSlotEntries;
    processTurn(events: ISemanticEvent[]): ITextBlock[];
    /**
     * Route an event to its handler family.
     *
     * Order: try the ADR-097 messageId path first (catches every stdlib
     * domain event); then fall through to type-keyed handlers; finally
     * the catch-all generic handler.
     */
    private routeToHandler;
}
/**
 * Construct a `ProsePipeline` for the given language provider.
 *
 * Mirrors the `createTextService` factory the retired text-service
 * package exposed; callers can swap one for the other without
 * changing call shapes.
 */
export declare function createProsePipeline(languageProvider: LanguageProvider, world?: WorldModelLike): IProsePipeline;
```

### prose-pipeline/types

```typescript
/**
 * Prose pipeline service interface — engine-internal home for the
 * `IProsePipeline` contract.
 *
 * Per ADR-174, the responsibility for translating events into blocks
 * moved into `@sharpee/engine`. The interface was introduced under the
 * transitional `ITextService` name during that migration; ADR-195
 * completes the anticipated cleanup and renames it to `IProsePipeline`
 * now that the legacy alias is engine-private (no external importer).
 * The `getTextService` / `setTextService` accessors on `GameEngine`
 * keep their names — only the interface type is renamed.
 *
 * Public interface: `IProsePipeline`. Implemented by `ProsePipeline`
 * (and by `MockProsePipeline` in tests).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Internal interfaces
 * @see ADR-195 (interface rename + slot-contributor seam)
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { Phrase, RenderContext } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';
/**
 * A realize-time slot contributor (ADR-195 §3).
 *
 * Holds a turn `RenderContext` and stages slot contributions into the turn's
 * slot store via `ctx.contribute(key, phrase)` — typically reading the live
 * world (the player's room → occupants for `'here'`; in-scope describable
 * objects → state clauses for `'detail'`). It runs at render time, before the
 * host messages realize, so it needs no turn-time (ADR-163) channel.
 */
export type SlotContributor = (ctx: RenderContext) => void;
/**
 * Gate on a declarative slot entry (ADR-212 §2).
 *
 * - `owner-present` (the default): the entry contributes iff the owner shares
 *   the player's containing room at staging time — the same transitive check
 *   the `mentions` gate uses.
 * - `predicate`: the registered-seam escape hatch (the ADR-211 Q4 posture) —
 *   a TS function supplied by whatever runtime owns the condition, called
 *   against the live world each staging pass. Never serialized; like every
 *   entry, re-registered on story load.
 */
export type SlotEntryGate = {
    kind: 'owner-present';
} | {
    kind: 'predicate';
    holds: (world: WorldModel) => boolean;
};
/**
 * A declarative slot entry (ADR-212 §1): data in, prose out.
 *
 * One platform-owned staging step evaluates every registered entry each turn,
 * before story-registered `SlotContributor` closures run; an entry whose gate
 * holds contributes `content` to `slotKey` with `order`. Registration is keyed
 * `(slotKey, owner)`, idempotent-last-wins (AC-7); entries are never
 * unregistered mid-session and nothing here is serialized — callers
 * re-register every story load.
 */
export interface SlotEntry {
    /** The slot the entry feeds (`'here'` for the present channel). Any key is accepted (ADR-212 Q4). */
    slotKey: string;
    /** Owner entity id — the default gate's subject and the `Choice` counter keyspace. */
    owner: string;
    /** Bare contributed content (`Literal` | `Choice`) — the slot owns all joining. */
    content: Phrase;
    /** `SlotContributionOptions.order` for the slot's `(order asc, insertion asc)` sort; default 0. */
    order?: number;
    /** Contribution gate; default `{ kind: 'owner-present' }`. */
    gate?: SlotEntryGate;
    /**
     * `Choice` counter key; defaults to `slotKey`. Caller contract (ADR-212 §4):
     * `Choice` content must carry `entityId === owner` and
     * `messageKey === counterKey ?? slotKey` — the platform warns on mismatch
     * but never rewrites.
     */
    counterKey?: string;
}
/**
 * Per-turn prose translator.
 *
 * Stateless transformer: takes the events emitted during a turn,
 * returns the structured `ITextBlock[]` the channel layer hands off
 * to renderers. Engine constructs an implementation once during
 * `setStory()` and calls `processTurn` per turn (and per
 * meta-command / restart).
 */
export interface IProsePipeline {
    /**
     * Process turn events and produce TextBlocks.
     *
     * Called by Engine after each turn completes — and again on the
     * meta-command path (restart, restore) where the same per-turn
     * shape applies.
     *
     * @param events All events from this turn, including chained ones.
     * @returns Blocks in render order.
     */
    processTurn(events: ISemanticEvent[]): ITextBlock[];
    /**
     * Register a realize-time slot contributor (ADR-195 §3).
     *
     * The contributor runs once per turn — in registration order — at the top of
     * `processTurn`, before the event→render loop, against a turn `RenderContext`
     * whose `contribute` writes the shared per-turn slot store. Stories register
     * via the engine's `onEngineReady` hook. A no-op on world-less pipelines (no
     * per-turn render-context factory is built, so there is nothing to stage into).
     *
     * @param contributor the slot contributor to run each turn.
     */
    registerSlotContributor(contributor: SlotContributor): void;
    /**
     * Register a declarative slot entry (ADR-212 §1).
     *
     * Keyed `(slotKey, owner)`, idempotent-last-wins: re-registering the same key
     * replaces the prior entry — one contribution, never two (AC-7). Entries are
     * evaluated once per turn in the staging pass, BEFORE story-registered slot
     * contributors, and contribute only while their gate holds. Nothing is
     * serialized; callers re-register every story load.
     *
     * @param entry the slot entry to register (or replace).
     */
    registerSlotEntry(entry: SlotEntry): void;
}
```

### prose-pipeline/render-context

```typescript
/**
 * Per-turn RenderContext runtime for the phrase pipeline (ADR-192 §6, W2).
 *
 * The Assembler realizes a phrase tree against a `RenderContext`: a read-only
 * world, the bound params, locale settings, and the declared seams
 * (`reference` / `textState` / `contribute` + `slotContributions`). This module
 * supplies the engine's runtime for that contract — a thin adapter over the world
 * model, the live turn-scoped slot store (ADR-195), and the live persistent
 * `textState` store (ADR-196). The engine owns this per turn. The ONE sanctioned
 * mutation is the `textState` capability write (ADR-196 §4 — the declared exception
 * ADR-192 §7 reserved for deterministic `Choice` variation); entity and spatial
 * state are never touched here.
 *
 * Public interface: `createRenderWorld`, `createRenderContextFactory`,
 * `WorldTextStateStore`, `WorldModelLike`. The factory binds the per-turn
 * invariants (world, settings, seams) once and yields a per-message
 * `RenderContext` by adding that message's params.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-192 §6 (report pipeline / render context)
 * @see ADR-195 (contribute seam) / ADR-196 (textState seam) / ADR-197 (reference seam)
 */
import type { EntityId, IEntity } from '@sharpee/core';
import type { LocaleSettings, NarrativeAgreement, RenderContext, RenderWorld, TextStateStore } from '@sharpee/if-domain';
/**
 * The minimal world surface the render world adapter needs. The engine's
 * `WorldModel` satisfies this structurally; declaring only the methods the
 * pipeline reads keeps it honest. The pipeline never mutates entity/spatial
 * state — the one sanctioned write is the `textState` capability (ADR-196 §4),
 * exposed through the OPTIONAL capability accessors below. They are optional
 * (the ADR-195 optional-seam precedent) so test mocks that wire only the read
 * methods keep compiling; a world without them degrades to an empty text-state
 * store (no persistence, `Choice` starts at counter 0 — AC-9).
 */
export interface WorldModelLike {
    getEntity(id: EntityId): IEntity | undefined;
    getContents(containerId: EntityId): IEntity[];
    getContainingRoom(entityId: EntityId): IEntity | undefined;
    /** The player entity, for narrative verb-person agreement (ADR-199 §4 B). */
    getPlayer(): IEntity | undefined;
    /** Read a capability's data map (ADR-196 text-state read). */
    getCapability?(name: string): Record<string, unknown> | undefined;
    /** Merge into a capability's data map (ADR-196 text-state write — the one sanctioned mutation). */
    updateCapability?(name: string, updates: Record<string, unknown>): void;
    /** Whether a capability is registered (guards the defensive self-register). */
    hasCapability?(name: string): boolean;
    /** Register a capability if absent (defensive — the engine normally registers `textState` at setup). */
    registerCapability?(name: string, registration?: {
        initialData?: Record<string, unknown>;
    }): void;
    /** Read a registered derived-state evaluator (ADR-240 seam; ADR-250 phrasebook read point). */
    evaluate?(key: string): unknown;
}
/**
 * Wrap a world model as the read-only `RenderWorld` the Assembler consumes.
 *
 * Supplies the entity→`NounPhrase` bridge (`nounPhraseFor`, ADR-194) by delegating
 * to stdlib's producer — the engine may depend on stdlib, lang-en-us may not, so the
 * bridge crosses here rather than in the Assembler.
 *
 * @param world the live world model (read-only access only)
 * @returns a `RenderWorld` delegating to the model's lookup methods
 */
export declare function createRenderWorld(world: WorldModelLike): RenderWorld;
/**
 * The persistent per-`(entityId, messageKey)` text-state store (ADR-196 §4).
 *
 * Backed by the `textState` world capability, which serializes with the world —
 * so a `Choice`'s cycle index / trigger count / sticky pick survives turns and
 * save/restore (S13–S14). The engine registers the capability at setup
 * (`game-engine.ts`); this store also self-registers defensively so it works in
 * tests and standalone render contexts.
 *
 * A world that does not expose the optional capability accessors degrades to the
 * empty-store behavior (no persistence) — AC-9.
 */
export declare class WorldTextStateStore implements TextStateStore {
    private readonly world;
    constructor(world: WorldModelLike);
    get(entityId: EntityId, messageKey: string): number | undefined;
    set(entityId: EntityId, messageKey: string, value: number): void;
}
/**
 * A per-message render-context builder bound to a turn's invariants.
 *
 * @param params the message's parameter/producer bindings
 * @returns a `RenderContext` carrying those params plus the bound world,
 *   settings, and per-turn seams
 */
export type RenderContextFactory = (params: Record<string, unknown>) => RenderContext;
/**
 * Build the per-turn render-context factory.
 *
 * World, locale settings, and the seams are the turn's invariants and are
 * captured once; only `params` vary per message, so the returned factory is
 * called once per rendered message. The `contribute` / `slotContributions` pair
 * shares one turn-scoped {@link TurnSlotStore} across every message context, so a
 * slot contribution staged while building one message is visible when another
 * message's `{slot:key}` realizes (ADR-195 §2).
 *
 * @param world the read-only render world (see {@link createRenderWorld})
 * @param settings the locale realization settings for this turn
 * @param narrative the player id + narrative person for verb agreement (ADR-199 §4 B)
 * @param textState the persistent text-state store backing `Choice` (ADR-196 §4);
 *   defaults to the empty store for world-less / string-path callers
 * @returns a factory that yields a `RenderContext` for a message's params
 */
export declare function createRenderContextFactory(world: RenderWorld, settings: LocaleSettings, narrative: NarrativeAgreement, textState?: TextStateStore): RenderContextFactory;
```

### prose-pipeline/decorations/parser

```typescript
/**
 * Bracket parser — markup string → structured `TextContent[]` tree.
 *
 * Public interface: `parseDecorations(template) → TextContent[]`.
 * Pure function; same input always yields same output.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Markup syntax
 * @see ADR-174 §Internal interfaces
 * @see ADR-174 acceptance criteria AC-1..AC-5, AC-10..AC-12
 */
import type { TextContent } from './types.js';
/**
 * Parse a template string into a `TextContent[]` tree.
 *
 * Bracket markup `[name:content]` becomes an `IDecoration` whose
 * `className` is the result of `resolveClassName(name)`. Plain runs
 * stay as strings. Nesting recurses. Escape sequences `\[`, `\]`,
 * `\\` produce literal characters.
 *
 * Forgiving rules (ADR-174 AC-10..AC-12):
 *  - An unclosed `[` is treated as a literal character; the tail of
 *    the string remains unparsed text.
 *  - A bracket without `:` (e.g., `[em world]`) is emitted as literal
 *    `[em world]` — no decoration created.
 *  - A bracket with empty class name (e.g., `[:world]`) yields the
 *    parsed inner content directly, with no decoration wrapper.
 *
 * @param template Raw template string, post message-id resolution.
 * @returns Flat array of strings and decorations.
 */
export declare function parseDecorations(template: string): TextContent[];
```

### prose-pipeline/decorations/resolver

```typescript
/**
 * Class-name resolver — bare bracket name → final CSS class name.
 *
 * Public interface: `resolveClassName`. Used by the parser to settle
 * the platform-vs-author distinction at parse time so the wire shape
 * carries renderer-ready strings.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Platform vs author classes
 * @see ADR-174 §Internal interfaces
 */
/**
 * Resolve a bracketed name to its final CSS class name.
 *
 * Platform names (those listed in `PLATFORM_VOCABULARY`) receive the
 * `sharpee-` prefix. Author names — anything else — pass through
 * verbatim. Empty input returns the empty string; the caller is
 * responsible for the AC-12 no-op-wrapper behavior, since the
 * resolver is a pure mapping.
 *
 * @param rawName Bare name as written between `[` and `:` in the
 *                template, e.g., `em`, `thief-taunt`.
 * @returns Final class name to place on the wire as
 *          `IDecoration.className`.
 */
export declare function resolveClassName(rawName: string): string;
```

### prose-pipeline/decorations/platform-vocabulary

```typescript
/**
 * Platform decoration vocabulary — closed enumeration of names the
 * platform recognises and prefixes with `sharpee-` when emitting class
 * names on the wire.
 *
 * Public interface: `PLATFORM_VOCABULARY` (frozen Set), consumed by
 * the resolver in this directory. No external package imports this.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Closed platform vocabulary
 */
declare const VOCABULARY_NAMES: readonly ["em", "strong", "u", "st", "code", "super", "sub", "item", "npc", "room", "direction", "command", "quote", "color-red", "color-blue", "color-green", "color-yellow", "color-magenta", "color-cyan", "color-white", "color-grey", "color-black", "bgcolor-red", "bgcolor-blue", "bgcolor-green", "bgcolor-yellow", "bgcolor-magenta", "bgcolor-cyan", "bgcolor-white", "bgcolor-grey", "bgcolor-black", "size-small", "size-large", "font-mono", "br", "p", "indent", "center", "right"];
/**
 * Names that take **no content** — written `[br]` / `[p]` (no colon). The
 * parser treats a colon-less `[name]` as a void decoration iff `name` is
 * listed here; any other colon-less bracket stays literal (ADR-174 AC-11).
 *
 * @see ADR-183 §1 — Vocabulary, §2 — Syntax
 */
export declare const VOID_MACROS: ReadonlySet<string>;
/**
 * Frozen set of every name the platform reserves under the `sharpee-`
 * namespace. Adding a new entry requires both updating this list and
 * shipping a corresponding `.sharpee-{name}` rule in the platform CSS.
 */
export declare const PLATFORM_VOCABULARY: ReadonlySet<string>;
/**
 * Type-level export of every recognised name; useful for tests that
 * iterate the closed enumeration.
 */
export type PlatformVocabularyName = (typeof VOCABULARY_NAMES)[number];
export declare const PLATFORM_VOCABULARY_NAMES: ReadonlyArray<PlatformVocabularyName>;
export {};
```

### prose-pipeline/stages/filter

```typescript
/**
 * Event filtering stage — drops events that should not produce
 * text output (system.* and platform request-phase events).
 *
 * Public interface: `filterEvents`. Used internally by the prose
 * pipeline as the first per-turn stage.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 * @see ADR-096 (preserved): the filter responsibility ports unchanged
 *   from `@sharpee/text-service`.
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Filter events that should produce text output.
 *
 * Drops:
 *  - `system.*` — internal turn-cycle bookkeeping the player never sees.
 *  - `platform.*_requested` — request-phase platform events are control
 *    flow, never narration.
 *
 * Platform OUTCOME events (`platform.save_completed`,
 * `platform.undo_failed`, ...) pass through to the handlers stage, where
 * `handlePlatformEvent` renders the lang message registered under the
 * event type (silent when none is registered — quit/restart outcomes stay
 * quiet by default).
 *
 * Pass-through for everything else (domain events, action results,
 * lifecycle events, sound, etc.) — they reach the handlers stage.
 */
export declare function filterEvents(events: ISemanticEvent[]): ISemanticEvent[];
```

### prose-pipeline/stages/sort

```typescript
/**
 * Event sorting stage — orders events within a turn for correct prose
 * sequence: lifecycle first, then per-transaction implicit-take →
 * room-description → action.* → others, finally by chain depth.
 *
 * Public interface: `sortEventsForProse`, `getChainMetadata`. Used
 * internally by the prose pipeline as the second per-turn stage,
 * after filtering.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-094 Event Chaining (preserved; the sort responsibility
 *   ports from `@sharpee/text-service`)
 * @see ADR-174 §Engine-internal prose pipeline
 */
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Event data with chain metadata (ADR-094).
 */
interface ChainMetadata {
    _transactionId?: string;
    _chainDepth?: number;
    _chainedFrom?: string;
    _chainSourceId?: string;
}
/**
 * Sort events for correct prose order within transactions.
 *
 * Stable sort — preserves cross-transaction order while applying
 * within-transaction rules.
 */
export declare function sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[];
/**
 * Extract chain metadata from event data.
 */
export declare function getChainMetadata(event: ISemanticEvent): ChainMetadata;
export {};
```

### prose-pipeline/assemble

```typescript
/**
 * Block assembly stage — wraps a resolved template string into an
 * `ITextBlock`, parsing decorations along the way.
 *
 * Public interface: `createBlock`, `extractValue`. Used internally
 * by handler families and the pipeline orchestration.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline. Lives
 * at `prose-pipeline/assemble.ts` (not under `stages/`) per ADR-174
 * §Engine-internal prose pipeline layout.
 *
 * @see ADR-174 §Markup syntax (decoration parsing)
 * @see ADR-133 (preserved): blocks have keys and structured content.
 */
import type { ITextBlock } from '@sharpee/text-blocks';
/**
 * Options for `createBlock`.
 */
export interface CreateBlockOptions {
    /**
     * Mark the block as a visual continuation of its predecessor — the
     * renderer collapses the paragraph margin so the two lines stack
     * flush. Used by handlers that split former multi-line content into
     * multiple single-line blocks. See `ITextBlock.tight` for the
     * invariant that a tight block must not appear first in a packet.
     */
    tight?: boolean;
    /**
     * Optional semantic CSS class the browser renderer applies to the
     * rendered element in addition to `main-entry`. See
     * `ITextBlock.className`.
     */
    className?: string;
}
/**
 * Create an `ITextBlock` from a key and a resolved template string.
 *
 * The template is fed through the bracket-decoration parser; templates
 * with no markers produce a single-string `content` array, matching
 * the existing no-op-decoration shape.
 *
 * Pass `{ tight: true }` to mark this block as a continuation of the
 * preceding block (renderer collapses inter-block margin).
 *
 * Callers that may receive text containing `\n` should use
 * `createBlocks` instead, which lifts newlines to block boundaries.
 */
export declare function createBlock(key: string, text: string, opts?: CreateBlockOptions): ITextBlock;
/**
 * Create one or more `ITextBlock`s from a key and a (possibly
 * multi-line) resolved template string.
 *
 * Newlines in the text are *lifted* to block boundaries — no block's
 * `content` ever carries `\n` (the precondition for removing
 * `white-space: pre-line` from the prose pane). Splitting policy:
 *
 *  - `\n\n+` (one or more blank lines) → next block is a fresh
 *    paragraph (no `tight` flag); the renderer applies the prose
 *    pane's paragraph margin.
 *  - `\n` (single newline) → next block carries `tight: true`; the
 *    renderer collapses the inter-block margin so the lines stack
 *    flush, matching the legacy `pre-line` line-break behavior.
 *
 * Edge cases: leading/trailing whitespace is trimmed; empty
 * paragraphs (between `\n\n\n` etc.) are dropped; empty input
 * returns a single empty block.
 */
export declare function createBlocks(key: string, text: string): ITextBlock[];
/**
 * Extract a string value from a direct primitive or a function wrapper.
 *
 * Returns null for falsy values, function returns, or thrown errors.
 * Used by handlers that pull data out of event payloads with mixed
 * shapes (string, number, () => string, etc.).
 */
export declare function extractValue(value: unknown): string | null;
```

### prose-pipeline/handlers/types

```typescript
/**
 * Handler types for the engine prose pipeline.
 *
 * Public interface: `HandlerContext`, `EventHandler`,
 * `ChainableEventData`, `GenericEventData`. Used by handler families
 * and the pipeline class.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 * @see ADR-094 (chain metadata semantics, preserved)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import type { RenderContextFactory, WorldModelLike } from '../render-context.js';
/**
 * Context passed to event handlers.
 */
export interface HandlerContext {
    /** Language provider for template resolution. */
    languageProvider?: LanguageProvider;
    /**
     * The world, when the pipeline was constructed with one — the phrasebook
     * read point consults `world.evaluate` for book-resolved templates
     * (ADR-250 D4) before the registry lookup.
     */
    world?: WorldModelLike;
    /**
     * Per-turn render-context factory for the phrase pipeline (ADR-192, W2).
     *
     * Present when the pipeline was constructed with a world model; a handler on
     * the phrase path builds its per-message `RenderContext` by calling this with
     * the message's params, then passes it to `languageProvider.renderMessage`.
     * Absent in legacy/world-less construction (the old string path needs no
     * render context).
     */
    makeRenderContext?: RenderContextFactory;
}
/**
 * Event handler function signature.
 *
 * Handlers receive an event and context, return zero or more TextBlocks.
 */
export type EventHandler = (event: ISemanticEvent, context: HandlerContext) => ITextBlock[];
/**
 * Common event data with chain metadata (ADR-094).
 */
export interface ChainableEventData {
    _transactionId?: string;
    _chainDepth?: number;
    _chainedFrom?: string;
    _chainSourceId?: string;
}
/**
 * Generic event data with message fields.
 */
export interface GenericEventData extends ChainableEventData {
    message?: string;
    messageId?: string;
    text?: string;
    [key: string]: unknown;
}
```

### prose-pipeline/phrase-render

```typescript
/**
 * Phrase-path rendering helper for the prose pipeline (ADR-192 §6, the cutover).
 *
 * Bridges a handler's `(messageId, params, blockKey)` to the language provider's
 * `renderMessage` phrase pipeline, building the per-message `RenderContext` from
 * the per-turn factory and re-keying the realized blocks to the handler's
 * channel. The legacy `getMessage` string path remains in the handlers only as a
 * fallback for world-less construction (some unit tests); it is removed in W7
 * once nothing constructs the pipeline without a world.
 *
 * Public interface: `phraseAvailable`, `renderViaPhrase`.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-192 §6
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { HandlerContext } from './handlers/types.js';
/**
 * Whether the phrase path is wired for this turn: a render-context factory (the
 * pipeline had a world) and a provider that implements the phrase API.
 *
 * @param context the handler context
 * @returns true when `renderViaPhrase` can be used
 */
export declare function phraseAvailable(context: HandlerContext): boolean;
/**
 * The phrasebook template key convention (ADR-250 D4, ADR-240 D6): built
 * here — the read point — and in the story-loader's evaluator registrar,
 * nowhere else. Pinned by tests on both sides.
 *
 * @param messageId the message id a book may cover
 * @returns the `world.evaluate` key for that id's book resolution
 */
export declare function phrasebookTemplateKey(messageId: string): string;
/**
 * The shape the story-loader's phrasebook evaluator returns (ADR-250 D4.3,
 * platform-adapted): the winning book's DERIVED template plus any params
 * the template needs bound — `variants` (a ready `Choice` atom keyed
 * `phrasebook.<book>` / key, so counters stay per (book, key) — D5) or
 * `text` (verbatim entries). Keeping the derivation loader-side preserves
 * the ADR-210 direction rule: the engine never learns Chord's IR shapes.
 */
export interface PhrasebookResolution {
    /** The winning book's name. */
    book: string;
    /** The covered story key (= the messageId asked about). */
    key: string;
    /** The derived template (same derivation as registered phrases). */
    template: string;
    /** Extra param bindings the template needs (variants Choice, verbatim text). */
    params?: Record<string, unknown>;
}
/**
 * Render a message through the phrase pipeline and re-key its blocks.
 *
 * Precondition: {@link phraseAvailable} is true.
 *
 * @param context the handler context (carries the render-context factory)
 * @param messageId the message id to render
 * @param params the message params (entity NounPhrases, scalars, …). The reserved
 *   key `__slots__` (a `{ [slotKey]: Phrase[] }` map) is not a placeholder binding:
 *   its phrases are staged into this message's turn slot store before realization,
 *   so an action that knows its target (e.g. examine staging detail clauses) can
 *   fill a `{slot:key}` in its own template without holding a render context at
 *   report time (ADR-195 S2). Plain phrase data — save/replay-safe.
 * @param blockKey the channel key to stamp on the realized blocks
 * @returns the realized blocks re-keyed to `blockKey`, or `null` when the message
 *   id is not registered (the caller applies its inline-text fallback)
 */
export declare function renderViaPhrase(context: HandlerContext, messageId: string, params: Record<string, unknown>, blockKey: string): ITextBlock[] | null;
/**
 * Flatten realized blocks to a single plain string (newlines between blocks).
 * Used when a rendered message must be embedded into another message as a
 * `{verbatim:…}` scalar param.
 *
 * @param blocks realized text blocks
 * @returns the concatenated plain text
 */
export declare function flattenBlocks(blocks: ITextBlock[]): string;
```

### prose-pipeline/handlers/room

```typescript
/**
 * Room description event handler.
 *
 * Handles `if.event.room.description` (canonical form) and
 * `if.event.room_description` (legacy alternate). Resolves the
 * room name and description through the language provider when a
 * message id is present (ADR-107 dual-mode), falling back to literal
 * text otherwise.
 *
 * Public interface: `handleRoomDescription`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-107 — Dual-mode literal/messageId handling
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle room description events.
 */
export declare function handleRoomDescription(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/revealed

```typescript
/**
 * Revealed event handler.
 *
 * Handles `if.event.revealed` — fired when items become visible inside
 * a container. Pulls a direct message/text payload first, then tries
 * the language provider keyed on event type, then falls back to a
 * built-in "Inside the {container} you see {items}." formatter.
 *
 * Public interface: `handleRevealed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-094 Event Chaining
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle `if.event.revealed` events.
 */
export declare function handleRevealed(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/generic

```typescript
/**
 * Generic event handlers — game.message and the catch-all generic
 * fallback for unknown event types.
 *
 * Public interface: `handleGameMessage`, `handleGenericEvent`. Used
 * by the pipeline's event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle `game.message` events.
 */
export declare function handleGameMessage(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
/**
 * Handle generic / unknown events using `event.type` as the template key.
 *
 * Story-defined events follow the simple pattern:
 *   - event.type is the template key
 *   - event.data is the template params
 */
export declare function handleGenericEvent(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/game

```typescript
/**
 * Game lifecycle event handler — `game.started`.
 *
 * Emits the opening banner via the shared `buildBannerBlocks` helper:
 * one semantically-classed block per piece (`game-title`,
 * `story-version`, `platform-version`, `sub-title`, `author-list[]`,
 * `banner-spacer`), then any story-defined `game.banner.story-tail`
 * template appended through `createBlocks`.
 *
 * Public interface: `handleGameStarted`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-097 IGameEvent Deprecation
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle the `game.started` event to produce the opening banner.
 *
 * Stories customize by:
 *  - Setting `StoryConfig.credits` for distinct author-list lines.
 *  - Setting `StoryConfig.description` for the sub-title.
 *  - Registering a `game.banner.story-tail` language template for any
 *    trailing content (instructions, taglines, etc.).
 */
export declare function handleGameStarted(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/audibility

```typescript
/**
 * Audibility event handler — ADR-172 Phase 7a, ported to engine prose
 * pipeline per ADR-174.
 *
 * Handles `sound.audibility.heard`. Converts each `IAudibilityEvent`
 * (per-listener perception of a propagated sound, produced by the
 * engine's sound dispatcher in Phase 6) into a single text block via
 * the `sound.heard.<kind>.<tier>` template family registered in the
 * active language pack (lang-en-us ships defaults; stories override
 * per kind).
 *
 * Naming discipline:
 *   - `audio`      — Web Audio playback (ADR-169 `AudioManager`).
 *   - `sound`      — the media-cue channel id (`media.sound.play`,
 *                    ADR-163).
 *   - `audibility` — ADR-172 perception of propagated sound, this
 *                    handler.
 *
 * Public interface: `handleAudibilityHeard`.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * Listener filtering: in single-user scope today the player is the
 * only entity carrying `ListenerTrait` automatically, so every
 * audibility event delivered here is for the player. The dispatcher
 * already writes the listener id into `event.entities.target`; when
 * L2's NPC-listener work lands, this handler will need to filter
 * `event.entities.target === playerId` before rendering.
 *
 * @see ADR-172 — Spatial Sound Propagation §Channel routing
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Handle a `sound.audibility.heard` event.
 *
 * Resolves `sound.heard.<kind>.<tier>` from the language provider,
 * falling back to `sound.heard.default.<tier>` when the kind-specific
 * template is not registered. Returns one `ITextBlock` per event, or
 * `[]` when the event is malformed, the tier is `silent`, or no
 * template resolves.
 */
export declare function handleAudibilityHeard(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/platform

```typescript
/**
 * Platform-event handler — renders `platform.*` lifecycle events.
 *
 * Platform events (core `createPlatformEvent`) carry their information in
 * `payload`, not `data`, so the ADR-097 domain-message path never sees them.
 * This handler renders them in the same prose-pipeline manner: the event
 * type itself is the messageId (`platform.save_completed`,
 * `platform.undo_failed`, ...) and params bind from the payload. lang-en-us
 * registers the standard texts; stories override by registering the same id.
 *
 * Events with no registered message render nothing — request-phase events
 * (`platform.save_requested`, ...) are intentionally silent by default.
 *
 * Public interface: `handlePlatformEvent`.
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Render a `platform.*` event via the message registered under its event
 * type. Returns [] when no message is registered (silent by design).
 */
export declare function handlePlatformEvent(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/domain-message

```typescript
/**
 * Domain message handler — `event.data.messageId` resolution path.
 *
 * Handles any event whose data carries a `messageId`, regardless of
 * event type (per ADR-097). All stdlib actions use this pattern;
 * story actions emitting `action.success` / `action.blocked` events
 * also flow through here.
 *
 * Params bind nested-preferred with flat fallback (`data.params ?? data`,
 * ADR-206 unified rule) — emitters may nest template params under
 * `params` or carry them flat on the event data; nested wins when both
 * exist.
 *
 * Public interface: `tryProcessDomainEventMessage`. The pipeline
 * consults this first; on null, it falls through to the type-keyed
 * handlers (room, revealed, generic, etc.).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-097 Domain Events with messageId
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
/**
 * Process domain events that carry messageId directly (ADR-097).
 *
 * @returns Text blocks if event has messageId. Returns null when the
 *   event has no messageId (caller falls through to type-keyed
 *   handlers). Falls back to inline `data.message` / `data.text`
 *   when the messageId fails to resolve.
 */
export declare function tryProcessDomainEventMessage(event: ISemanticEvent, context: HandlerContext): ITextBlock[] | null;
```

### prose-pipeline/handlers/implicit-take

```typescript
/**
 * Implicit-take handler — `if.event.implicit_take`.
 *
 * Produces the "(first taking the X)" line that prefaces an action
 * the parser auto-promoted (e.g. "READ BOOK" when the player isn't
 * holding the book yet).
 *
 * Public interface: `handleImplicitTake`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
export declare function handleImplicitTake(event: ISemanticEvent, _context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/command-failed

```typescript
/**
 * Command-failed handler — `command.failed`.
 *
 * Maps parser / entity-resolution failure reasons to user-facing
 * error prose. Recognized reason fragments:
 *   - `ENTITY_NOT_FOUND` / `modifiers_not_matched` →
 *     `core.entity_not_found` (default: "I don't see that here.")
 *   - `NO_MATCH` / `parse` →
 *     `core.command_not_understood` (default: "I don't understand that.")
 * Anything else → `core.command_failed` (same default).
 *
 * Public interface: `handleCommandFailed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
export declare function handleCommandFailed(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```

### prose-pipeline/handlers/client-query

```typescript
/**
 * Client-query handler — `client.query`.
 *
 * Today only the `disambiguation` source is rendered. The handler
 * formats a candidate list as natural English ("the X or the Y" /
 * "the X, the Y, or the Z") and resolves the
 * `core.disambiguation_prompt` template with the resulting `options`
 * string.
 *
 * Public interface: `handleClientQuery`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
export declare function handleClientQuery(event: ISemanticEvent, context: HandlerContext): ITextBlock[];
```
