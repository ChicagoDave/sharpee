/**
 * Game Engine - Main runtime for Sharpee IF games
 * 
 * Manages game state, turn execution, and coordinates all subsystems
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  movePlayerRoleVocabulary,
  ContainerTrait,
  StandardCapabilities,
  TraitType,
  StoryInfoTrait,
} from '@sharpee/world-model';
import { EventProcessor, type Effect } from '@sharpee/event-processor';
import {
  type ActionRegistry,
  StandardActionRegistry,
  standardActions,
  type Parser,
  ParserFactory,
  CommandHistoryCapabilitySchema,
  IFActions,
  type IPerceptionService,
  registerStandardChains,
  channelRegistry,
  createDeadlyRoomTransformer,
  type INpcService,
  type ActSlots,
  type ActResult,
} from '@sharpee/stdlib';
import { type LanguageProvider, type IEventProcessorWiring, type ClientCapabilities, type ISound } from '@sharpee/if-domain';
import { IProsePipeline, ProsePipeline, type SlotContributor, type SlotEntry } from './prose-pipeline/index.js';
import type { ITextBlock } from '@sharpee/text-blocks';
import { ChannelService } from '@sharpee/channel-service';
import { type ISemanticEvent, type ISystemEvent, type IGenericEventSource, createSemanticEventSource, createGenericEventSource, type ISaveData, type ISaveRestoreHooks, type ISaveResult, type IRestoreResult, type ISerializedEvent, type ISerializedTurn, type IEngineState, type ISaveMetadata, type ISerializedParserState, type IPlatformEvent, type ISemanticEventSource, GameEventType, createGameInitializingEvent, createGameInitializedEvent, createGameStartingEvent, createGameStartedEvent, createGameEndingEvent, createGameEndedEvent, createGameWonEvent, createGameLostEvent, createGameQuitEvent, createGameAbortedEvent, createGameResumedEvent, createPcSwitchedEvent, getUntypedEventData, deriveStreamSeed, createSystemEvent, Subsystems } from '@sharpee/core';
import { EngineRandomService } from './session/engine-random-service.js';

import { PluginRegistry } from '@sharpee/plugins';
import { SceneEvaluationPlugin } from './plugins/scene-evaluation-plugin.js';
import { ActorTurnPlugin } from './plugins/actor-turn-plugin.js';


import {
  GameContext,
  TurnResult,
  CommandResult,
  EngineConfig,
  InputModeHandler,
  type GameEngineEvents
} from './types.js';
import { introspect as introspectEngine, type EngineIntrospection } from './introspection/introspect.js';
import { Story, type StoryEngine } from './install/story.js';
import type { NarrativeSettings } from './types.js';
import { buildNarrativeSettings } from './install/narrative/index.js';
import { runInstallSteps, STORY_INSTALL_STEPS, configureLanguageProviderNarrative } from './install/index.js';

import { CommandExecutor, createCommandExecutor, ParsedCommandTransformer, BeforeActionHookListener } from './command/command-executor.js';
import { SoundDispatcher } from './sound/index.js';
import { runTurnStages, TURN_STAGES, META_STAGES, wasRefused } from './turn/index.js';
import type { TurnEngine, TurnStageContext } from './turn/context.js';
import { adaptParser, type EngineParser } from './ports/parser-interface.js';
import { hasNarrativeSettings } from './ports/language-provider-interface.js';
import { VocabularyManager, createVocabularyManager } from './ports/vocabulary-manager.js';
import { SaveRestoreService, createSaveRestoreService, ISaveRestoreStateProvider } from './session/save-restore-service.js';
import type { PlatformOperationHost } from './turn/platform-dispatcher.js';
import { projectStoryInfo, findStoryInfoTrait } from './install/story-info-projection.js';


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
export const DEFAULT_TEXT_CAPABILITIES: ClientCapabilities = {
  text: true,
  images: false,
  animations: false,
  video: false,
  sound: false,
  music: false,
  speech: false,
  splitPane: false,
  statusBar: false,
  sidebar: false,
  clickableText: false,
  clickableImage: false,
  dragDrop: false,
  transitions: false,
  layers: false,
  customFonts: false,
  authorChannels: false,
};

/**
 * The subsystem the facade reports its own failures under. Not in
 * `Subsystems` (`@sharpee/core`), whose table names the pipeline stages;
 * promoting it there is a one-line change if a second reporter appears.
 */
const ENGINE_SUBSYSTEM = 'engine';

/**
 * The serializable shape of a caught error, for a system event's data.
 * Anything thrown that is not an `Error` is carried as its string form.
 */
function describeError(error: unknown): { message: string; stack?: string } {
  return error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) };
}

/**
 * The engine's lifecycle phase — what is true of the engine right now.
 *
 * Before ADR-345 this was carried by five independent proxies (`running`,
 * `story`, `_context`, `channelService`, `commandExecutor`), and six guards
 * asked about it through whichever field was nearest. Three of them asked
 * "is there a story?" and answered in three different sentences, and
 * `resume()` could not ask its question at all: `running === false` spans
 * both "installed, never started" and "started, then stopped", so it read a
 * collaborator (`channelService`) that happens to be created during `start()`.
 * A state machine whose states are not distinguishable by its own state
 * variables is being simulated rather than modeled.
 *
 * The names describe a condition, not an outcome, because every consumer is
 * a guard and a guard asks what it may do — never what happened (ADR-345 D11).
 *
 * The transitions are `empty → ready → playing ⇄ stopped`, with `resume` the
 * only back-edge. The set is closed: `restart` is engine *disposal*, not a
 * transition — the client builds a fresh engine and the old one ends at
 * `stopped` like any other ending (ADR-345 D10).
 *
 * Deliberately not exported. No consumer outside `GameEngine` needs to read
 * the phase (ADR-345 D7); what reaches outward is the optionality it
 * disproves, not the discriminant.
 */
type EnginePhase =
  | { name: 'empty' }
  | { name: 'ready'; story: Story; context: GameContext }
  | { name: 'playing'; story: Story; context: GameContext }
  | { name: 'stopped'; story: Story; context: GameContext };

/**
 * Main game engine
 */
export class GameEngine implements StoryEngine {
  private world: WorldModel;
  private sessionStartTime?: number;
  private sessionTurns: number = 0;
  private sessionMoves: number = 0;
  /**
   * The game context, constructed by `installStory` (ADR-344 D6 as amended).
   *
   * Undefined until a story is installed: the context cannot be complete
   * before a story supplies the player, and building it eagerly is what
   * forced every caller to fabricate a placeholder actor. Read through the
   * `context` getter below, which throws rather than handing back a context
   * with a made-up player.
   */
  /**
   * When this engine was constructed. Kept separate from the context so the
   * "started" timestamp still reflects construction rather than install.
   */
  private readonly startedAt: Date = new Date();

