# @sharpee/engine

GameEngine, Story interface, turn cycle, command executor, save/restore, vocabulary.

---

### game-engine

```typescript
/**
 * Game Engine - Main runtime for Sharpee IF games
 *
 * Manages game state, turn execution, and coordinates all subsystems
 */
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { type Parser, type IPerceptionService, type INpcService, type ActSlots, type ActResult } from '@sharpee/stdlib';
import { type LanguageProvider, type ClientCapabilities } from '@sharpee/if-domain';
import { IProsePipeline, type SlotContributor, type SlotEntry } from './prose-pipeline/index.js';
import { type ISemanticEvent, type ISaveRestoreHooks, type ISemanticEventSource } from '@sharpee/core';
import { EngineRandomService } from './session/engine-random-service.js';
import { PluginRegistry } from '@sharpee/plugins';
import { GameContext, TurnResult, EngineConfig, InputModeHandler, type GameEngineEvents } from './types.js';
import { type EngineIntrospection } from './introspection/introspect.js';
import { Story } from './install/story.js';
import type { NarrativeSettings } from './types.js';
import { ParsedCommandTransformer, BeforeActionHookListener } from './command/command-executor.js';
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
    private textService;
    private turnEvents;
    private running;
    private story?;
    private languageProvider;
    private parser;
    /** The parser as the engine calls it: every engine-facing method present (`adaptParser`). */
    private readonly engineParser;
    private eventListeners;
    /** Accumulated across every `registerSaveRestoreHooks` call, hence Partial. */
    private saveRestoreHooks?;
    private eventSource;
    private systemEventSource;
    /**
     * Set while a `listener_error` report is being delivered. The report
     * goes out through `emit('event')`, so a listener that throws on every
     * event would otherwise recurse without end (see `reportListenerError`).
     */
    private reportingListenerError;
    private pendingPlatformOps;
    /**
     * Sequence for platform event ids — `platform_<clock>_<n>`, the same
     * shape `@sharpee/core` gives system events. A counter, not a random
     * draw: ids are never rendered, and a draw would move every stream
     * behind it.
     */
    private platformEventSequence;
    /**
     * The incomplete command a clarification question is holding open (GH
     * #318, ADR-225 as amended): consumed by the very next input, answer or
     * not. Never serialized — a restore starts with no question pending.
     */
    private heldCommand?;
    private perceptionService?;
    private pluginRegistry;
    private actorTurnPlugin;
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
    /**
     * Master seed for the session (ADR-293 D1). Resolved once in the
     * constructor — `config.seed` when injected, else the clock, read
     * exactly once. Every engine stream derives from it.
     */
    private masterSeed;
    /**
     * Per-point stream owner (ADR-293 D5/D7) — the engine's sole
     * `RandomService` instance. Exposed through the save provider so the
     * `{ pointName → streamState }` map rides every save. Draw surfaces
     * move onto it across ADR-293 Phase A.
     */
    private randomService;
    private narrativeSettings;
    private inputModeHandlers;
    private vocabularyManager;
    private saveRestoreService;
    /** `game.initialized` is emitted once per engine, on the first `start()`. */
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
     * Install a story into this engine: run `STORY_INSTALL_STEPS` over the
     * engine's collaborators, adopt what they produce, then hand the story
     * the live engine.
     *
     * An engine installs exactly one story, before it starts. A second
     * call, or a call after `start()`, throws naming the field that
     * refuses it — the same engine cannot be reinstalled; `bootstrap` boots
     * a fresh one per playthrough (ADR-248). A step that throws (a config
     * or world validation failure) leaves the engine with nothing adopted.
     *
     * @param story - The story to install
     * @throws Error when a story is already installed or the engine is running; whatever a step throws
     */
    installStory(story: Story): void;
    /**
     * Get the current parser
     */
    getParser(): Parser;
    /**
     * Get the current language provider
     */
    getLanguageProvider(): LanguageProvider;
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
     * Re-project the `storyInfo` capability from the story's config and the
     * current `StoryInfoTrait`. Called once during `start()`, before the
     * `ChannelService` is constructed, so `infoChannel` / `ifidChannel` see
     * the build-pipeline values (`engineVersion`, `clientVersion`,
     * `buildDate`) a consumer patched onto the trait after `installStory()`.
     * The same precedence rule as at load: an authored field the config set
     * is not overwritten by the trait here.
     */
    private refreshStoryInfoCapability;
    /**
     * Resolve `StoryConfig.prologue` (ADR-298 D3) into the `storyInfo`
     * capability, once at story start, before the `ChannelService` is
     * constructed — stdlib's `prologueChannel` projects the resolved text.
     * A literal (or plain string) is itself; a `phrase-ref` renders through
     * the prose pipeline's phrase machinery, so variants (cycling, randomly,
     * first-time) resolve per their normal semantics. Absent or unresolvable
     * values write nothing (sparse-suppress — the channel skips emission).
     */
    private resolvePrologue;
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
     * The facade's turn-facing surface (ADR-334 D5): what the stages under
     * `turn/` may reach. Getters read the live fields — the parser, text
     * service, and executor are set by `installStory`; the pending platform
     * list is replaced when drained.
     */
    private turnEngine;
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
     * The NPC decision layer (ADR-328 D5): where a story registers the
     * behaviors and tick phases the engine's actor turn phase drives.
     */
    getNpcService(): INpcService;
    /**
     * The execution entry (ADR-328 D2; ADR-329 D4): perform one standard or
     * story action NOW as `actorId`, through the same four phases a typed
     * command runs — validate, interceptors, capability dispatch, report —
     * over the live world and turn context. The engine's own actor turn phase
     * and a Chord acting statement both come through here; there is no other
     * door. Runs synchronously; the world has changed (or the action was
     * refused) by the time it returns.
     *
     * @param actorId - The entity performing the action
     * @param actionId - A standard (`if.action.taking`) or story action id
     * @param slots - The entities and direction the action operates on
     * @returns Whether the action ran (false when refused) and every event it emitted
     */
    executeAsActor(actorId: string, actionId: string, slots?: ActSlots): ActResult;
    /**
     * The negotiated client capabilities for this session (ADR-216): the
     * `client has <capability>` predicate reads these live, and channel
     * gating uses the same flags at manifest time. Text-only before
     * `start({ capabilities })` runs or when none were negotiated.
     */
    getClientCapabilities(): ClientCapabilities;
    /**
     * The session's master seed (ADR-293 D1/D14). Every run reports it —
     * test output, `--play` startup, failure reports — so one number plus
     * a command list reproduces the session.
     */
    getMasterSeed(): number;
    /**
     * The engine's per-point stream owner (ADR-293 D5). Part of the
     * ISaveRestoreStateProvider contract — the save service persists its
     * `{ pointName → streamState }` map and restores it through the
     * version reader.
     */
    getRandomService(): EngineRandomService;
    /**
     * Enable or disable the per-draw random trace (ADR-293 D16). While enabled,
     * every firing — drawn or forced — emits an `ISystemEvent` on the system
     * event channel (`subsystem: Subsystems.RANDOM`, `type: 'draw'`,
     * `severity: 'debug'`, data: `IRandomTraceData`). Off by default; opted into
     * by the transcript runner, `--play`, and the IDE — a published game emits
     * none (AC-14).
     */
    setRandomTraceEnabled(enabled: boolean): void;
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
     * Get the text service
     */
    getTextService(): IProsePipeline;
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
     * pipeline's `processTurn`.
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
     * story load.
     *
     * @param entry the slot entry to register (or replace).
     */
    registerSlotEntry(entry: SlotEntry): void;
    /**
     * Register save/restore hooks, MERGING them into whatever is already
     * registered (issue #229).
     *
     * The four hooks are one object but four unrelated concerns: two clients
     * legitimately own different ones. A harness owns `onRestartRequested`
     * (auto-confirming a restart nobody is present to approve) while a test
     * runner or bridge owns `onSaveRequested`/`onRestoreRequested`. Assigning
     * wholesale — which this did until 2026-08-05 — meant the second registrant
     * silently destroyed the first's, and the failure was invisible: with
     * `onRestartRequested` gone, `shouldRestart` defaults to true, so `restart`
     * still acked and stopped the engine while the reboot that ack promised
     * never fired (issue #227). Merging makes partial registration the supported
     * shape rather than a trap.
     *
     * A named entry replaces the prior one of that name; entries the caller does
     * not name are left alone. To REMOVE a hook, name it explicitly as
     * `undefined` — every read site treats an absent and an undefined entry the
     * same way. `{}` therefore registers nothing rather than clearing everything.
     *
     * **This SNAPSHOTS.** Merging necessarily copies, so the engine no longer
     * holds the caller's object: mutating a hooks object after registering it
     * has no effect, where it used to reach the engine through the shared
     * reference. Re-register to change a hook.
     *
     * @param hooks any subset of the four hooks
     */
    registerSaveRestoreHooks(hooks: Partial<ISaveRestoreHooks>): void;
    /**
     * Get currently registered save/restore hooks.
     *
     * Partial because registration is (see above): what comes back is the
     * accumulation of every registration so far, which need not carry all four.
     */
    getSaveRestoreHooks(): Partial<ISaveRestoreHooks> | undefined;
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
     * The engine surface the platform dispatcher acts on. The hooks are
     * read through a getter so a dispatch sees whatever is registered at
     * the moment each request runs.
     */
    private platformOperationHost;
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
     * Report one of the facade's own failures as a `system.<type>` event of
     * severity `error` on the system event source, which re-emits it to
     * `event` listeners. Data carries the error's message and stack.
     */
    private reportError;
    /**
     * Report a listener that threw, as `system.listener_error` naming the
     * event it was listening for. The report is delivered through `emit`
     * itself, so a failure raised while one is in flight is dropped rather
     * than reported — that is the case of a listener throwing on the report.
     */
    private reportListenerError;
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

### types

```typescript
/**
 * Engine-specific types and interfaces
 *
 * The engine manages game state, turn execution, and event sequencing
 */