  /**
   * The single source of truth for the engine's lifecycle (ADR-345 D1).
   *
   * Replaces `running`, `story`, `_context` and the two collaborator proxies
   * as the way lifecycle is *read*. Written only by `installStory`, `start`,
   * `stop` and `resume`.
   */
  private phase: EnginePhase = { name: 'empty' };

  /**
   * The game context, narrowed out of the phase rather than null-checked.
   *
   * Every phase but `empty` carries one, so readers in those phases get it
   * without a guard of their own; the throw survives only as the `empty`-phase
   * refusal (ADR-345 D3).
   *
   * @throws Error when the engine is in the `empty` phase (no story installed).
   */
  private get context(): GameContext {
    if (this.phase.name === 'empty') {
      throw new Error(
        'No story installed: the game context does not exist until installStory() has run.'
      );
    }
    return this.phase.context;
  }

  /**
   * The installed story, or `undefined` in the `empty` phase.
   *
   * A derived read, not a guard: the lifecycle questions are asked of
   * `this.phase` directly. Kept so the several non-guard `this.story?.…`
   * readers below need no rewrite.
   */
  private get story(): Story | undefined {
    return this.phase.name === 'empty' ? undefined : this.phase.story;
  }

  /**
   * The context when one exists, `undefined` in the `empty` phase.
   *
   * The one legitimate "there may be no context" read in the class, for
   * `emitGameEvent`'s turn bucketing — install steps emit before the context
   * exists. Distinct from the dead optionality ADR-345 D7 removes elsewhere;
   * see the comment at its single call site.
   */
  private get contextIfInstalled(): GameContext | undefined {
    return this.phase.name === 'empty' ? undefined : this.phase.context;
  }

  /**
   * The refusal a lifecycle method throws when the engine is in a phase it
   * does not accept (ADR-345 D2).
   *
   * One shape for all four methods, so a caller reading any of them learns
   * the same two things: what was attempted, and what phase the engine was
   * actually in. Before this, three guards asked "is there a story?" through
   * three different fields and answered in three different sentences.
   *
   * @param attempted - The method that refused, written as a call (`'start()'`).
   * @param accepted - The phase or phases it accepts, quoted (`"'ready'"`).
   * @param hint - Optional remedy or detail appended to the message.
   * @returns The Error to throw — never thrown here, so the call site reads
   *          as a `throw` and control flow stays obvious.
   */
  /**
   * The installed story, for readers that only run once one exists.
   *
   * The turn-facing surface and the save provider are both reachable only
   * from a phase that carries a story, so they get a `Story` rather than a
   * `Story | undefined` they would have to re-check (ADR-345 D7). Distinct
   * from the public `getStory()`, which stays optional because callers may
   * ask an `empty` engine — and because a failed install must be observable
   * as "no story adopted" (ADR-344).
   *
   * @throws Error when the engine is in the `empty` phase.
   */
  private get storyForTurn(): Story {
    if (this.phase.name === 'empty') {
      throw new Error(
        'No story installed: the turn-facing surface does not exist until installStory() has run.'
      );
    }
    return this.phase.story;
  }

  /**
   * The channel-I/O producer, for readers that only run during a turn.
   *
   * `start()` constructs it before the phase becomes `playing`, and turns run
   * only in `playing`, so a turn-facing reader always has one (ADR-345 D7).
   * This replaces `emitChannelPacket`'s `if (!channelService) return;`, which
   * silently dropped a turn's entire packet — the same silent-wrongness shape
   * as the bridges' `?? 0`.
   *
   * @throws Error when `start()` has not run.
   */
  private get channelServiceForTurn(): ChannelService {
    if (!this.channelService) {
      throw new Error(
        'No channel service: it is constructed by start(), and turns run only after it.'
      );
    }
    return this.channelService;
  }

  /**
   * The engine as the save/restore service sees it (ADR-345 D7).
   *
   * A narrow adapter rather than passing `this`, for one reason: the
   * interface's `getStory()` can honestly promise a `Story` because saving
   * and restoring happen during a turn, while the engine's own public
   * `getStory()` must stay optional. Same pattern as `turnEngine()` below.
   *
   * @returns A provider bound to this engine's live state.
   */
  private saveProvider(): ISaveRestoreStateProvider {
    return {
      getWorld: () => this.getWorld(),
      getContext: () => this.getContext(),
      getStory: () => this.storyForTurn,
      getEventSource: () => this.getEventSource(),
      getPluginRegistry: () => this.getPluginRegistry(),
      getParser: () => this.getParser(),
      getRandomService: () => this.getRandomService(),
    };
  }

  private wrongPhase(attempted: string, accepted: string, hint?: string): Error {
    const detail = hint ? ` ${hint}` : '';
    return new Error(
      `Cannot ${attempted}: the engine is in the '${this.phase.name}' phase, and ${attempted} requires ${accepted}.${detail}`
    );
  }
  private config: EngineConfig;
  private commandExecutor: CommandExecutor;
  private eventProcessor: EventProcessor;
  private platformEvents: ISemanticEventSource;
  private actionRegistry: StandardActionRegistry;
  private textService: IProsePipeline;
  private turnEvents = new Map<number, ISemanticEvent[]>();
  // `running` and `story` are gone: both were proxies for the lifecycle
  // phase, and both are now read off `this.phase` (ADR-345 D1). `story`
  // survives as a derived getter above for its non-guard readers.
  private languageProvider: LanguageProvider;
  private parser: Parser;
  /** The parser as the engine calls it: every engine-facing method present (`adaptParser`). */
  private readonly engineParser: EngineParser;
  private eventListeners = new Map<GameEngineEventName, Set<(...args: any[]) => void>>();
  /** Accumulated across every `registerSaveRestoreHooks` call, hence Partial. */
  private saveRestoreHooks?: Partial<ISaveRestoreHooks>;
  private eventSource = createSemanticEventSource();
  private systemEventSource: IGenericEventSource<ISystemEvent>;
  /**
   * Set while a `listener_error` report is being delivered. The report
   * goes out through `emit('event')`, so a listener that throws on every
   * event would otherwise recurse without end (see `reportListenerError`).
   */
  private reportingListenerError = false;
  private pendingPlatformOps: IPlatformEvent[] = [];
  /**
   * Sequence for platform event ids — `platform_<clock>_<n>`, the same
   * shape `@sharpee/core` gives system events. A counter, not a random
   * draw: ids are never rendered, and a draw would move every stream
   * behind it.
   */
  private platformEventSequence = 0;

  /**
   * The incomplete command a clarification question is holding open (GH
   * #318, ADR-225 as amended): consumed by the very next input, answer or
   * not. Never serialized — a restore starts with no question pending.
   */
  private heldCommand?: { input: string };
  private perceptionService?: IPerceptionService;
  private pluginRegistry: PluginRegistry;
  private actorTurnPlugin!: ActorTurnPlugin;

  /**
   * Per-turn sound buffer (ADR-172 Phase 6). Cleared at the start of every
   * `executeTurn()`; populated as actions call `context.emitSound`;
   * dispatched once after the plugin tick by `soundDispatcher.dispatch`.
   * Engine-internal — never serialized into save/restore snapshots
   * because sounds do not survive turn boundaries.
   */
  private soundBuffer: ISound[] = [];

  /**
   * Per-turn sound dispatcher (ADR-172 Phase 6). Stateless — owns no
   * per-turn data; the buffer is passed in. Held as a field to leave
   * room for future extension seams (e.g., custom propagate injection
   * via `setSoundDispatcher` in tests).
   */
  private soundDispatcher: SoundDispatcher = new SoundDispatcher();
  /**
   * Master seed for the session (ADR-293 D1). Resolved once in the
   * constructor — `config.seed` when injected, else the clock, read
   * exactly once. Every engine stream derives from it.
   */
  private masterSeed: number;
  /**
   * Per-point stream owner (ADR-293 D5/D7) — the engine's sole
   * `RandomService` instance. Exposed through the save provider so the
   * `{ pointName → streamState }` map rides every save. Draw surfaces
   * move onto it across ADR-293 Phase A.
   */
  private randomService: EngineRandomService;
  private narrativeSettings: NarrativeSettings;

  // Alternate input mode handlers (ADR-137)
  private inputModeHandlers = new Map<string, InputModeHandler>();

  private vocabularyManager: VocabularyManager;
  private saveRestoreService: SaveRestoreService;

  /** `game.initialized` is emitted once per engine, on the first `start()`. */
  private hasEmittedInitialized = false;

  /**
   * Channel-I/O service (ADR-163 §13, §14). Constructed in `start()`
   * once `Story.registerChannels?` has populated the registry and the
   * client capabilities are known. Optional — engines started without
   * a `capabilities` argument default to a text-only profile.
   */
  private channelService?: ChannelService;
  /**
   * Negotiated client capabilities for this session. Populated by
   * `start({ capabilities })`; defaults to text-only when omitted.
   */
  private clientCapabilities?: ClientCapabilities;

  constructor(options: {
    world: WorldModel;
    parser: Parser;
    language: LanguageProvider;
    perceptionService?: IPerceptionService;
    config?: EngineConfig;
  }) {
    this.world = options.world;
    this.perceptionService = options.perceptionService;

    // Register essential engine capabilities (stories can register additional ones)
    // Command history is required for the AGAIN command to function
    this.world.registerCapability(StandardCapabilities.COMMAND_HISTORY, {
      schema: CommandHistoryCapabilitySchema
    });
    // ADR-196: persistent text-state store backing deterministic `Choice` variation.
    // Free-form `{ [entityId]: { [messageKey]: number } }` map (no per-field schema —
    // the keys are dynamic entity ids). Serializes with the world for save/restore.
    this.world.registerCapability(StandardCapabilities.TEXT_STATE, {
      initialData: {}
    });
    this.config = {
      maxHistory: 100,
      validateEvents: true,
      collectTiming: false,
      maxUndoSnapshots: 10,
      ...options.config
    };

    // The context is NOT built here — `installStory` constructs it once the
    // story has supplied the player (ADR-344 D6 as amended).

    // Create action registry and register standard actions
    this.actionRegistry = new StandardActionRegistry();
    for (const action of standardActions) {
      this.actionRegistry.register(action);
    }

    // Create subsystems
    this.eventProcessor = new EventProcessor(this.world);

    // Wire WorldModel event handlers to EventProcessor (ADR-086)
    // This ensures handlers registered via world.registerEventHandler() are invoked
    const wiring: IEventProcessorWiring = {
      registerHandler: (eventType, handler) => {
        this.eventProcessor.registerHandler(eventType, (event, _query) => {
          // The adapted handler doesn't need WorldQuery, it captures world in closure
          // Cast to Effect[] since wiring handler returns unknown[] (to avoid circular deps)
          return handler(event) as Effect[];
        });
      }
    };
    this.world.connectEventProcessor(wiring);

    // Register standard event chains (ADR-094)
    // Must happen after EventProcessor is connected so chains are wired
    registerStandardChains(this.world);

    this.platformEvents = createSemanticEventSource();

    // Initialize system event source for debug/validation events
    this.systemEventSource = createGenericEventSource<ISystemEvent>();

    // Route system events to the engine's event emitter
    this.systemEventSource.subscribe((event: ISystemEvent) => {
      this.emit('event', {
        id: event.id,
        type: `system.${event.type}`,
        timestamp: event.timestamp,
        entities: {},
        data: event.data
      });
    });

    this.pluginRegistry = new PluginRegistry();
    this.pluginRegistry.register(new SceneEvaluationPlugin());
    // ADR-293 D1: one master seed governs the session. The clock is read
    // exactly once, and only when no seed was injected.
    this.masterSeed = this.config.seed ?? Date.now();
    this.randomService = new EngineRandomService(this.masterSeed);
    this.narrativeSettings = buildNarrativeSettings(); // Default: 2nd person

    this.vocabularyManager = createVocabularyManager();
    this.saveRestoreService = createSaveRestoreService({
      maxSnapshots: this.config.maxUndoSnapshots ?? 10
    });

    // Set provided dependencies
    this.languageProvider = options.language;
    this.parser = options.parser;
    this.engineParser = adaptParser(options.parser);
    this.textService = new ProsePipeline(this.languageProvider, this.world);
    
    // Update action registry with language provider
    this.actionRegistry.setLanguageProvider(this.languageProvider);
    
    // Wire the parser's debug events into the platform event source
    this.engineParser.setPlatformEventEmitter((event) => {
      this.platformEvents.addEvent(event);
    });
    
    // Create command executor with dependencies
    this.commandExecutor = createCommandExecutor(
      this.world,
      this.actionRegistry,
      this.eventProcessor,
      this.engineParser,
      this.systemEventSource,
      this.randomService
    );

    // ADR-328 D5: the engine owns the actor turn phase. Its execution entry
    // is this executor, curried over the live world and turn context, so a
    // behavior's chosen act runs the same four phases a typed command does.
    this.actorTurnPlugin = new ActorTurnPlugin((actorId, actionId, slots) => this.executeAsActor(actorId, actionId, slots));
    this.pluginRegistry.register(this.actorTurnPlugin);

    // ADR-224: auto-register the deadly-room death transformer so every story
    // (TS or Chord) gets the deadly-room verb-allowlist / probabilistic hazard for
    // free — no story wiring needed. It early-returns when the player's room has no
    // DeadlyRoomTrait, and draws the `chance` variant on its declared point
    // (ADR-293).
    this.commandExecutor.registerParsedCommandTransformer(
      createDeadlyRoomTransformer(this.randomService),
    );

    // Query handling is now managed by the platform layer
    // Platform owns the QueryManager and handles all queries

    // `game.initialized` is emitted from `start()`, not here: a listener
    // subscribes after construction, so an event emitted now has no audience.
  }