import { type ISemanticEvent } from '@sharpee/core';
import { type IParsedCommand, type IValidatedCommand, type PronounSet, IFEntity, WorldModel } from '@sharpee/world-model';
import { type ITextBlock } from '@sharpee/text-blocks';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';
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
     * The entity that performed the action (ADR-328 D1) — the player for a
     * parser-driven turn, the named actor for `CommandExecutor.executeAsActor`.
     * Absent only when the command failed before an actor was resolved.
     */
    actorId?: string;
    /**
     * True when the action's own `validate()` refused it and the `blocked`
     * phase ran instead of execute/report. `success` stays as it was (no
     * `action.error`), since a refusal is still a completed turn for the
     * turn cycle; this is the fact a caller that acted on purpose — the
     * actor turn phase (ADR-328 D5) — reads to learn the act did not happen.
     */
    refused?: true;
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
    /**
     * Master seed for the session (ADR-293 D1). One seed governs every
     * stream: given the same seed and command sequence, a story produces
     * the same rendered output. Precedence: `(--seed N | --vary)` →
     * `[SEED: N]` → this field → the clock (read exactly once). Absent,
     * play is as varied as before.
     */
    seed?: number;
}
/**
 * Narrative perspective for player actions (ADR-089 Phase C).
 * - '1st': "I take the lamp" (rare, Anchorhead-style)
 * - '2nd': "You take the lamp" (default, Zork-style)
 * - '3rd': "She takes the lamp" (experimental)
 */
export type Perspective = '1st' | '2nd' | '3rd';
/**
 * Narrative tense (future consideration).
 * - 'present': "You take the lamp" (default)
 * - 'past': "You took the lamp"
 */
export type Tense = 'present' | 'past';
/**
 * The resolved narrative settings of a story: how player-facing
 * messages are rendered. Built from `StoryConfig.narrative` at install
 * (`install/narrative/`) and read at render time by the prose pipeline
 * and the language provider, so it is a shared type, not an install one.
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
 * The facade's event map: what `GameEngine.on` accepts, keyed by event
 * name, each value the listener's signature.
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
```

### install/story

```typescript
/**
 * Story configuration and interfaces
 */