  /**
   * Install a story into this engine: run `STORY_INSTALL_STEPS` over the
   * engine's collaborators, adopt what they produce, then hand the story
   * the live engine.
   *
   * An engine installs exactly one story, before it starts. A call after
   * `start()`, or a second call, throws naming the field that refuses it —
   * the same engine cannot be reinstalled; `bootstrap` boots a fresh one
   * per playthrough (ADR-248). A step that throws (a config or world
   * validation failure) leaves the engine with nothing adopted.
   *
   * @param story - The story to install
   * @throws Error when the engine is running or a story is already installed; whatever a step throws
   */
  installStory(story: Story): void {
    // One guard, so there is no order to get wrong (ADR-345 D2). The two
    // guards this replaces had a load-bearing order — `running` before
    // `story`, because a running engine always carries one — and getting it
    // backwards silently made the second unreachable. That question does not
    // exist once the phase is a single field.
    //
    // This also pins ADR-345 D10: `installStory` on a `stopped` engine
    // refuses, so there is no back-edge to `empty` and no re-installation.
    if (this.phase.name !== 'empty') {
      throw this.wrongPhase(
        'installStory()',
        "'empty'",
        `An engine installs exactly one story (installed: '${this.phase.story.config.id}').`
      );
    }

    const installed = runInstallSteps({
      story,
      world: this.world,
      parser: this.parser,
      languageProvider: this.languageProvider,
      actionRegistry: this.actionRegistry,
      emitGameEvent: (event) => this.emitGameEvent(event),
      draft: {}
    }, STORY_INSTALL_STEPS);

    this.narrativeSettings = installed.narrativeSettings;
    // The context is constructed here, not patched: it cannot be complete
    // before the story supplies the player (ADR-344 D6 as amended). Story
    // and context enter the phase together — they were always one fact, and
    // storing them in two fields is what let `start()` reach for the context
    // to report a *story* problem (ADR-345 D1).
    this.phase = {
      name: 'ready',
      story: installed.story,
      context: {
        currentTurn: 1,  // Start at 1 per test expectations
        player: installed.player,
        history: [],
        metadata: {
          title: installed.metadata.title,
          author: installed.metadata.author,
          version: installed.metadata.version,
          started: this.startedAt,
          lastPlayed: new Date()
        },
        implicitActions: installed.implicitActions
      }
    };

    // The one playthrough-side call in the sequence: the story sees an
    // engine that has finished installing, and registers command
    // transformers and other hooks on it.
    story.onEngineReady?.(this);
  }


  /**
   * Get the current parser
   */
  getParser(): Parser {
    return this.parser;
  }

  /**
   * Get the current language provider
   */
  getLanguageProvider(): LanguageProvider {
    return this.languageProvider;
  }

  /**
   * Returns a serializable snapshot of the engine's internal state for
   * tooling (VS Code extension, CLI --world-json). The engine owns the
   * serialization — callers consume the plain data shape.
   *
   * @returns EngineIntrospection with actions, patterns, and metadata
   */
  introspect(): EngineIntrospection {
    return introspectEngine(this.world, this.actionRegistry, this.languageProvider);
  }

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
  start(options?: { capabilities?: ClientCapabilities }): void {
    // A story is required to start (ADR-344 D6a, as realized by ADR-345 D4):
    // an engine with no story has no player, no world content and nothing to
    // render. That requirement is no longer a bespoke `!this._context` check
    // with its own sentence — it is the statement that `start()` accepts
    // `ready`, which also subsumes the old "already running" guard.
    if (this.phase.name !== 'ready') {
      throw this.wrongPhase(
        'start()',
        "'ready'",
        this.phase.name === 'empty' ? 'Call installStory() first.' : undefined
      );
    }
    const ready = this.phase;

    // Channel-I/O bootstrap (ADR-163 §13, §14):
    //  1. Refresh `storyInfo` from `StoryInfoTrait` — pulls in the
    //     build-pipeline metadata (engineVersion / clientVersion /
    //     buildDate) that may have been patched onto the trait
    //     between `installStory()` and here (e.g., `BrowserClient.start()`
    //     sets clientVersion just before calling `engine.start()`).
    //  2. Story registers / overrides channels on the shared registry.
    //  3. Engine constructs a fresh ChannelService bound to the
    //     negotiated capabilities.
    //  4. Manifest fires before the first turn — bootstrap-order
    //     invariant from §11.
    // Both take the story from the narrowed phase rather than re-checking a
    // field: `start()` accepts only `ready`, so a story is guaranteed here.
    // The `if (!this.story) return;` these used to carry was dead defence of
    // exactly the kind ADR-345 D3 removes.
    this.refreshStoryInfoCapability(ready.story);
    this.resolvePrologue();
    this.clientCapabilities = options?.capabilities ?? DEFAULT_TEXT_CAPABILITIES;

    // ADR-293 (re-cut Phase 3): hand every plugin its session seed before
    // the first turn. Each plugin gets its own name-derived seed, so plugin
    // streams are independent of each other and of the engine streams.
    // Story-registered plugins (scheduler, NPC, state-machine) are all in
    // the registry by now — stories register during installStory().
    for (const plugin of this.pluginRegistry.getAll()) {
      plugin.onSessionSeed?.(
        deriveStreamSeed(this.masterSeed, `plugin.${plugin.id}`)
      );
    }

    this.story?.registerChannels?.(channelRegistry);
    this.channelService = new ChannelService(channelRegistry, this.clientCapabilities);
    this.emit('channel:manifest', this.channelService.buildManifest());

    // Emit initialized event once, on the first start() (see the constructor)
    if (!this.hasEmittedInitialized) {
      const initializedEvent = createGameInitializedEvent();
      this.emitGameEvent(initializedEvent);
      this.hasEmittedInitialized = true;
    }

    // Emit game starting event
    const startingEvent = createGameStartingEvent({
      id: this.story?.config.id,
      title: this.context.metadata.title,
      author: this.context.metadata.author,
      version: this.context.metadata.version
    });
    this.emitGameEvent(startingEvent);

    this.phase = { name: 'playing', story: ready.story, context: ready.context };
    this.sessionStartTime = Date.now();
    this.sessionTurns = 0;
    this.sessionMoves = 0;
    // Keep currentTurn as is (already 1 from constructor)

    // Get version info from StoryInfoTrait
    const storyInfoEntities = this.world.findByTrait(TraitType.STORY_INFO);
    const storyInfoTrait = storyInfoEntities[0]?.get(StoryInfoTrait);
    const engineVersion = storyInfoTrait?.engineVersion;
    const clientVersion = storyInfoTrait?.clientVersion;

    // Emit game started event
    const cfg = this.story?.config;
    const startedEvent = createGameStartedEvent({
      id: cfg?.id,
      title: this.context.metadata.title,
      author: this.context.metadata.author,
      version: this.context.metadata.version,
      buildDate: cfg?.buildDate,
      description: cfg?.description,
      credits: cfg?.credits,
    }, this.sessionStartTime, engineVersion, clientVersion);
    this.emitGameEvent(startedEvent);

    this.emit('state:changed', this.context);
  }