import { WorldModel, IFEntity, type IGameEvent, type SimpleEventHandler } from '@sharpee/world-model';
import { type LanguageProvider, type IChannelRegistry } from '@sharpee/if-domain';
import { type Parser } from '@sharpee/stdlib';
import { type ISemanticEvent } from '@sharpee/core';
import type { GameEngine } from '../game-engine.js';
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
     * Story authors (ADR-298). Always an array — single-author stories
     * use a one-element array. Kept as data; consumers join for display.
     */
    authors: string[];
    /**
     * Story testers (ADR-298). Credited on the info channel beside
     * `authors`; never joined into the byline.
     */
    testers?: string[];
    /**
     * Credit lines for the opening banner's `author-list` section. Each
     * string becomes one `author-list`-classed paragraph. Use this when
     * the banner needs distinct credit lines (e.g., a primary author
     * line plus a "Ported by …" line, or multiple separate roles).
     *
     * When omitted, the engine falls back to a single `author-list`
     * entry built from `authors` (joined with ", ").
     */
    credits?: string[];
    /**
     * Pre-banner prologue text (ADR-298 D3), emitted once at story start
     * on the dedicated prologue channel. A plain string is literal prose;
     * the object form carries Chord's typed value, where a `phrase-ref`
     * is resolved through the story's phrase machinery at emission time.
     */
    prologue?: string | {
        kind: 'literal' | 'phrase-ref';
        value: string;
    };
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
     * Transcript auto-assertion policy (go-live Phase 6e, #253): what the
     * test runner writes for a NEW command's first run. Consumed by the test
     * harness only — inert at play time. Absent = "let me decide" (the runner
     * writes nothing; an unasserted command keeps its ADR-294 D2 failure).
     * Sourced from the `.story` header's `auto-assertion:` field so the CLI
     * and the IDE apply the identical policy.
     */
    autoAssertion?: 'all-emitted-text' | 'room-description' | 'room-name-and-description';
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
    /**
     * Called after a save has been fully restored (optional, ADR-289 D2).
     *
     * The engine is the only layer that knows a restore happened; a story is
     * the only layer that knows what its own persisted keys mean. This hook
     * joins the two without either reaching into the other.
     *
     * **Contract: the engine is FULLY restored when this runs.** It fires as
     * the last act of the restore — after the world snapshot, plugin states,
     * the action-RNG reseed, and undo-snapshot clearing — never immediately
     * after `world.loadJSON`. A hook fired mid-sequence would let the story
     * observe a half-restored engine, which is the same class of defect
     * ADR-289 exists to close: an observer seeing state mid-mutation.
     *
     * **Not called on undo.** `undo()` also replaces the world via
     * `loadJSON`, but undo snapshots are taken from the current session's
     * world — already swept at load or restore — and `clearUndoSnapshots()`
     * runs after every restore, so no stale key can enter the undo buffer.
     * See the comment at the undo site.
     *
     * @param world - The fully restored world model
     * @param restoredTurn - The save's turn count: the number of turns it had
     *   played, which is the turn its last turn-end phase ran on
     */
    onWorldRestored?(world: WorldModel, restoredTurn: number): void;
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

### install/narrative/narrative-settings

```typescript
/**
 * Narrative configuration and its resolution at install (ADR-089 Phase C):
 * `NarrativeConfig` is what a story writes; `buildNarrativeSettings` turns it
 * into the `NarrativeSettings` the engine reads (the settings type itself
 * lives in `types.ts`, shared with the render side).
 */
import { type PronounSet } from '@sharpee/world-model';
import type { NarrativeSettings, Perspective } from '../../types.js';
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

### command/command-executor

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
 * Two entries, one path (ADR-328 D1/D2): `execute(input, …)` parses and
 * validates typed input as the player; `executeAsActor(request, …)` takes an
 * already-resolved command and a named actor. Both hand a `ValidatedCommand`
 * and an actor to the same private `runPhases`, so capability dispatch, the
 * pre-action hook, the four phases, and entity-handler reactions are
 * identical whoever acts.
 *
 * All event creation is owned by the action components themselves.
 */
import { type ISystemEvent, type IGenericEventSource, Result, type RandomService } from '@sharpee/core';
import { type IParser, type IValidatedCommand, type IParsedCommand, type IValidationError, type IFEntity, type DirectionType } from '@sharpee/world-model';
import { type ISound } from '@sharpee/if-domain';
import { WorldModel } from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { type ActionRegistry } from '@sharpee/stdlib';
import { GameContext, TurnResult, EngineConfig } from '../types.js';
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
/**
 * A resolved command for the programmatic entry (ADR-328 D2): the action to
 * run, who runs it, and the entities already chosen for each slot. There is
 * no parser step, so there is nothing to disambiguate — the caller has
 * decided. Scope and every other actor-relative check still run in the
 * action's own `validate()`.
 */
export interface ActorCommand {
    /** The action id to run, e.g. `if.action.taking` */
    actionId: string;
    /** The entity performing the action */
    actorId: string;
    /** Direct object, if the action takes one */
    directObject?: IFEntity;
    /** Indirect object, if the action takes one */
    indirectObject?: IFEntity;
    /** Instrument (ADR-080), if the action takes one */
    instrument?: IFEntity;
    /** Direction of travel, for `if.action.going` (read from `parsed.extras.direction`) */
    direction?: DirectionType;
}
export declare class CommandExecutor {
    /** The parser as the engine calls it: every engine-facing method present (`adaptParser`). */
    private readonly parser;
    private validator;
    private actionRegistry;
    private eventProcessor;
    private scopeResolver?;
    private parsedCommandTransformers;
    private beforeActionListeners;
    /**
     * The session's per-point stream owner (ADR-293), threaded into every
     * ActionContext this executor creates. Optional at construction so bare
     * harnesses can wire it late, but context creation requires it — the
     * factory throws without one (D6).
     */
    private randomService?;
    constructor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>, randomService?: RandomService);
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
    /**
     * Execute typed input as the player: parse → transform → validate → the
     * shared four-phase path (`runPhases`).
     *
     * @param input - The raw command text
     * @param world - The world model
     * @param context - Turn context (current turn, player, config)
     * @param config - Engine config (timing collection)
     * @param soundBuffer - The per-turn sound buffer (ADR-172)
     * @returns The turn result; never throws — failures come back as a
     *          `command.failed` event with `success: false`
     */
    execute(input: string, world: WorldModel, context: GameContext, config?: EngineConfig, soundBuffer?: ISound[]): Promise<TurnResult>;
    /**
     * Execute an already-resolved command as the named actor (ADR-328 D2).
     *
     * Skips parse, the parsed-command transformers, and the CommandValidator —
     * the caller has chosen the entities — and runs everything after: the
     * pre-action hook, capability dispatch, validate → execute → report |
     * blocked, and entity-handler reactions. The action's own `validate()`
     * still performs every actor-relative check (scope, capacity, traits,
     * interceptors) against the named actor. Synchronous: nothing inside the
     * four phases awaits.
     *
     * @param request - Action id, actor id, and resolved slot entities
     * @param world - The world model
     * @param context - Turn context (current turn, player, config)
     * @param config - Engine config (timing collection)
     * @param soundBuffer - The per-turn sound buffer (ADR-172)
     * @returns The turn result with `actorId` set to the request's actor;
     *          never throws — an unknown actor or action comes back as a
     *          `command.failed` event with `success: false`
     */
    executeAsActor(request: ActorCommand, world: WorldModel, context: GameContext, config?: EngineConfig, soundBuffer?: ISound[]): TurnResult;
    /**
     * The one four-phase path (ADR-328 D1). Both entries land here with a
     * validated command and the entity acting; nothing below reads the
     * player except through `actor`.
     */
    private runPhases;
    /**
     * Build the failure result both entries return instead of throwing.
     */
    private failedResult;
}
export declare function createCommandExecutor(world: WorldModel, actionRegistry: ActionRegistry, eventProcessor: EventProcessor, parser: IParser, systemEvents?: IGenericEventSource<ISystemEvent>, randomService?: RandomService): CommandExecutor;
```

### command/shared-data-keys

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

### turn/stages

```typescript
/**
 * The two stage lists a turn can run: `TURN_STAGES` for a regular command
 * and `META_STAGES` for a meta command. The order here IS the turn's
 * contract; each stage's `requires` names what it must follow, and the
 * order test pins both lists and drives each once.
 *
 * Both lists open with the same routing stages through `parse`, where
 * they part: the regular list executes the command, enriches and emits
 * its events, ticks the plugins, dispatches sound, advances the turn,
 * lands a player switch, drains platform requests, renders, detects a
 * death, clears the turn's events, announces completion, and ends the
 * story if the turn did. The meta list runs the command outside the
 * turn cycle and renders its events at once; that it never touches the
 * turn machinery is readable as the absence of those stages from it.
 *
 * Public interface: `TURN_STAGES`, `META_STAGES`, `SHARED_STAGES`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the list), D1a (two lists, shared prefix),
 * D2 (the order pinned by test).
 */
import type { TurnStage } from './context.js';
/** The routing stages both lists open with, through the parse that parts them. */
export declare const SHARED_STAGES: readonly TurnStage[];
/** A regular command's turn, in run order. */
export declare const TURN_STAGES: readonly TurnStage[];
/** A meta command's run, in run order: the shared routing, then the command and its render. */
export declare const META_STAGES: readonly TurnStage[];
```

### turn/context

```typescript
/**
 * The turn-stage contract: what a stage is, what one turn's stages share,
 * and what a stage may ask of the engine.
 *
 * A turn is an ordered list of named stages (`TurnStage`), each with one
 * reason to change and a `requires` list naming the stages it must
 * follow. A stage runs over a `TurnStageContext` — the input, the turn
 * number, the result under construction, and the batches and flags the
 * old inline phases passed between themselves as locals — and returns
 * `'continue'` or `'stop'`; `'stop'` ends the list with the result as it
 * stands. The parse stage alone sets `route`, and the runner selects the
 * regular or the meta list on it. A stage reaches the engine only through
 * `TurnEngine`, the facade's turn-facing surface: getters over the services
 * and state a turn touches, and operations on the state the engine keeps
 * across turns (the held command, the pending platform requests, the
 * per-turn event store, the session counters). The bodies of the turn's
 * own helpers live in the stage modules; nothing turn-only remains on the
 * facade.
 *
 * Public interface: `TurnStage`, `TurnStageContext`, `TurnEngine`,
 * `StageOutcome`, `TurnRoute`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the stage contract, the route set by parse
 * alone), D1a (two lists sharing the parse stage), D5 as amended by A1
 * (the facade's public surface does not move; stages reach its state
 * through this surface).
 */
import type { ISemanticEvent, ISemanticEventSource, IPlatformEvent } from '@sharpee/core';
import type { WorldModel, IParsedCommand } from '@sharpee/world-model';
import type { StandardActionRegistry, IPerceptionService } from '@sharpee/stdlib';
import type { ISound } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { PluginRegistry } from '@sharpee/plugins';
import type { EngineConfig, GameContext, GameEngineEvents, InputModeHandler, TurnResult } from '../types.js';
import type { CommandExecutor } from '../command/command-executor.js';
import type { EngineRandomService } from '../session/engine-random-service.js';
import type { IProsePipeline } from '../prose-pipeline/index.js';
import type { SoundDispatcher } from '../sound/index.js';
import type { Story } from '../install/story.js';
import type { PlatformOperationHost } from './platform-dispatcher.js';
import type { EngineParser } from '../ports/parser-interface.js';
import type { SaveRestoreService } from '../session/save-restore-service.js';
import type { ChannelService } from '@sharpee/channel-service';
import type { LanguageProvider } from '@sharpee/if-domain';
/** What a stage returns: run the next stage, or end the list here. */
export type StageOutcome = 'continue' | 'stop';
/** Which list the turn runs after parsing: a regular turn or a meta command. */
export type TurnRoute = 'turn' | 'meta';
/**
 * One stage of a turn.
 */
export interface TurnStage {
    /** The stage's name; what `requires` and the order test refer to. */
    readonly name: string;
    /** Stages this one must follow, by name; empty when it reads nothing they write. */
    readonly requires: readonly string[];
    /** Run the stage over the turn's context. */
    run(context: TurnStageContext): Promise<StageOutcome>;
}
/**
 * What one turn's stages share. Fields are written by the stage named in
 * their comment and read by the stages after it.
 */
export interface TurnStageContext {
    /** The engine's turn-facing surface. */
    readonly engine: TurnEngine;
    /** The input as it stands; the held-command and exchange stages rewrite it. */
    input: string;
    /** The turn number this input runs as (not incremented by a meta command). */
    readonly turn: number;
    /** Set by `turn-start` once `turn:start` has been emitted; the runner pairs `turn:failed` with it. */
    started: boolean;
    /** Set by `parse`; the runner switches lists on it. */
    route?: TurnRoute;
    /** Set by `parse` for a meta command; what the meta stages execute. */
    parsedCommand?: IParsedCommand;
    /** The result under construction; set by `execute-command`, the meta, input-mode, and stop stages. */
    result?: TurnResult;
    /** The action's events after enrichment and perception; set by `enrich-events`. */
    semanticEvents: ISemanticEvent[];
    /** The meta command's events, rendered by `meta-render`; set by `meta-command`. */
    events: ISemanticEvent[];
    /** The turn's rendered blocks; set by `render-prose`, read by `channel-packet`. */
    blocks?: ITextBlock[];
    /** A `story.victory` seen among the action's events; set by `emit-events`. */
    victory?: {
        reason: string;
        score: number;
    };
    /** The cause of a player death this turn, if any; set by `detect-death`. */
    deathCause?: string;
}
/**
 * The facade's turn-facing surface. Getters read the engine's live
 * fields (the text service and executor are set by `installStory`;
 * the pending platform list is replaced when drained).
 */
export interface TurnEngine {
    readonly world: WorldModel;
    readonly context: GameContext;
    /** The installed story, or none before `installStory`. */
    readonly story: Story | undefined;
    readonly config: EngineConfig;
    /** The parser as the engine calls it: every engine-facing method present. */
    readonly parser: EngineParser;
    readonly commandExecutor: CommandExecutor;
    readonly actionRegistry: StandardActionRegistry;
    readonly randomService: EngineRandomService;
    readonly pluginRegistry: PluginRegistry;
    readonly textService: IProsePipeline | undefined;
    readonly languageProvider: LanguageProvider | undefined;
    /** Snapshots for undo (the undo-snapshot stage takes one per undoable input). */
    readonly saveRestoreService: SaveRestoreService;
    /** The channel-I/O producer, constructed by `start()`; none before it. */
    readonly channelService: ChannelService | undefined;
    /** The perception service, when one was given; enrichment and presence tagging read it. */
    readonly perceptionService: IPerceptionService | undefined;
    readonly eventSource: ISemanticEventSource;
    /** Platform requests queued this turn, read-only; `queuePlatformOperation` adds, `drainPendingPlatformOperations` takes. */
    readonly pendingPlatformOps: readonly IPlatformEvent[];
    /**
     * The per-turn sound buffer. A live handle on purpose: the command executor's
     * signature takes the array and fills it in place during the report phase, the
     * plugin tick pushes into the same one, and `executeAsActor` hands it out too —
     * the collection's identity is the contract, so an operation would only wrap it.
     */
    readonly soundBuffer: ISound[];
    readonly soundDispatcher: SoundDispatcher;
    readonly inputModeHandlers: ReadonlyMap<string, InputModeHandler>;
    /** The events stored for a turn — the live list, created empty on first ask; append through `storeTurnEvents`. */
    turnEventsOf(turn: number): ISemanticEvent[];
    /** Append events to a turn's stored list, rendered at turn end and cleared after. */
    storeTurnEvents(turn: number, events: readonly ISemanticEvent[]): void;
    /** Empty a turn's stored list once it has been rendered. */
    clearTurnEvents(turn: number): void;
    /** Emit one of the engine's lifecycle events. */
    emit<K extends keyof GameEngineEvents>(event: K, ...args: Parameters<GameEngineEvents[K]>): void;
    /** Emit a game event and store it in the current turn's events (nothing stored before turn one). */
    emitGameEvent(event: ISemanticEvent): void;
    /** Refresh the parser's scope vocabulary for the player's current surroundings. */
    updateScopeVocabulary(): void;
    /** Make another playable actor the player (ADR-327); throws for a missing or unplayable entity. */
    switchPlayer(entityId: string): void;
    /** Run an input as a turn of its own (command chaining, AGAIN). */
    executeTurn(input: string): Promise<TurnResult>;
    /** Remember a clarification for the next input (GH #318). */
    holdCommand(input: string): void;
    /** Take the held command, if any, clearing the hold — exactly one input spends it (GH #318). */
    takeHeldCommand(): string | undefined;
    /** Count a turn (and a move when it succeeded) in the session statistics. */
    countSessionTurn(success: boolean): void;
    /** What a platform operation needs of the engine: the hooks, save data, stop, undo, repeat (ADR-334 D3). */
    platformOperationHost(): PlatformOperationHost;
    /** Queue a platform request for the turn's platform-operations stage. */
    queuePlatformOperation(operation: IPlatformEvent): void;
    /** Take every queued request, leaving the queue empty — so a nested turn (AGAIN) sees none of them. */
    drainPendingPlatformOperations(): IPlatformEvent[];
    stop(reason: 'victory' | 'defeat', details?: unknown): void;
}
```

### session/engine-random-service

```typescript
/**
 * EngineRandomService — the engine's sole `RandomService` implementation (ADR-293 D5).
 *
 * Public interface: {@link EngineRandomService} class (`chance`/`int`/`pick`/`resolve`
 * draw API; `loadForces`/`clearForces`/`getForceReport` forcing surface;
 * `setPointSeedOverrides` (D11); `setTraceSink` (D16);
 * `serializeStreamStates`/`restoreStreamStates` persistence; `getMasterSeed`),
 * {@link ACTION_STREAM_POINT_NAME}, {@link TURN_STREAM_POINT_NAME}.
 * Owner context: `@sharpee/engine` runtime. Core owns the interface, catalog, and
 * force/trace types; this class owns stream derivation, the per-point stream cache,
 * the force table, occurrence counters, trace emission, and stream-state
 * persistence (D3, D7, D8, D9, D16).
 *
 * Invariants:
 * - A point's stream depends only on (masterSeed, point name) — never on
 *   registration or draw order (D3). A point-seed override (D11) replaces where
 *   that one name's stream starts; every other derivation is untouched.
 * - No draw leaves this class's streams except through a `ChoicePoint` handle;
 *   the one bare-`SeededRandom` exit is `resolve()`'s `sample` callback (D2).
 * - A forced firing consumes zero draws: it never touches the point's stream (D8).
 * - Forces and occurrence counters are session state, never save state (D9):
 *   `serializeStreamStates` carries stream states only.
 * - Restore never reads the clock: unknown or missing names reseed by derivation
 *   from the master seed (D7).
 * - No trace record is built unless a sink is installed (D16: off by default,
 *   silent in a published game).
 */
import { type ChoicePoint, type RandomService, type SeededRandom, type RandomForceSpec, type RandomForceStatus, type RandomTraceSink } from '@sharpee/core';
/**
 * Point name the pre-ADR-293 unified action stream (`IEngineState.actionRngSeed`)
 * maps onto when a `2.0.0` save is read (D7's version reader). The action surface
 * itself moves onto this service when `ActionContext.random` is retyped
 * (ADR-293 Phase A, stdlib flip).
 */
export declare const ACTION_STREAM_POINT_NAME = "engine.action";
/**
 * Point name the engine's turn-plugin stream (`GameEngine.random`) derives its
 * interim seed from (ADR-293 Phase A, re-cut Phase 3). The stream stays
 * `SeededRandom`-typed until the turn-plugin surface moves onto points in the
 * Phase 4–6 arc; deriving its seed from (masterSeed, this name) makes
 * turn-plugin and deadly-room draws seed-reproducible in the meantime.
 */
export declare const TURN_STREAM_POINT_NAME = "engine.turn";
/**
 * Per-point stream owner. One instance per engine per session; all stream state
 * lives here (never at module scope — D6) and rides the save as
 * `{ pointName → streamState }` (D7). Forces, point-seed overrides, occurrence
 * counters, and the trace sink are session-scoped and never serialized (D9).
 */
export declare class EngineRandomService implements RandomService {
    private readonly masterSeed;
    /** Streams that have drawn this session, keyed by point name. */
    private streams;
    /** Restored stream states not yet re-materialized into a live stream. */
    private restoredStates;
    /** Loaded forces, keyed by `forceKey(spec)` (D9's key identity). */
    private forceTable;
    /** 1-based firing count per point this session (D9's occurrence index). */
    private occurrences;
    /** Per-point starting-seed overrides (D11); consulted only at stream derivation. */
    private pointSeedOverrides;
    /** Trace receiver (D16); records are built only while one is installed. */
    private traceSink;
    constructor(masterSeed: number, options?: {
        pointSeedOverrides?: Readonly<Record<string, number>>;
        traceSink?: RandomTraceSink;
    });
    /** The session's master seed, for seed reporting (D14). */
    getMasterSeed(): number;
    /**
     * Load forces into the session's force table, validating each against the
     * catalog (D8, D9). Additive across calls; duplicate detection spans all
     * loaded forces.
     *
     * @param specs - forces to load
     * @throws UnknownForcePointError if a spec names an undeclared point (D2)
     * @throws UndeclaredForceClassError if a spec names a class its point does
     *   not declare, or targets a plain draw (D4)
     * @throws DuplicateForceKeyError if a `point[#occurrence]` key is already
     *   loaded (D9: a load error, not last-wins)
     * @throws Error if a spec's occurrence index is not a positive integer
     */
    loadForces(specs: readonly RandomForceSpec[]): void;
    /** Drop every loaded force and its fire counts (session-state reset). */
    clearForces(): void;
    /**
     * Session status of every loaded force, as data for the consumer's report
     * (D9): an unfired `once` force has `fireCount` 0 — a hard error in
     * transcript runs, a report line in play; `sticky` counts are informational.
     */
    getForceReport(): RandomForceStatus[];
    /**
     * Replace the per-point starting-seed override map (D11). An override wins
     * over master-seed derivation for that name only, and only when the point's
     * stream has not yet materialized (a live or restored stream keeps its state).
     */
    setPointSeedOverrides(overrides: Readonly<Record<string, number>>): void;
    /**
     * Install or remove the trace receiver (D16). While absent — the default —
     * no trace record is built at all, which is what keeps a published game
     * silent (AC-14).
     */
    setTraceSink(sink: RandomTraceSink | undefined): void;
    /**
     * True with the given probability, drawn on `p`'s own stream — unless a
     * matching force substitutes the outcome via the fixed yes/no ⟷ boolean
     * bijection, consuming zero draws (D8).
     */
    chance(p: ChoicePoint<'yes' | 'no'>, probability: number): boolean;
    /**
     * Integer in [min, max] inclusive, drawn on `p`'s own stream. Class-less
     * draw: never consults the force table (Phase C ruling 2(a) — a forceable
     * outcome space is expressed via `resolve()`).
     */
    int(p: ChoicePoint, min: number, max: number): number;
    /**
     * Pick one element, drawn on `p`'s own stream. Class-less draw: never
     * consults the force table (ruling 2(a)). `label` names the picked item in
     * trace; it draws nothing.
     */
    pick<T>(p: ChoicePoint, items: readonly T[], label?: (t: T) => string): T;
    /**
     * Resolve a class-bearing point to a classed outcome (D8).
     *
     * Forced path: a matching force substitutes the declared class and builds
     * its value via `materialize`, consuming zero draws — the point's stream is
     * never touched, so cross-point desynchronization is impossible (D3, D8).
     * Real path: `sample` runs against the point's own stream (any number of
     * internal draws).
     *
     * @throws Error if `p` declares no outcome classes (plain draws have no
     *   classed outcome to resolve), or if `sample` returns a class the point
     *   does not declare (an undeclared class would corrupt coverage and make
     *   forcing unsound).
     */
    resolve<C extends string, R>(p: ChoicePoint<C>, sample: (draw: SeededRandom) => {
        cls: C;
        value: R;
    }, materialize: (forced: C) => R): {
        cls: C;
        value: R;
    };
    /**
     * Current stream state of every point that has drawn — live streams plus
     * restored states whose points have not redrawn since restore (D7: the save
     * carries only points that have drawn). Forces and occurrence counters are
     * deliberately absent — session state, never save state (D9).
     */
    serializeStreamStates(): Record<string, number>;
    /**
     * Replace all stream state with a saved `{ pointName → streamState }` map.
     * Named points continue exactly where the save left them; names absent from
     * the map reseed lazily — from a point-seed override if one is active (D11
     * is session state and survives a within-session restore), else by
     * derivation from the master seed — never from the clock (D7). The session's
     * force table is kept: a restore within a live session keeps session
     * instruments (D9).
     */
    restoreStreamStates(states: Record<string, number>): void;
    /**
     * Drop the named points' stream continuity, so their next draw starts a
     * fresh stream (ADR-302 D5/D8 — branching, as opposed to resuming).
     *
     * **Why this is a separate operation and not a mode on restore.** A save
     * carries `{ pointName → streamState }` for every point that has drawn, and
     * `restoreStreamStates` adopts it — which is right, and is what a save is
     * FOR: a restore continues where it left off (D7). But a test harness that
     * starts a *new run* from a saved state wants the world without the luck,
     * and before this existed it had no way to say so. The measured consequence
     * (2026-08-05): a restored stream outranks both seed instruments in
     * `streamFor`, so a master `seed:` override AND a `point-seed:` override
     * were silently **inert** for any point that had already drawn — which is
     * every point you would actually want to vary, since you branch after the
     * interesting thing has started.
     *
     * Leaving `restore` alone and naming this separately keeps D7 true as
     * written. Reseeding is the same species as forces and point-seed
     * overrides: session state, deliberately never serialized (D9).
     *
     * After the drop, the point's next draw re-derives through the ordinary
     * chain — its point-seed override if one is active, else
     * `deriveStreamSeed(masterSeed, name)` — so a caller sets the instruments it
     * wants and then reseeds.
     *
     * **Occurrence counters are deliberately untouched.** They index a point's
     * firings across the session, and a branch child is a continuation of the
     * same game in every respect except the luck it is asking to re-roll. A
     * `forces: p#2=X` written against the parent's numbering keeps meaning what
     * it said.
     *
     * Idempotent, and silent on names that never drew — a point with no stream
     * to drop ends in the state dropping it would have produced.
     *
     * @param points the point names to reseed, or `'all'` for every stream.
     *   `'all'` re-derives the whole schedule from the master seed, which is the
     *   blunt instrument ADR-293 warns about; prefer naming points.
     */
    reseedStreams(points: 'all' | readonly string[]): void;
    /**
     * The point's live stream: cached, else re-materialized from a restored
     * state, else started from a point-seed override (D11), else derived lazily
     * from (masterSeed, name) per D3.
     */
    private streamFor;
    /** Increment and return the point's 1-based firing index (D9's occurrence). */
    private nextOccurrence;
    /**
     * The force applying to this firing, if any: an occurrence-indexed key
     * (`point#N`) wins over the unindexed key; a `once` force is eligible only
     * while unfired (D9). Matching increments the entry's fire count.
     */
    private matchForce;
    private eligible;
    private eligibleUnindexed;
    /** Build and emit a trace record — only while a sink is installed (D16). */
    private emitTrace;
}
```

### session/save-restore-service

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
 * Save format v3.0.0 (versioned reader from v2.0.0 — ADR-293 D7/A1):
 *   - `IEngineState.streamStates` carries the unified
 *     `{ pointName → streamState }` map for every choice point that has
 *     drawn (ADR-293 D7). v2.0.0 saves are READ, not refused: their
 *     `actionRngSeed` maps onto the legacy action point
 *     ({@link ACTION_STREAM_POINT_NAME}) and every other point reseeds
 *     from the master seed. v1 saves remain rejected (known-broken).
 *   - `IEngineState.worldSnapshot` (since v2.0.0) carries the verbatim
 *     `WorldModel.toJSON()` output, gzipped, then base64-encoded for
 *     JSON-safety. Hydration: base64-decode → gunzip → `world.loadJSON()`.
 *     This replaced v1's partial `spatialIndex` serializer, which
 *     captured only entity traits + room contents and silently dropped
 *     the ScoreLedger, capabilities, world state values, relationships,
 *     ID counters, and sub-container containment.
 *
 * Still v3.0.0 — additive changes, 2026-08-02 (ADR-296 D1 + D4, no
 * version bump per the additive-only convention):
 *   - Events in the event-source stream may now carry two additional
 *     opaque `data` fields: `_transactionId` (per-source stamp from the
 *     engine funnels: `txn:{turn}:action` / `txn:{turn}:plugin:{id}`)
 *     and `_narrativeSlot` (chain/reaction phrase placement). They ride
 *     `serializeEventSource` like any other data field — no reader
 *     change required; older saves simply lack them.
 *   - The event stream itself is reorganized by the D4 partition: a
 *     phrase-emission `game.message` (messageless trigger, or
 *     `_chainedFrom` present) now appears as its OWN event in
 *     `turnEvents`, channel packets, and saves, and its formerly-
 *     overridden trigger keeps no injected messageId. Channel consumers
 *     see the same data reorganized.
 */
import { WorldModel } from '@sharpee/world-model';
import { type ISaveData, type ISerializedTurn, type ISemanticEventSource } from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { TurnResult, GameContext } from '../types.js';
import { Story } from '../install/story.js';
import { EngineRandomService } from './engine-random-service.js';
/**
 * Save format version. Bumped `2.0.0` → `3.0.0` for ADR-293 D7: the save
 * gains the unified `{ pointName → streamState }` map (`streamStates`).
 * v2 saves are read through a version-reader branch (A1 ruling 4), not
 * refused — the first real version reader, per the standing ruling
 * against hard breaks. v1 saves are rejected — they are known-broken
 * (drop score / capabilities / state values / relationships); that
 * cutover predates the version-reader ruling.
 *
 * Exported for ADR-294 D3: golden-recording provenance stamps the
 * save-format version it was recorded under, and the transcript tester
 * must read the same constant the save path writes.
 */
export declare const SAVE_FORMAT_VERSION = "3.0.0";
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
     * The engine's per-point stream owner (ADR-293 D7), if wired. When
     * present, its `{ pointName → streamState }` map rides the save and is
     * restored through the version reader. Optional: hosts that predate the
     * `GameEngine` wiring save and restore without it.
     */
    getRandomService?(): EngineRandomService | undefined;
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

### ports/vocabulary-manager

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

### plugins/actor-turn-plugin

```typescript
/**
 * Actor turn phase (ADR-070, ADR-120; ADR-328 D5).
 *
 * The engine-owned phase in which non-player actors act. It leads the
 * platform-phases band (ADR-332: after the scheduler's story reactions,
 * before state machines and scene evaluation), drives the NPC decision
 * layer's tick, and
 * fires the room-entry/exit hooks when the player's action moved them.
 * Every act a behavior chooses runs through the engine's execution entry
 * — the same four phases the player's commands take — so this phase
 * executes nothing of its own; it sequences.
 *
 * Registered by `GameEngine` itself in its constructor (like the scene
 * evaluation plugin); stories reach the decision layer through
 * `GameEngine.getNpcService()`.
 *
 * Public interface: ActorTurnPlugin, ACTOR_TURN_PLUGIN_ID,
 * LEGACY_NPC_PLUGIN_ID.
 * Owner context: @sharpee/engine — turn cycle
 */
import { type ISemanticEvent } from '@sharpee/core';
import { type TurnPlugin, type TurnPluginContext } from '@sharpee/plugins';
import { type ExecutionEntry, type INpcService } from '@sharpee/stdlib';
/** The plugin id this phase saves behavior state under. */
export declare const ACTOR_TURN_PLUGIN_ID = "sharpee.engine.actors";
/**
 * The id `@sharpee/plugin-npc` saved behavior state under before the actor
 * phase moved into the engine (ADR-328 D5). Read-side alias only: a save
 * carrying it restores into this phase; nothing writes it.
 */
export declare const LEGACY_NPC_PLUGIN_ID = "sharpee.plugin.npc";
export declare class ActorTurnPlugin implements TurnPlugin {
    private readonly act;
    /** Stable plugin id. */
    id: string;
    /** Run order within a turn: first of the platform phases (ADR-332). */
    priority: number;
    private readonly service;
    /**
     * @param act - The engine's execution entry, curried over its world and
     *   turn context: how a behavior's chosen act becomes a real
     *   `(action, actorId)` invocation.
     */
    constructor(act: ExecutionEntry);
    /**
     * Tick the decision layer for this turn and return the events actors
     * produced.
     *
     * After the per-turn tick (which drives each NPC's `onTurn`), this also
     * fires the room-entry/exit hooks when the player's own action moved them
     * this turn: an `if.event.actor_moved` in `ctx.actionEvents` whose actor
     * is the player (any other actor's move is an NPC acting through the
     * entry, and is not the player arriving anywhere) makes the NPCs in the
     * room left react via `onPlayerLeaves` and those in the room entered via
     * `onPlayerEnters`.
     */
    onAfterAction(ctx: TurnPluginContext): ISemanticEvent[];
    /**
     * Per-NPC behavior state (#226) for the save. NPC world state itself
     * rides the world snapshot; this is only what behaviors hold privately.
     */
    getState(): unknown;
    /** Restore per-NPC behavior state from a save. */
    setState(state: unknown): void;
    /**
     * The NPC decision layer — the author hook for registering behaviors
     * and tick phases. The service type (`INpcService`) and behavior helpers
     * live in `@sharpee/stdlib`.
     */
    getNpcService(): INpcService;
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
import type { EntityId } from '@sharpee/core';
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
 * @param actorId the acting entity of the event being rendered (ADR-328 D4).
 *   When given, its `NounPhrase` is bound under the reserved `ACTOR_PARAM_KEY`
 *   — unless the emitter bound one already — so the provider renders the
 *   `{You}` family in the actor's own person. Absent for actorless events.
 * @returns the realized blocks re-keyed to `blockKey`, or `null` when the message
 *   id is not registered (the caller applies its inline-text fallback)
 */
export declare function renderViaPhrase(context: HandlerContext, messageId: string, params: Record<string, unknown>, blockKey: string, actorId?: EntityId): ITextBlock[] | null;
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

### install/validate-room-snippets

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
 * Public interface: `validateRoomSnippets`, `lintUnusedSnippetEntries`,
 * `SnippetValidationError`, `validateRoomSnippetsStep`.
 *
 * Owner context: `@sharpee/engine` — story installation (the
 * `validate-room-snippets` step, after the world build and the player
 * lookup). Render-time degradation for maps mutated after load lives in
 * the room-description handler path, not here.
 */
import type { WorldModel } from '@sharpee/world-model';
import type { InstallStep } from './context.js';
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
/** The install step: runs the validation over the built world. */
export declare const validateRoomSnippetsStep: InstallStep;
```