  /**
   * Re-project the `storyInfo` capability from the story's config and the
   * current `StoryInfoTrait`. Called once during `start()`, before the
   * `ChannelService` is constructed, so `infoChannel` / `ifidChannel` see
   * the build-pipeline values (`engineVersion`, `clientVersion`,
   * `buildDate`) a consumer patched onto the trait after `installStory()`.
   * The same precedence rule as at load: an authored field the config set
   * is not overwritten by the trait here.
   */
  private refreshStoryInfoCapability(story: Story): void {
    this.world.updateCapability(
      'storyInfo',
      projectStoryInfo(story.config, findStoryInfoTrait(this.world)),
    );
  }

  /**
   * Resolve `StoryConfig.prologue` (ADR-298 D3) into the `storyInfo`
   * capability, once at story start, before the `ChannelService` is
   * constructed — stdlib's `prologueChannel` projects the resolved text.
   * A literal (or plain string) is itself; a `phrase-ref` renders through
   * the prose pipeline's phrase machinery, so variants (cycling, randomly,
   * first-time) resolve per their normal semantics. Absent or unresolvable
   * values write nothing (sparse-suppress — the channel skips emission).
   */
  private resolvePrologue(): void {
    const prologue = this.story?.config.prologue;
    if (!prologue) return;
    const text =
      typeof prologue === 'string'
        ? prologue
        : prologue.kind === 'literal'
          ? prologue.value
          : (this.textService.renderPhraseText?.(prologue.value) ?? '');
    if (text) {
      this.world.updateCapability('storyInfo', { prologue: text });
    }
  }

  /**
   * Resume a stopped engine without touching world state.
   *
   * The post-mortem revival seam: after `stop('defeat')`, a harness (or a
   * story resurrection policy) that has restored the world to a live-player
   * snapshot — e.g. the transcript-tester's RETRY block via
   * `world.loadJSON()` — needs turn execution back without any world
   * teardown (a full reboot would clear the world it just restored).
   * Returns the phase to `playing` and emits `game.resumed`; rebuilds nothing.
   *
   * No-op when already playing. Throws if the engine was never started —
   * resuming presumes a completed `start()`.
   *
   * @throws when the phase is `empty` or `ready`, naming the phase it found
   */
  resume(): void {
    // Tolerant of `playing`, like `stop` is tolerant of everything else
    // (ADR-345 D8a). `branch-tester`'s tree walker calls this on every test
    // line — `tree-walker.ts:360`, "Harmless when the engine is running" —
    // because a line's prefix may or may not have ended the game. Making
    // this strict would throw on every non-death line of every tree.
    if (this.phase.name === 'playing') {
      return;
    }
    // This is the method that motivated ADR-345. It used to check
    // `this.channelService` — a collaborator, not a state flag — because
    // `running === false` spanned both "installed, never started" and
    // "started, then stopped" and the boolean pair could not tell them
    // apart. The phase can.
    if (this.phase.name !== 'stopped') {
      throw this.wrongPhase(
        'resume()',
        "'stopped'",
        'An engine must have been started before it can resume.'
      );
    }
    this.phase = { name: 'playing', story: this.phase.story, context: this.phase.context };

    // Every sibling transition emits; this one did not, which is what ADR-345
    // D12 fixes. Emitted after the flip, like `stop()`'s terminal events
    // (`game.ended` and the reason-specific ones), so a subscriber that reads
    // the engine on receipt sees the phase the event announces. The event
    // renders no prose (D14) — its payload carries no `message`, `text` or
    // `messageId`, and no template is registered under `game.resumed`.
    this.emitGameEvent(createGameResumedEvent());
  }

  /**
   * Stop the game engine
   */
  stop(reason?: 'quit' | 'victory' | 'defeat' | 'abort' | 'restart', details?: any): void {
    // Deliberately tolerant, not strict (ADR-345 D8). `BrowserClient
    // .disposeAndReboot` calls `stop('restart')` unconditionally and relies
    // on the no-op — menu-path restarts have no turn in flight, so the
    // engine never stopped itself. Do not "finish the job" by making this
    // match its siblings.
    if (this.phase.name !== 'playing') {
      return;
    }
    const playing = this.phase;

    // One session record, one clock read: the ending event and the
    // reason-specific end event describe the same session.
    const session = {
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      turns: this.sessionTurns,
      moves: this.sessionMoves
    };

    const endingEvent = createGameEndingEvent(reason || 'quit', session);
    this.emitGameEvent(endingEvent);
    
    // The reason is not stored on the phase: it is already the payload of
    // the events emitted here, and one fact in two places is the defect
    // ADR-345 was written about (D9).
    this.phase = { name: 'stopped', story: playing.story, context: playing.context };

    // Emit specific end event based on reason
    if (reason === 'victory') {
      const wonEvent = createGameWonEvent(session, details);
      this.emitGameEvent(wonEvent);
    } else if (reason === 'defeat') {
      const lostEvent = createGameLostEvent(details?.reason || 'Game over', session);
      this.emitGameEvent(lostEvent);
    } else if (reason === 'quit') {
      const quitEvent = createGameQuitEvent(session);
      this.emitGameEvent(quitEvent);
    } else if (reason === 'abort') {
      const abortedEvent = createGameAbortedEvent(details?.error || 'Game aborted', session);
      this.emitGameEvent(abortedEvent);
    }
    
    // Final game ended event
    const endedEvent = createGameEndedEvent(reason || 'quit', session, details);
    this.emitGameEvent(endedEvent);
    
    // Emit game:over for any ending
    this.emit('game:over', this.context);
  }

  /**
   * Build the restart acknowledgment event (ADR-248).
   *
   * On confirmed restart the engine does NOT rebuild in place — it renders
   * this acknowledgment ("The story restarts.") in the final packet, then
   * stops with reason 'restart'; the client owns the reboot via its own
   * boot path. No pre-emptive restart_completed(true) is emitted: the new
   * boot's opening banner is the success signal.
   */
  private createRestartAckEvent(): ISemanticEvent {
    return {
      id: `restart_ack_${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      data: { messageId: 'if.action.restarting.game_restarting' },
      entities: {}
    };
  }

  /**
   * Execute a turn
   */
  async executeTurn(input: string): Promise<TurnResult> {
    // Two guards collapse into one (ADR-345 D2). The pair asked the same
    // question twice — `!this.running`, then `!this.commandExecutor` as a
    // stand-in for "is there a story?" — and answered in two sentences.
    if (this.phase.name !== 'playing') {
      throw this.wrongPhase(
        'executeTurn()',
        "'playing'",
        this.phase.name === 'stopped' ? 'The game has ended; call resume() to continue.' : undefined
      );
    }

    const context: TurnStageContext = {
      engine: this.turnEngine(),
      input,
      turn: this.context.currentTurn,
      started: false,
      semanticEvents: [],
      events: []
    };
    return runTurnStages(context, TURN_STAGES, META_STAGES);
  }

  /**
   * The facade's turn-facing surface (ADR-334 D5): what the stages under
   * `turn/` may reach. Getters read the live fields — the parser, text
   * service, and executor are set by `installStory`; the pending platform
   * list is replaced when drained.
   */
  private turnEngine(): TurnEngine {
    const engine = this;
    return {
      get world() { return engine.world; },
      get context() { return engine.context; },
      get story() { return engine.storyForTurn; },
      get config() { return engine.config; },
      get parser() { return engine.engineParser; },
      get commandExecutor() { return engine.commandExecutor; },
      get actionRegistry() { return engine.actionRegistry; },
      get randomService() { return engine.randomService; },
      get pluginRegistry() { return engine.pluginRegistry; },
      get textService() { return engine.textService; },
      get languageProvider() { return engine.languageProvider; },
      get saveRestoreService() { return engine.saveRestoreService; },
      get channelService() { return engine.channelServiceForTurn; },
      get perceptionService() { return engine.perceptionService; },
      get eventSource() { return engine.eventSource; },
      turnEventsOf: (turn) => {
        let events = engine.turnEvents.get(turn);
        if (!events) {
          events = [];
          engine.turnEvents.set(turn, events);
        }
        return events;
      },
      storeTurnEvents: (turn, events) => {
        let stored = engine.turnEvents.get(turn);
        if (!stored) {
          stored = [];
          engine.turnEvents.set(turn, stored);
        }
        stored.push(...events);
      },
      clearTurnEvents: (turn) => { engine.turnEvents.set(turn, []); },
      get pendingPlatformOps() { return engine.pendingPlatformOps; },
      get soundBuffer() { return engine.soundBuffer; },
      get soundDispatcher() { return engine.soundDispatcher; },
      get inputModeHandlers() { return engine.inputModeHandlers; },
      emit: (event, ...args) => this.emit(event, ...args),
      emitGameEvent: (event) => this.emitGameEvent(event),
      updateScopeVocabulary: () => this.updateScopeVocabulary(),
      switchPlayer: (entityId) => this.switchPlayer(entityId),
      executeTurn: (input) => this.executeTurn(input),
      holdCommand: (input) => { this.heldCommand = { input }; },
      takeHeldCommand: () => {
        const held = this.heldCommand;
        this.heldCommand = undefined;
        return held?.input;
      },
      countSessionTurn: (success) => {
        this.sessionTurns++;
        if (success) {
          this.sessionMoves++;
        }
      },
      platformOperationHost: () => this.platformOperationHost(),
      queuePlatformOperation: (operation) => { this.pendingPlatformOps.push(operation); },
      drainPendingPlatformOperations: () => {
        const drained = this.pendingPlatformOps;
        this.pendingPlatformOps = [];
        return drained;
      },
      stop: (reason, details) => this.stop(reason, details)
    };
  }

  /**
   * Get current game context
   */
  getContext(): GameContext {
    return { ...this.context };
  }

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
  switchPlayer(entityId: string): void {
    const newPlayer = this.world.getEntity(entityId);
    if (!newPlayer) {
      throw new Error(`Cannot switch player: entity '${entityId}' not found`);
    }

    const newActorTrait = newPlayer.get<ActorTrait>(TraitType.ACTOR);
    if (!newActorTrait) {
      throw new Error(`Cannot switch player: entity '${entityId}' does not have ActorTrait`);
    }

    if (!newActorTrait.isPlayable) {
      throw new Error(`Cannot switch player: entity '${entityId}' is not playable`);
    }

    const oldPlayer = this.context.player;
    if (oldPlayer.id === entityId) {
      return;
    }

    // Clear old PC's flag
    const oldActorTrait = oldPlayer.get<ActorTrait>(TraitType.ACTOR);
    if (oldActorTrait) {
      oldActorTrait.isPlayer = false;
    }

    // Set new PC's flag
    newActorTrait.isPlayer = true;

    // ADR-327 Q2 (ruled 2026-08-26): `me`/`myself`/`self` name whoever is
    // being played, not a character, so they move with the role. They live on
    // the entity's IdentityTrait, which `syncPlayerState` does not touch —
    // without this, `x me` keeps naming the old PC after every switch.
    movePlayerRoleVocabulary(oldPlayer, newPlayer);

    // Update WorldModel canonical reference
    this.world.setPlayer(entityId);

    // Sync all derived state
    this.syncPlayerState(entityId);

    // Emit events
    this.emitGameEvent(createPcSwitchedEvent(oldPlayer.id, entityId));
    this.emit('state:changed', this.context);
  }

  /**
   * Get world model
   */
  getWorld(): WorldModel {
    return this.world;
  }

  /**
   * Get the current story
   */
  getStory(): Story | undefined {
    return this.story;
  }

  /**
   * Get the event source for save/restore
   */
  getEventSource(): ISemanticEventSource {
    return this.eventSource;
  }

  /**
   * Get narrative settings (ADR-089)
   *
   * Returns the story's narrative perspective and related settings.
   * Use this for text rendering that needs to know 1st/2nd/3rd person.
   */
  getNarrativeSettings(): NarrativeSettings {
    return this.narrativeSettings;
  }

  /**
   * Synchronize all derived player state after a player identity change (ADR-132).
   *
   * Updates GameContext.player, parser world context, pronoun context,
   * scope vocabulary, and narrative settings. WorldModel.playerId and
   * ActorTrait.isPlayer must already be set before calling this.
   */
  private syncPlayerState(newPlayerId: string): void {
    const newPlayer = this.world.getEntity(newPlayerId);
    if (!newPlayer) {
      throw new Error(`Cannot sync player state: entity '${newPlayerId}' not found`);
    }

    this.context.player = newPlayer;

    const playerLocation = this.world.getLocation(newPlayerId) || '';
    this.engineParser.setWorldContext(this.world, newPlayerId, playerLocation);
    this.engineParser.resetPronounContext();

    this.updateScopeVocabulary();
    configureLanguageProviderNarrative(this.languageProvider, this.narrativeSettings, newPlayer);
  }

  /**
   * Get plugin registry for registering turn-cycle plugins (ADR-120)
   */
  getPluginRegistry(): PluginRegistry {
    return this.pluginRegistry;
  }

  /**
   * The NPC decision layer (ADR-328 D5): where a story registers the
   * behaviors and tick phases the engine's actor turn phase drives.
   */
  getNpcService(): INpcService {
    return this.actorTurnPlugin.getNpcService();
  }

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
  executeAsActor(actorId: string, actionId: string, slots?: ActSlots): ActResult {
    const result = this.commandExecutor.executeAsActor(
      { actionId, actorId, ...slots },
      this.world,
      this.context,
      this.config,
      this.soundBuffer,
    );
    return { success: result.success && !result.refused && !wasRefused(result.events), events: result.events };
  }

  /**
   * The negotiated client capabilities for this session (ADR-216): the
   * `client has <capability>` predicate reads these live, and channel
   * gating uses the same flags at manifest time. Text-only before
   * `start({ capabilities })` runs or when none were negotiated.
   */
  getClientCapabilities(): ClientCapabilities {
    return this.clientCapabilities ?? DEFAULT_TEXT_CAPABILITIES;
  }

  /**
   * The session's master seed (ADR-293 D1/D14). Every run reports it —
   * test output, `--play` startup, failure reports — so one number plus
   * a command list reproduces the session.
   */
  getMasterSeed(): number {
    return this.masterSeed;
  }

  /**
   * The engine's per-point stream owner (ADR-293 D5). Part of the
   * ISaveRestoreStateProvider contract — the save service persists its
   * `{ pointName → streamState }` map and restores it through the
   * version reader.
   */
  getRandomService(): EngineRandomService {
    return this.randomService;
  }

  /**
   * Enable or disable the per-draw random trace (ADR-293 D16). While enabled,
   * every firing — drawn or forced — emits an `ISystemEvent` on the system
   * event channel (`subsystem: Subsystems.RANDOM`, `type: 'draw'`,
   * `severity: 'debug'`, data: `IRandomTraceData`). Off by default; opted into
   * by the transcript runner, `--play`, and the IDE — a published game emits
   * none (AC-14).
   */
  setRandomTraceEnabled(enabled: boolean): void {
    this.randomService.setTraceSink(
      enabled
        ? (record) =>
            this.systemEventSource.emit(
              createSystemEvent(Subsystems.RANDOM, 'draw', record, {
                severity: 'debug'
              })
            )
        : undefined
    );
  }

  /**
   * Get event processor for handler registration (ADR-075)
   */
  getEventProcessor(): EventProcessor {
    return this.eventProcessor;
  }

  /**
   * Register an alternate input mode handler (ADR-137).
   *
   * Stories call this at init time. The handler is invoked when the
   * world state key `if.inputMode` matches the registered ID.
   *
   * @param id Mode identifier (e.g., 'dungeo.mode.gdt')
   * @param handler The input mode handler
   */
  registerInputMode(id: string, handler: InputModeHandler): void {
    this.inputModeHandlers.set(id, handler);
  }

  /**
   * Get the text service
   */
  getTextService(): IProsePipeline {
    return this.textService;
  }

  /**
   * Set a custom text service
   */
  setTextService(service: IProsePipeline): void {
    this.textService = service;
  }

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
  registerSlotContributor(contributor: SlotContributor): void {
    this.textService.registerSlotContributor(contributor);
  }

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
  registerSlotEntry(entry: SlotEntry): void {
    this.textService.registerSlotEntry(entry);
  }

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
  registerSaveRestoreHooks(hooks: Partial<ISaveRestoreHooks>): void {
    this.saveRestoreHooks = { ...this.saveRestoreHooks, ...hooks };
  }

  /**
   * Get currently registered save/restore hooks.
   *
   * Partial because registration is (see above): what comes back is the
   * accumulation of every registration so far, which need not carry all four.
   */
  getSaveRestoreHooks(): Partial<ISaveRestoreHooks> | undefined {
    return this.saveRestoreHooks;
  }

  /**
   * Register a transformer for parsed commands.
   * Transformers are called after parsing but before validation,
   * allowing stories to modify commands (e.g., for debug tools).
   *
   * @param transformer - Function to transform parsed commands
   */
  registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void {
    this.commandExecutor.registerParsedCommandTransformer(transformer);
  }

  /**
   * Unregister a parsed command transformer.
   *
   * @param transformer - The transformer to remove
   * @returns true if the transformer was found and removed
   */
  unregisterParsedCommandTransformer(transformer: ParsedCommandTransformer): boolean {
    return this.commandExecutor.unregisterParsedCommandTransformer(transformer);
  }

  /**
   * Register a pre-action hook listener (ADR-148).
   *
   * Listeners fire after command context creation but before the action's
   * validate phase. They can modify world state (e.g., break concealment
   * before a noisy action executes).
   *
   * @param listener - The hook listener
   */
  onBeforeAction(listener: BeforeActionHookListener): void {
    this.commandExecutor.onBeforeAction(listener);
  }

  /**
   * Save game state using registered hooks
   */
  async save(): Promise<boolean> {
    // Guarded on the hook this needs, not merely on some hooks existing:
    // registration is partial (#229), so a client that registered only
    // `onRestartRequested` leaves this one absent. Calling it would throw a
    // TypeError into the catch below and report as "Save failed"; saying
    // "no save capability" is the honest answer.
    if (!this.saveRestoreHooks?.onSaveRequested) {
      return false; // No save capability
    }

    try {
      const saveData = this.createSaveData();
      await this.saveRestoreHooks.onSaveRequested(saveData);
      return true;
    } catch (error) {
      this.reportError('save_failed', error);
      return false;
    }
  }

  /**
   * Restore game state using registered hooks
   */
  async restore(): Promise<boolean> {
    // Guarded on the specific hook, for the reason given in `save()`.
    if (!this.saveRestoreHooks?.onRestoreRequested) {
      return false; // No restore capability
    }

    try {
      const saveData = await this.saveRestoreHooks.onRestoreRequested();
      if (!saveData) {
        return false; // User cancelled or no save available
      }

      this.loadSaveData(saveData);
      return true;
    } catch (error) {
      this.reportError('restore_failed', error);
      return false;
    }
  }

  /**
   * Undo to previous turn
   * @returns true if undo succeeded, false if nothing to undo
   */
  undo(): boolean {
    const result = this.saveRestoreService.undo(this.world);
    if (!result) {
      return false;
    }

    // Restore turn counter
    this.context.currentTurn = result.turn;

    // Re-sync player state from restored world model (ADR-132)
    const restoredPlayer = this.world.getPlayer();
    if (restoredPlayer) {
      this.syncPlayerState(restoredPlayer.id);
    }

    this.emit('state:changed', this.context);
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.saveRestoreService.canUndo();
  }

  /**
   * Get number of undo levels available
   */
  getUndoLevels(): number {
    return this.saveRestoreService.getUndoLevels();
  }

  /**
   * The engine surface the platform dispatcher acts on. The hooks are
   * read through a getter so a dispatch sees whatever is registered at
   * the moment each request runs.
   */
  private platformOperationHost(): PlatformOperationHost {
    const engine = this;
    return {
      get saveRestoreHooks() {
        return engine.saveRestoreHooks;
      },
      createSaveData: () => this.createSaveData(),
      loadSaveData: (saveData) => this.loadSaveData(saveData),
      stop: (reason) => this.stop(reason),
      createRestartAckEvent: () => this.createRestartAckEvent(),
      undo: () => this.undo(),
      currentTurn: () => this.context.currentTurn,
      repeatCommand: async (command) => {
        await this.executeTurn(command);
      }
    };
  }

  /**
   * Create save data from current engine state
   */
  private createSaveData(): ISaveData {
    return this.saveRestoreService.createSaveData(this.saveProvider());
  }

  /**
   * Load save data into engine
   */
  private loadSaveData(saveData: ISaveData): void {
    const result = this.saveRestoreService.loadSaveData(saveData, this.saveProvider());

    // Update event source
    this.eventSource = result.eventSource;

    // Update context
    this.context.currentTurn = result.currentTurn;
    this.context.metadata.lastPlayed = new Date();

    // Restore turn history
    this.context.history = this.saveRestoreService.deserializeTurnHistory(
      saveData.engineState.turnHistory,
      this.eventSource
    );

    // Re-sync player state from restored world model (ADR-132)
    const restoredPlayer = this.world.getPlayer();
    if (restoredPlayer) {
      this.syncPlayerState(restoredPlayer.id);
    }

    this.emit('state:changed', this.context);
  }

  /**
   * Get turn history
   */
  getHistory(): TurnResult[] {
    return [...this.context.history];
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 10): ISemanticEvent[] {
    const allEvents: ISemanticEvent[] = [];

    // Collect events from recent turns
    const recentTurns = this.context.history.slice(-Math.ceil(count / 5));
    for (const turn of recentTurns) {
      allEvents.push(...turn.events);
    }

    // Return most recent
    return allEvents.slice(-count);
  }

  /**
   * Update vocabulary for an entity
   */
  updateEntityVocabulary(entity: IFEntity, inScope: boolean): void {
    this.vocabularyManager.updateEntityVocabulary(entity, inScope);
  }

  /**
   * Update vocabulary for all entities in scope
   */
  updateScopeVocabulary(): void {
    this.vocabularyManager.updateScopeVocabulary(this.world, this.context.player.id);
  }

  /**
   * Emit a platform event with turn metadata
   */
  emitPlatformEvent(event: Omit<ISemanticEvent, 'id' | 'timestamp'>): void {
    const existingData = typeof event.data === 'object' && event.data !== null
      ? event.data
      : {};
    const now = Date.now();
    const fullEvent: ISemanticEvent = {
      ...event,
      id: `platform_${now}_${++this.platformEventSequence}`,
      timestamp: now,
      data: {
        ...existingData,
        turn: this.context.currentTurn
      }
    };

    this.platformEvents.addEvent(fullEvent);
  }

  /**
   * Emit a game lifecycle event.
   * All game events now use ISemanticEvent with data in the `data` field.
   * (IGameEvent with `payload` is deprecated - see ADR-097)
   */
  private emitGameEvent(event: ISemanticEvent): void {
    this.emit('event', event);

    // Turn bucketing is engine state, not story state: install steps
    // (`emit-story-loading`, `emit-story-loaded`) emit before the context
    // exists, so read the backing field and default to turn 1 rather than
    // going through the throwing `context` getter. Before ADR-344 D6 moved
    // the context into `installStory`, these events bucketed into turn 1
    // because the constructor initialised `currentTurn: 1`; they still do.
    // NOT the dead optionality ADR-345 D7 removes from the two bridge hosts.
    // This one fires: `emit-story-loading` and `emit-story-loaded` are install
    // steps, so they emit while the phase is still `empty` and there is
    // genuinely no context to read. It is the single site in this class where
    // "no context" is correct rather than impossible — hence the dedicated
    // `contextIfInstalled` accessor rather than a bare `?.`. Do not "clean
    // this up" by analogy with the bridges; a test pins it.
    const currentTurn = this.contextIfInstalled?.currentTurn ?? 1;
    if (currentTurn > 0) {
      const turnEvents = this.turnEvents.get(currentTurn) || [];
      turnEvents.push(event);
      this.turnEvents.set(currentTurn, turnEvents);
    }
  }
  
  /**
   * Emit an event to listeners
   */
  private emit<K extends GameEngineEventName>(
    event: K,
    ...args: Parameters<GameEngineEventListener<K>>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          this.reportListenerError(event, error);
        }
      }
    }
  }

  /**
   * Report one of the facade's own failures as a `system.<type>` event of
   * severity `error` on the system event source, which re-emits it to
   * `event` listeners. Data carries the error's message and stack.
   */
  private reportError(type: string, error: unknown, data: Record<string, unknown> = {}): void {
    this.systemEventSource.emit(
      createSystemEvent(ENGINE_SUBSYSTEM, type, { ...data, error: describeError(error) }, { severity: 'error' })
    );
  }

  /**
   * Report a listener that threw, as `system.listener_error` naming the
   * event it was listening for. The report is delivered through `emit`
   * itself, so a failure raised while one is in flight is dropped rather
   * than reported — that is the case of a listener throwing on the report.
   */
  private reportListenerError(event: string, error: unknown): void {
    if (this.reportingListenerError) return;
    this.reportingListenerError = true;
    try {
      this.reportError('listener_error', error, { event });
    } finally {
      this.reportingListenerError = false;
    }
  }

  /**
   * Add event listener
   */
  on<K extends GameEngineEventName>(
    event: K,
    listener: GameEngineEventListener<K>
  ): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
    return this;
  }

  /**
   * Remove event listener
   */
  off<K extends GameEngineEventName>(
    event: K,
    listener: GameEngineEventListener<K>
  ): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
    return this;
  }

}

