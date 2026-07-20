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
  ContainerTrait,
  ListenerTrait,
  StandardCapabilities,
  ITrait,
  TraitType,
  EntityType,
  StoryInfoTrait,
  HealthTrait,
  HealthBehavior,
  registerConcealedVisibilityBehavior
} from '@sharpee/world-model';
import { EventProcessor, Effect } from '@sharpee/event-processor';
import {
  ActionRegistry,
  StandardActionRegistry,
  standardActions,
  vocabularyRegistry,
  Parser,
  ParserFactory,
  CommandHistoryData,
  CommandHistoryEntry,
  CommandHistoryCapabilitySchema,
  IFActions,
  MetaCommandRegistry,
  IPerceptionService,
  registerStandardChains,
  createScopeResolver,
  channelRegistry,
  PLAYER_DIED_EVENT,
  createDeadlyRoomTransformer,
} from '@sharpee/stdlib';
import { LanguageProvider, IEventProcessorWiring, ClientCapabilities, CmgtPacket, TurnPacket, ISound } from '@sharpee/if-domain';
import { IProsePipeline, ProsePipeline, type SlotContributor, type SlotEntry } from './prose-pipeline/index.js';
import { ITextBlock, BLOCK_KEYS } from '@sharpee/text-blocks';
import { ChannelService } from '@sharpee/channel-service';
import { ISemanticEvent, ISystemEvent, IGenericEventSource, createSemanticEventSource, createGenericEventSource, ISaveData, ISaveRestoreHooks, ISaveResult, IRestoreResult, ISerializedEvent, ISerializedTurn, IEngineState, ISaveMetadata, ISerializedParserState, IPlatformEvent, isPlatformRequestEvent, PlatformEventType, ISaveContext, IRestoreContext, IQuitContext, IRestartContext, IAgainContext, createSaveCompletedEvent, createRestoreCompletedEvent, createQuitConfirmedEvent, createQuitCancelledEvent, createRestartCompletedEvent, createUndoCompletedEvent, createAgainFailedEvent, ISemanticEventSource, GameEventType, createGameInitializingEvent, createGameInitializedEvent, createStoryLoadingEvent, createStoryLoadedEvent, createGameStartingEvent, createGameStartedEvent, createGameEndingEvent, createGameEndedEvent, createGameWonEvent, createGameLostEvent, createGameQuitEvent, createGameAbortedEvent, createPcSwitchedEvent, getUntypedEventData, createSeededRandom, SeededRandom } from '@sharpee/core';

import { PluginRegistry, TurnPluginContext } from '@sharpee/plugins';
import { SceneEvaluationPlugin } from './scene-evaluation-plugin.js';


import {
  GameContext,
  TurnResult,
  MetaCommandResult,
  CommandResult,
  EngineConfig,
  InputModeHandler,
  INPUT_MODE_STATE_KEY,
  EngineIntrospection,
  ActionSummary,
  TraitSummary,
  BehaviorBindingSummary,
  MessageSummary
} from './types.js';
import { Story } from './story.js';
import { NarrativeSettings, buildNarrativeSettings } from './narrative/index.js';
import { validateRoomSnippets } from './snippet-validation.js';
import { validateCombatantHealth } from './combatant-health-validation.js';

import { CommandExecutor, createCommandExecutor, ParsedCommandTransformer, BeforeActionHookListener } from './command-executor.js';
import { createActionContext } from './action-context-factory.js';
import { SoundDispatcher } from './sound/index.js';
import { processEvent } from './turn-event-processor.js';
import { IEngineAwareParser, hasPronounContext, hasPlatformEventEmitter, hasWorldContext } from './parser-interface.js';
import { hasNarrativeSettings } from './language-provider-interface.js';
import { VocabularyManager, createVocabularyManager } from './vocabulary-manager.js';
import { SaveRestoreService, createSaveRestoreService, ISaveRestoreStateProvider } from './save-restore-service.js';
import { TurnEventProcessor, createTurnEventProcessor, EnrichmentContext } from './turn-event-processor.js';
import { PlatformOperationHandler, createPlatformOperationHandler, EngineCallbacks } from './platform-operations.js';

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
};

/**
 * Main game engine
 */
export class GameEngine {
  private world: WorldModel;
  private sessionStartTime?: number;
  private sessionTurns: number = 0;
  private sessionMoves: number = 0;
  private context: GameContext;
  private config: EngineConfig;
  private commandExecutor!: CommandExecutor;
  private eventProcessor: EventProcessor;
  private platformEvents: ISemanticEventSource;
  private actionRegistry: StandardActionRegistry;
  private textService?: IProsePipeline;
  private turnEvents = new Map<number, ISemanticEvent[]>();
  private running = false;
  private story?: Story;
  private languageProvider?: LanguageProvider;
  private parser?: Parser;
  private eventListeners = new Map<GameEngineEventName, Set<(...args: any[]) => void>>();
  private saveRestoreHooks?: ISaveRestoreHooks;
  private eventSource = createSemanticEventSource();
  private systemEventSource: IGenericEventSource<ISystemEvent>;
  private pendingPlatformOps: IPlatformEvent[] = [];
  private perceptionService?: IPerceptionService;
  private pluginRegistry: PluginRegistry;

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
  private random: SeededRandom;
  /**
   * Dedicated action RNG stream (ADR-231 D6), exposed to actions as
   * `ActionContext.random`. A separate instance from `random` (the
   * turn-plugin stream) so plugin draws can never shift action rolls;
   * its seed rides the save blob (`IEngineState.actionRngSeed`) so
   * post-restore action outcomes replay deterministically.
   */
  private actionRandom: SeededRandom;
  private narrativeSettings: NarrativeSettings;

  // Alternate input mode handlers (ADR-137)
  private inputModeHandlers = new Map<string, InputModeHandler>();

  // Extracted services (Phase 4 remediation)
  private vocabularyManager: VocabularyManager;
  private saveRestoreService: SaveRestoreService;
  private turnEventProcessor: TurnEventProcessor;
  private platformOpHandler?: PlatformOperationHandler;

  // Phase 5: Track if initialized event has been emitted
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
    player: IFEntity;
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

    // Initialize context
    this.context = {
      currentTurn: 1,  // Start at 1 per test expectations
      player: options.player,
      history: [],
      metadata: {
        started: new Date(),
        lastPlayed: new Date()
      }
    };

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
    this.random = createSeededRandom();
    // ADR-231 D6: dedicated action stream — unseeded construction gives a
    // time-based initial seed (same pattern as `random` above)
    this.actionRandom = createSeededRandom();
    this.narrativeSettings = buildNarrativeSettings(); // Default: 2nd person

    // Initialize extracted services (Phase 4 remediation)
    this.vocabularyManager = createVocabularyManager();
    this.saveRestoreService = createSaveRestoreService({
      maxSnapshots: this.config.maxUndoSnapshots ?? 10
    });
    this.turnEventProcessor = createTurnEventProcessor(this.perceptionService);

    // Set provided dependencies
    this.languageProvider = options.language;
    this.parser = options.parser;
    this.textService = new ProsePipeline(this.languageProvider, this.world);
    
    // Update action registry with language provider
    this.actionRegistry.setLanguageProvider(this.languageProvider);
    
    // Wire parser with platform events if supported
    if (this.parser && hasPlatformEventEmitter(this.parser)) {
      this.parser.setPlatformEventEmitter((event) => {
        this.platformEvents.addEvent(event);
      });
    }
    
    // Create command executor with dependencies
    this.commandExecutor = createCommandExecutor(
      this.world,
      this.actionRegistry,
      this.eventProcessor,
      this.parser,
      this.systemEventSource,
      this.actionRandom
    );

    // ADR-224: auto-register the deadly-room death transformer so every story
    // (TS or Chord) gets the deadly-room verb-allowlist / probabilistic hazard for
    // free — no story wiring needed. It early-returns when the player's room has no
    // DeadlyRoomTrait, and uses the engine's seeded RNG for the `chance` variant.
    this.commandExecutor.registerParsedCommandTransformer(
      createDeadlyRoomTransformer(this.random),
    );

    // Query handling is now managed by the platform layer
    // Platform owns the QueryManager and handles all queries

    // Note: game.initialized event is emitted in start() to avoid race condition
    // (Phase 5 remediation - removed setTimeout)
  }

  /**
   * Set the story for this engine
   */
  setStory(story: Story): void {
    // Emit story loading event
    const loadingEvent = createStoryLoadingEvent(story.config.id);
    this.emitGameEvent(loadingEvent);

    this.story = story;

    // Build narrative settings from story config (ADR-089)
    this.narrativeSettings = buildNarrativeSettings(story.config.narrative);

    // Create player first so initializeWorld() can place them
    const newPlayer = story.createPlayer(this.world);
    this.context.player = newPlayer;
    this.world.setPlayer(newPlayer.id);

    // ADR-172 Phase 4 — every engine-initialized player is a Listener for
    // spatial sound propagation. Stories opt NPCs / devices in by adding
    // the trait themselves (see ADR-172 §Multi-listener dispatch). The
    // `has` check leaves any story-applied ListenerTrait untouched (the
    // story may have already configured a custom subclass or future
    // per-listener data fields).
    if (!newPlayer.has(TraitType.LISTENER)) {
      newPlayer.add(new ListenerTrait());
    }

    // ADR-148 concealment: register the standard concealed-visibility
    // behavior on this world (NPCs can't see a concealed player — the
    // hide-and-observe mechanic). Registered BEFORE initializeWorld so a
    // story can override the binding with its own NPC-detection behavior
    // (per-world registration is last-wins, ADR-207).
    registerConcealedVisibilityBehavior(this.world);

    // Initialize story-specific world content (player must exist first)
    story.initializeWorld(this.world);

    // ADR-209 AC-5: fail load synchronously (naming room and marker) if any
    // snippet-bearing room's description carries an unbound {snippet:name}.
    validateRoomSnippets(this.world);
    // ADR-226 AC-7: every combatant must carry the HealthTrait combat operates on.
    validateCombatantHealth(this.world);

    // Configure language provider with narrative settings (ADR-089)
    this.configureLanguageProviderNarrative(newPlayer);

    // Update metadata
    this.context.metadata.title = story.config.title;
    this.context.metadata.author = Array.isArray(story.config.author)
      ? story.config.author.join(', ')
      : story.config.author;
    this.context.metadata.version = story.config.version;

    // Ensure a StoryInfo entity exists — the standard ABOUT action resolves
    // its params (title/author/version/description) from `StoryInfoTrait`.
    // Stories may create their own during `initializeWorld` (dungeo does, to
    // add build-pipeline metadata) and that one wins; when none exists,
    // create it from `StoryConfig` so ABOUT renders real story data with no
    // story-side setup.
    if (this.world.findByTrait(TraitType.STORY_INFO).length === 0) {
      const storyInfoEntity = this.world.createEntity('story-info', EntityType.OBJECT);
      storyInfoEntity.add(new StoryInfoTrait({
        title: story.config.title,
        author: this.context.metadata.author,
        version: story.config.version,
        description: story.config.description,
      }));
    }

    // Seed the `storyInfo` capability for ADR-163 `infoChannel` /
    // `ifidChannel` to project. Channels read from the world via
    // `world.getCapability('storyInfo')`; this is the single
    // population point. Two sources merge:
    //   - `StoryConfig` — authoritative for title/author/version/ifid
    //     and the description / buildDate when set there.
    //   - `StoryInfoTrait` (populated by the story during
    //     `initializeWorld`) — carries build-pipeline metadata
    //     (`engineVersion`, `clientVersion`, sometimes `buildDate` /
    //     `description` set by the story rather than the config).
    // Config values win on conflict; trait values fill in the gaps.
    const storyInfoEntities = this.world.findByTrait(TraitType.STORY_INFO);
    const trait = storyInfoEntities[0]?.get<StoryInfoTrait>(TraitType.STORY_INFO);
    const initialStoryInfo: Record<string, string> = {
      title: story.config.title,
      author: this.context.metadata.author,
      version: story.config.version,
    };
    if (story.config.ifid) initialStoryInfo.ifid = story.config.ifid;
    if (story.config.description) initialStoryInfo.description = story.config.description;
    if (story.config.buildDate) initialStoryInfo.buildDate = story.config.buildDate;
    // Trait values fill in fields the config didn't set.
    if (trait?.description && !initialStoryInfo.description) {
      initialStoryInfo.description = trait.description;
    }
    if (trait?.buildDate && !initialStoryInfo.buildDate) {
      initialStoryInfo.buildDate = trait.buildDate;
    }
    if (trait?.engineVersion) initialStoryInfo.engineVersion = trait.engineVersion;
    if (trait?.clientVersion) initialStoryInfo.clientVersion = trait.clientVersion;
    this.world.registerCapability('storyInfo', {
      schema: {
        title: { type: 'string', default: '' },
        author: { type: 'string', default: '' },
        version: { type: 'string', default: '' },
        ifid: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        buildDate: { type: 'string', default: '' },
        engineVersion: { type: 'string', default: '' },
        clientVersion: { type: 'string', default: '' },
      },
      initialData: initialStoryInfo,
    });

    // Copy implicit actions config to context (ADR-104)
    this.context.implicitActions = story.config.implicitActions;

    // Register any custom actions
    if (story.getCustomActions) {
      const customActions = story.getCustomActions();
      for (const action of customActions) {
        this.actionRegistry.register(action);
      }
    }
    
    // Story-specific initialization
    if (story.initialize) {
      story.initialize();
    }
    
    // Emit story loaded event
    const loadedEvent = createStoryLoadedEvent({
      id: story.config.id,
      title: story.config.title,
      author: this.context.metadata.author,
      version: story.config.version
    });
    this.emitGameEvent(loadedEvent);
    
    // Register custom vocabulary if parser is available
    if (story.getCustomVocabulary && this.parser && this.parser.registerVerbs) {
      const customVocab = story.getCustomVocabulary();

      // Register custom verbs
      if (customVocab.verbs && customVocab.verbs.length > 0) {
        this.parser.registerVerbs(customVocab.verbs);
      }

      // Future: Register other vocabulary types
      // if (customVocab.nouns && this.parser.registerNouns) {
      //   this.parser.registerNouns(customVocab.nouns);
      // }
    }

    // Notify story that engine is fully initialized
    // Allows stories to register command transformers and other hooks
    if (story.onEngineReady) {
      story.onEngineReady(this);
    }
  }


  /**
   * Get the current parser
   */
  getParser(): Parser | undefined {
    return this.parser;
  }

  /**
   * Get the current language provider
   */
  getLanguageProvider(): LanguageProvider | undefined {
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
    const actions: ActionSummary[] = [];
    const lang = this.languageProvider;

    for (const action of this.actionRegistry.getAll()) {
      const patterns = lang?.getActionPatterns(action.id) ?? [];
      const rawHelp = lang?.getActionHelp?.(action.id);
      const help = rawHelp
        ? { description: rawHelp.description, verbs: rawHelp.verbs, examples: rawHelp.examples }
        : null;

      actions.push({
        id: action.id,
        group: action.group ?? null,
        priority: action.priority ?? 0,
        isStandard: action.id.startsWith('if.action.'),
        patterns,
        help,
      });
    }

    // Trait summaries — enumerate all trait types in use across entities
    const traitMap = new Map<string, { entityIds: string[]; sample: ITrait | null }>();
    for (const entity of this.world.getAllEntities()) {
      for (const trait of entity.getTraits()) {
        const type = trait.type as string;
        const entry = traitMap.get(type);
        if (entry) {
          entry.entityIds.push(entity.id);
          if (!entry.sample) entry.sample = trait;
        } else {
          traitMap.set(type, { entityIds: [entity.id], sample: trait });
        }
      }
    }

    // Collect capability and interceptor registrations per trait type
    const capsByTrait = new Map<string, string[]>();
    for (const [key] of this.world.getAllCapabilityBindings()) {
      const [traitType, capability] = key.split(':');
      const list = capsByTrait.get(traitType) ?? [];
      list.push(capability);
      capsByTrait.set(traitType, list);
    }

    const intsByTrait = new Map<string, string[]>();
    for (const [key] of this.world.getAllActionInterceptors()) {
      const [traitType, actionId] = key.split(':');
      const list = intsByTrait.get(traitType) ?? [];
      list.push(actionId);
      intsByTrait.set(traitType, list);
    }

    const PLATFORM_PREFIXES = ['room', 'identity', 'container', 'supporter', 'openable',
      'lockable', 'switchable', 'readable', 'scenery', 'actor', 'combatant',
      'light-source', 'wearable', 'region', 'scene', 'story-info', 'player',
      'npc', 'portable'];

    const traits: TraitSummary[] = [];
    for (const [type, { entityIds, sample }] of traitMap) {
      const properties = sample
        ? Object.keys(sample).filter(k => k !== 'type')
        : [];

      traits.push({
        type,
        isStandard: PLATFORM_PREFIXES.includes(type) || type.startsWith('if.'),
        entityCount: entityIds.length,
        entityIds,
        properties,
        capabilities: capsByTrait.get(type) ?? [],
        interceptors: intsByTrait.get(type) ?? [],
      });
    }

    // Behavior bindings — capability behaviors and action interceptors
    const behaviors: BehaviorBindingSummary[] = [];

    for (const [key, binding] of this.world.getAllCapabilityBindings()) {
      const [traitType, capability] = key.split(':');
      const behavior = binding.behavior;
      const phases: string[] = [];
      if (typeof behavior.validate === 'function') phases.push('validate');
      if (typeof behavior.execute === 'function') phases.push('execute');
      if (typeof behavior.report === 'function') phases.push('report');
      if (typeof behavior.blocked === 'function') phases.push('blocked');

      behaviors.push({
        traitType,
        actionId: capability,
        priority: binding.priority ?? 0,
        phases,
        kind: 'capability',
      });
    }

    for (const [key, binding] of this.world.getAllActionInterceptors()) {
      const [traitType, actionId] = key.split(':');
      const interceptor = binding.interceptor;
      const phases: string[] = [];
      if (typeof interceptor.preValidate === 'function') phases.push('preValidate');
      if (typeof interceptor.postValidate === 'function') phases.push('postValidate');
      if (typeof interceptor.postExecute === 'function') phases.push('postExecute');

      behaviors.push({
        traitType,
        actionId,
        priority: binding.priority ?? 0,
        phases,
        kind: 'interceptor',
      });
    }

    // Language messages — all registered message IDs with text and source
    const messages: MessageSummary[] = [];
    const allMessages = lang?.getAllMessages?.();
    if (allMessages) {
      const PLATFORM_PREFIXES = ['if.', 'core.', 'game.', 'npc.', 'combat.', 'character.'];
      for (const [id, text] of allMessages) {
        const source = PLATFORM_PREFIXES.some(p => id.startsWith(p)) ? 'platform' : 'story';
        messages.push({ id, text, source });
      }
    }

    return { actions, traits, behaviors, messages };
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
    if (this.running) {
      throw new Error('Engine is already running');
    }

    if (!this.parser) {
      throw new Error('Engine must have a parser before starting');
    }

    if (!this.languageProvider) {
      throw new Error('Engine must have a language provider before starting');
    }

    if (!this.textService) {
      throw new Error('Engine must have a text service before starting');
    }

    if (!this.commandExecutor) {
      throw new Error('Engine must have a command executor before starting');
    }

    // Channel-I/O bootstrap (ADR-163 §13, §14):
    //  1. Refresh `storyInfo` from `StoryInfoTrait` — pulls in the
    //     build-pipeline metadata (engineVersion / clientVersion /
    //     buildDate) that may have been patched onto the trait
    //     between `setStory()` and here (e.g., `BrowserClient.start()`
    //     sets clientVersion just before calling `engine.start()`).
    //  2. Story registers / overrides channels on the shared registry.
    //  3. Engine constructs a fresh ChannelService bound to the
    //     negotiated capabilities.
    //  4. Manifest fires before the first turn — bootstrap-order
    //     invariant from §11.
    this.refreshStoryInfoCapability();
    this.clientCapabilities = options?.capabilities ?? DEFAULT_TEXT_CAPABILITIES;
    this.story?.registerChannels?.(channelRegistry);
    this.channelService = new ChannelService(channelRegistry, this.clientCapabilities);
    this.emit('channel:manifest', this.channelService.buildManifest());

    // Emit initialized event once (Phase 5 - moved from constructor to avoid race condition)
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

    this.running = true;
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
  private refreshStoryInfoCapability(): void {
    const entities = this.world.findByTrait(TraitType.STORY_INFO);
    const trait = entities[0]?.get<StoryInfoTrait>(TraitType.STORY_INFO);
    if (!trait) return;
    const update: Record<string, string> = {};
    if (trait.engineVersion) update.engineVersion = trait.engineVersion;
    if (trait.clientVersion) update.clientVersion = trait.clientVersion;
    if (trait.buildDate) update.buildDate = trait.buildDate;
    if (trait.description) update.description = trait.description;
    if (Object.keys(update).length > 0) {
      this.world.updateCapability('storyInfo', update);
    }
  }

  /**
   * Build and emit a `channel:packet` for the turn just processed.
   * Co-fires with `text:output` at every block-emission site so
   * channel consumers and legacy text-service consumers see the same
   * turn boundary. No-op when the engine has no channel service yet
   * (`start()` has not run).
   */
  private emitChannelPacket(
    events: readonly ISemanticEvent[],
    blocks: readonly ITextBlock[],
    turn: number,
  ): void {
    if (!this.channelService) return;
    const packet = this.channelService.build({
      world: this.world,
      events,
      blocks,
      turn,
    });
    this.emit('channel:packet', packet, turn);
  }

  /**
   * Stop the game engine
   */
  stop(reason?: 'quit' | 'victory' | 'defeat' | 'abort', details?: any): void {
    if (!this.running) {
      return;
    }
    
    // Emit game ending event
    const endingEvent = createGameEndingEvent(reason || 'quit', {
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      turns: this.sessionTurns,
      moves: this.sessionMoves
    });
    this.emitGameEvent(endingEvent);
    
    this.running = false;
    
    // Emit specific end event based on reason
    const session = {
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      turns: this.sessionTurns,
      moves: this.sessionMoves
    };
    
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
   * Restart the game from scratch.
   *
   * Clears the world, resets engine state, and re-initializes the story.
   * Called from both processMetaPlatformOperation and processPlatformOperations.
   */
  private async restartGame(): Promise<void> {
    if (!this.story) return;

    // Stop engine if running
    if (this.running) {
      this.stop();
    }

    // Reset pronoun context
    if (this.parser && hasPronounContext(this.parser)) {
      this.parser.resetPronounContext();
    }

    // Clear world state (entities, spatial index, relationships, etc.)
    this.world.clear();

    // Reset engine context
    this.context.currentTurn = 1;
    this.context.history = [];
    this.context.metadata.started = new Date();
    this.context.metadata.lastPlayed = new Date();

    // Clear engine bookkeeping
    this.turnEvents.clear();
    this.pendingPlatformOps = [];
    this.soundBuffer.length = 0;
    this.saveRestoreService.clearUndoSnapshots();
    this.hasEmittedInitialized = false;

    // Clear plugin registry so story can re-register plugins
    this.pluginRegistry.clear();

    // Re-initialize the story (creates entities, player, custom actions, etc.)
    this.setStory(this.story);

    // Start the engine (emits game.initialized + game.started)
    this.start();
  }

  /**
   * Execute a turn
   */
  async executeTurn(input: string): Promise<TurnResult> {
    if (!this.running) {
      throw new Error('Engine is not running');
    }

    if (!this.commandExecutor) {
      throw new Error('Engine must have a story set before executing turns');
    }

    // Command chaining (classic IF): "open gate. south", "take feed; feed
    // goats", or "unlock gate with keycard then open gate" run each statement
    // as its own full turn, in order. A failed statement flushes the rest of
    // the line, matching player expectations from Inform-style interpreters.
    // Skipped while an alternate input mode is active (ADR-137) — mode
    // handlers own the raw line, punctuation and all.
    if (typeof input === 'string' && !this.world.getStateValue(INPUT_MODE_STATE_KEY)) {
      const statements = splitChainedInput(input);
      if (statements.length > 1) {
        let result: TurnResult | undefined;
        for (const statement of statements) {
          result = await this.executeTurn(statement);
          if (!result.success) break;
        }
        return result!;
      }
      // A single statement that differs from the raw line had separator
      // punctuation to shed (e.g. a trailing period): run the cleaned form.
      if (statements.length === 1 && statements[0] !== input) {
        return this.executeTurn(statements[0]);
      }
    }

    // Create undo snapshot BEFORE processing the turn
    // Skip for meta/info commands that shouldn't create undo points
    // (Phase 6 remediation - use MetaCommandRegistry instead of hardcoded list)
    if (!MetaCommandRegistry.isNonUndoable(input)) {
      this.createUndoSnapshot();
    }

    // Note: AGAIN/G command handling has been moved to the again action (if.action.again)
    // which emits platform.again_requested event, processed by processPlatformOperations.
    // This enables proper i18n support - each parser package defines its own patterns
    // (e.g., "again"/"g" in English, "encore"/"e" in French).

    // Check if system events are enabled via debug capability
    const debugData = this.world.getCapability('debug');
    if (debugData && (debugData.debugParserEvents || debugData.debugValidationEvents || debugData.debugSystemEvents)) {
      // Emit system events when enabled
      // For now, we'll add these events directly to the result
      // In the future, we could use a proper event source system
      
      // Note: The actual parser/validation events would be emitted by
      // the parser and validator components when they detect these flags
    }

    const turn = this.context.currentTurn;

    // Validate input
    if (input === null || input === undefined) {
      const errorEvent: ISemanticEvent = {
        id: `cmd_failed_${turn}_${Date.now()}`,
        type: 'command.failed',
        timestamp: Date.now(),
        entities: {},
        data: {
          reason: 'Input cannot be null or undefined',
          input: input
        }
      };
      
      return {
        turn,
        input: input,
        success: false,
        events: [errorEvent],
        error: 'Input cannot be null or undefined'
      };
    }

    this.emit('turn:start', turn, input);

    // Check for alternate input mode (ADR-137)
    const activeModeId = this.world.getStateValue(INPUT_MODE_STATE_KEY) as string | undefined;
    if (activeModeId) {
      const handler = this.inputModeHandlers.get(activeModeId);
      if (handler) {
        return this.executeInputMode(input, handler, turn);
      }
      // Handler not registered — fall through to standard pipeline
    }

    try {
      // Early detection: Parse first to check if this is a meta-command
      // Meta-commands (VERSION, SCORE, HELP, etc.) take a completely separate path
      // that doesn't interact with turn machinery (no turn increment, no NPCs, etc.)
      if (this.parser) {
        // Set world context for parser
        const player = this.world.getPlayer();
        if (player && hasWorldContext(this.parser)) {
          const playerLocation = this.world.getLocation(player.id) || '';
          this.parser.setWorldContext(this.world, player.id, playerLocation);
        }

        // Parse to get action ID
        const parseResult = this.parser.parse(input);
        if (parseResult.success) {
          const parsedCommand = parseResult.value;
          const actionId = parsedCommand.action;

          // Check if this is a meta-command
          if (actionId && MetaCommandRegistry.isMeta(actionId)) {
            // Route to separate meta-command path
            const metaResult = await this.executeMetaCommand(input, parsedCommand);

            // Convert MetaCommandResult to TurnResult for backward compatibility
            // Turn is included for display context but not incremented
            return {
              type: 'turn',  // For backward compatibility with callers that don't check type
              turn,
              input: metaResult.input,
              success: metaResult.success,
              events: metaResult.events,
              error: metaResult.error,
              actionId: metaResult.actionId
            };
          }
        }
        // If parse failed or not a meta-command, fall through to regular execution
      }

      // Regular command path - full turn processing
      // Reset the per-turn sound buffer (ADR-172 Phase 6). Sounds emitted
      // during this turn's report phase live here until the dispatcher
      // fans them out to listeners after the plugin tick.
      this.soundBuffer.length = 0;

      // Execute the command
      const result = await this.commandExecutor.execute(
        input,
        this.world,
        this.context,
        this.config,
        this.soundBuffer,
      );

      // Get context for event enrichment
      const playerLocation = this.world.getLocation(this.context.player.id);
      const enrichmentContext = {
        turn,
        playerId: this.context.player.id,
        locationId: playerLocation
      };
      
      // Store events for this turn (process through enrichment pipeline)
      let semanticEvents = result.events.map(e => processEvent(e, enrichmentContext));

      // Apply perception filtering if service is configured
      // This transforms events based on what the player can perceive
      if (this.perceptionService) {
        semanticEvents = this.perceptionService.filterEvents(
          semanticEvents,
          this.context.player,
          this.world
        );
      }

      // Merge with any existing events for this turn (e.g., game.started from engine.start())
      const existingEvents = this.turnEvents.get(turn) || [];
      this.turnEvents.set(turn, [...existingEvents, ...semanticEvents]);

      // Also track in event source for save/restore
      for (const semanticEvent of semanticEvents) {
        this.eventSource.emit(semanticEvent);

        // Check if this is a platform request event
        if (isPlatformRequestEvent(semanticEvent)) {
          this.pendingPlatformOps.push(semanticEvent as IPlatformEvent);
        }
      }

      // Update command history if command was successful
      // Note: Meta-commands take the early path (executeMetaCommand) and never reach here
      if (result.success) {
        this.updateCommandHistory(result, input, turn);

        // Update pronoun context for "it"/"them"/"him"/"her" resolution (ADR-089)
        if (this.parser && hasPronounContext(this.parser) && result.validatedCommand) {
          this.parser.updatePronounContext(result.validatedCommand, turn);
        }
      }

      // Emit events if configured
      if (this.config.onEvent) {
        for (const event of result.events) {
          this.config.onEvent(event);
        }
      }
      
      // Always emit events through the engine's event system
      let victoryDetected = false;
      let victoryDetails: any = null;

      for (const event of result.events) {
        this.emit('event', event);

        // NOTE: Entity `on` handlers removed (ISSUE-068). Story-level handlers
        // are dispatched by the event-processor in the command executor.

        // Check for story victory event but don't stop immediately
        // (we're still processing the turn)
        if (event.type === 'story.victory') {
          victoryDetected = true;
          const data = event.data as { reason?: string; score?: number } | undefined;
          victoryDetails = {
            reason: data?.reason || 'Story completed',
            score: data?.score || 0
          };
        }
      }

      // Run NPC and scheduler ticks after successful player action
      // Order: NPC phase (ADR-070), then scheduler tick (ADR-071)
      // Note: Meta-commands take the early path and never reach here
      if (result.success) {
        const playerLocation = this.world.getLocation(this.context.player.id);

        // Plugin tick loop (ADR-120)
        // Plugins run in priority order (NPC at 100, state machines at 75, scheduler at 50)
        //
        // actionResult.success must reflect GENUINE action success (Phase 7):
        // result.success only checks for action.error events, but modern
        // blocked() paths reuse the primary event type with blocked:true /
        // failed:true — a refused action would otherwise report success and
        // (e.g.) advance state-machine transitions it never earned.
        const actionRefused = semanticEvents.some(e => {
          const data = e.data as { blocked?: unknown; failed?: unknown } | undefined;
          return data?.blocked === true || data?.failed === true;
        });
        const pluginContext: TurnPluginContext = {
          world: this.world,
          turn,
          playerId: this.context.player.id,
          playerLocation: playerLocation || '',
          random: this.random,
          actionResult: {
            actionId: result.actionId || '',
            success: result.success && !actionRefused,
            targetId: result.validatedCommand?.directObject?.entity?.id,
          },
          actionEvents: semanticEvents,
        };
        for (const plugin of this.pluginRegistry.getAll()) {
          const pluginEvents = plugin.onAfterAction(pluginContext);
          if (pluginEvents.length > 0) {
            this.processPluginEvents(pluginEvents, turn, playerLocation);
          }
        }
      }

      // Sound dispatch (ADR-172 Phase 6). Fan out every buffered sound
      // to every `ListenerTrait` entity, producing one
      // `sound.audibility.heard` event per (sound × listener) pair the
      // propagation function delivers (non-null). Runs after the plugin
      // tick so any sounds emitted by NPC actions in a future plugin
      // extension would also land in the buffer; runs before
      // `textService.processTurn()` so the audibility channel and
      // text-rendering see the events in this turn's packet.
      if (this.soundBuffer.length > 0) {
        const audibilityEvents = this.soundDispatcher.dispatch(
          this.soundBuffer,
          this.world,
          turn,
        );
        if (audibilityEvents.length > 0) {
          const existing = this.turnEvents.get(turn) ?? [];
          this.turnEvents.set(turn, [...existing, ...audibilityEvents]);
          for (const e of audibilityEvents) {
            this.eventSource.emit(e);
            // Make the events visible to onEvent subscribers and the
            // engine's 'event' emitter, mirroring the action-event path.
            if (this.config.onEvent) this.config.onEvent(e);
            this.emit('event', e);
          }
          // Mirror the audibility events into result.events so callers
          // that read TurnResult directly (tests, downstream renderers)
          // see them alongside the action's events. Matches the pattern
          // used after platform-op processing further below.
          result.events = [...result.events, ...audibilityEvents];
        }
      }

      // Update context and turn counter
      // Note: Meta-commands take the early path and never reach here
      this.updateContext(result);
      // Update session statistics
      this.sessionTurns++;
      if (result.success) {
        this.sessionMoves++;
      }

      // Process pending platform operations before text service
      if (this.pendingPlatformOps.length > 0) {
        await this.processPlatformOperations(turn);

        // Update result.events with any platform completion events
        const allTurnEvents = this.turnEvents.get(turn) || [];
        result.events = allTurnEvents;
      }

      // Process text output (ADR-096, ADR-133)
      if (this.textService) {
        const turnEvents = this.turnEvents.get(turn) || [];
        const blocks = this.textService.processTurn(turnEvents);

        // Append prompt block (ADR-137)
        this.appendPromptBlock(blocks);

        result.blocks = blocks;
        if (blocks.length > 0) {
          this.emit('text:output', blocks, turn);
        }
        // ADR-163 channel packet co-emits with text:output so the new
        // and legacy paths see the same turn boundary. Fires every
        // turn (including blocks.length === 0 idle turns) so 'always'
        // channels still re-emit.
        this.emitChannelPacket(turnEvents, blocks, turn);
      }

      // Detect a canonical player-death event (ADR-224) *before* the turn's
      // events are cleared below. The death may have been emitted this turn by
      // the action, an interceptor, or a scheduler daemon — all have landed in
      // this turn's event stream by now, and story policy (event handlers in the
      // executor + state-machine plugins in the tick loop above) has already had
      // its "first crack" to veto by resetting the player's HealthTrait.
      const deathCause = this.playerDeathCauseThisTurn(turn);

      // Clear turn events after processing to prevent accumulation on same turn (meta commands)
      this.turnEvents.set(turn, []);

      // Emit completion
      this.emit('turn:complete', result);

      // Check for victory from events
      if (victoryDetected) {
        this.stop('victory', victoryDetails);
        return result;
      }

      // Route a still-dead player to game.lost. Only if the player's *derived*
      // life-state is still dead do we end the game — the re-check of live state,
      // not the event's `terminal` flag, is the engine's final word (ADR-224
      // Q-2, AC-3). A story reincarnation policy that cleared `dead` above wins.
      if (deathCause !== undefined && this.isPlayerDead()) {
        this.stop('defeat', { reason: 'You have died.', cause: deathCause });
        return result;
      }

      // Check for game over via story.isComplete()
      if (this.isGameOver()) {
        // Check if it's a victory (story completed successfully)
        // For now, assume completion means victory
        // Stories could provide more detail about the type of ending
        this.stop('victory', {
          reason: 'Story completed',
          score: 0
        });
      }

      return result;

    } catch (error: any) {
      this.emit('turn:failed', error as Error, turn);
      throw error;
    }
  }

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
  private async executeMetaCommand(
    input: string,
    parsedCommand: any
  ): Promise<MetaCommandResult> {
    const events: ISemanticEvent[] = [];

    try {
      // Validate the command
      const validationResult = this.commandExecutor.validateCommand(parsedCommand);

      if (!validationResult.success) {
        // Validation failed - emit error event using domain event pattern
        const errorEvent: ISemanticEvent = {
          id: `meta_error_${Date.now()}`,
          type: 'if.event.command_error',
          timestamp: Date.now(),
          data: {
            messageId: `if.action.command.${validationResult.error?.code || 'validation_failed'}`,
            params: validationResult.error?.details || {},
            blocked: true,
            reason: validationResult.error?.code || 'validation_failed'
          },
          entities: {}
        };
        events.push(errorEvent);

        // Process error through text service and emit
        this.processMetaEvents(events);

        return {
          type: 'meta',
          input,
          success: false,
          events,
          error: validationResult.error?.code || 'Validation failed',
          actionId: parsedCommand.action
        };
      }

      const command = validationResult.value;
      const action = this.actionRegistry.get(command.actionId);

      if (!action) {
        const errorEvent: ISemanticEvent = {
          id: `meta_error_${Date.now()}`,
          type: 'if.event.command_error',
          timestamp: Date.now(),
          data: {
            messageId: 'if.action.command.action_not_found',
            params: { actionId: command.actionId },
            blocked: true,
            reason: 'action_not_found'
          },
          entities: {}
        };
        events.push(errorEvent);

        this.processMetaEvents(events);

        return {
          type: 'meta',
          input,
          success: false,
          events,
          error: `Action not found: ${command.actionId}`,
          actionId: command.actionId
        };
      }

      // Create action context for meta-command execution
      const scopeResolver = createScopeResolver(this.world);
      const actionContext = createActionContext(this.world, this.context, command, action, scopeResolver, undefined, this.actionRandom);

      // Run action's four-phase pattern
      const actionValidation = action.validate(actionContext);

      let actionEvents: ISemanticEvent[];
      if (actionValidation.valid) {
        // Execute and report
        action.execute(actionContext);
        actionEvents = action.report ? action.report(actionContext) : [];
      } else {
        // Blocked - get error events
        actionEvents = action.blocked
          ? action.blocked(actionContext, actionValidation)
          : [{
              id: `meta_blocked_${Date.now()}`,
              type: 'if.event.command_error',
              timestamp: Date.now(),
              data: {
                messageId: `if.action.command.${actionValidation.error || 'validation_failed'}`,
                params: actionValidation.params || {},
                blocked: true,
                reason: actionValidation.error || 'validation_failed'
              },
              entities: {}
            }];
      }

      events.push(...actionEvents);

      // Handle platform operations inline (SAVE, RESTORE, QUIT, AGAIN, etc.)
      // These are handled BEFORE text processing so completion events get rendered
      const platformOps = events.filter(isPlatformRequestEvent);
      for (const op of platformOps) {
        const completionEvents = await this.processMetaPlatformOperation(op as IPlatformEvent);
        events.push(...completionEvents);
      }

      // Process events through text service and emit to clients
      // Events are NOT stored in turnEvents - processed immediately
      this.processMetaEvents(events);

      return {
        type: 'meta',
        input,
        success: actionValidation.valid,
        events,
        actionId: command.actionId
      };

    } catch (error: any) {
      const errorEvent: ISemanticEvent = {
        id: `meta_error_${Date.now()}`,
        type: 'command.failed',
        timestamp: Date.now(),
        data: {
          reason: error.message,
          input
        },
        entities: {}
      };
      events.push(errorEvent);

      this.processMetaEvents(events);

      return {
        type: 'meta',
        input,
        success: false,
        events,
        error: error.message,
        actionId: parsedCommand.action
      };
    }
  }

  /**
   * Process meta-command events: text service → emit to clients
   *
   * - Does NOT store in turnEvents
   * - Passes currentTurn for display context (turn/score shown to player)
   * - Turn counter is NOT incremented
   */
  private processMetaEvents(events: ISemanticEvent[]): void {
    if (!this.textService || events.length === 0) {
      return;
    }

    // Emit individual events through engine's event system (for tests/listeners)
    for (const event of events) {
      this.emit('event', event);
    }

    // Process events through text service (ADR-133: emit structured blocks)
    const blocks = this.textService.processTurn(events);

    // Append prompt block (ADR-137)
    this.appendPromptBlock(blocks);

    if (blocks.length > 0) {
      this.emit('text:output', blocks, this.context.currentTurn);
    }
    // ADR-163: meta commands also produce a channel packet.
    this.emitChannelPacket(events, blocks, this.context.currentTurn);
  }

  /**
   * Process a single platform operation for meta-commands.
   *
   * This is similar to processPlatformOperations but handles one operation
   * at a time and returns completion events for inclusion in the result.
   */
  private async processMetaPlatformOperation(platformOp: IPlatformEvent): Promise<ISemanticEvent[]> {
    const completionEvents: ISemanticEvent[] = [];

    switch (platformOp.type) {
      case PlatformEventType.SAVE_REQUESTED: {
        const context = platformOp.payload.context as ISaveContext;
        if (this.saveRestoreHooks?.onSaveRequested) {
          try {
            const saveData = this.createSaveData();
            if (context?.saveName) {
              saveData.metadata.description = context.saveName;
            }
            if (context?.metadata) {
              Object.assign(saveData.metadata, context.metadata);
            }
            await this.saveRestoreHooks.onSaveRequested(saveData);
            completionEvents.push(createSaveCompletedEvent(true));
          } catch (error: any) {
            completionEvents.push(createSaveCompletedEvent(false, error.message));
          }
        } else {
          completionEvents.push(createSaveCompletedEvent(false, 'No save handler registered'));
        }
        break;
      }

      case PlatformEventType.RESTORE_REQUESTED: {
        if (this.saveRestoreHooks?.onRestoreRequested) {
          try {
            const saveData = await this.saveRestoreHooks.onRestoreRequested();
            if (saveData) {
              this.loadSaveData(saveData);
              completionEvents.push(createRestoreCompletedEvent(true));
            } else {
              completionEvents.push(createRestoreCompletedEvent(false, 'No save data available'));
            }
          } catch (error: any) {
            completionEvents.push(createRestoreCompletedEvent(false, error.message));
          }
        } else {
          completionEvents.push(createRestoreCompletedEvent(false, 'No restore handler registered'));
        }
        break;
      }

      case PlatformEventType.QUIT_REQUESTED: {
        const context = platformOp.payload.context as IQuitContext;
        if (this.saveRestoreHooks?.onQuitRequested) {
          const shouldQuit = await this.saveRestoreHooks.onQuitRequested(context);
          if (shouldQuit) {
            this.stop('quit');
            completionEvents.push(createQuitConfirmedEvent());
          } else {
            completionEvents.push(createQuitCancelledEvent());
          }
        } else {
          // No quit hook - auto-confirm
          completionEvents.push(createQuitConfirmedEvent());
        }
        break;
      }

      case PlatformEventType.RESTART_REQUESTED: {
        const context = platformOp.payload.context as IRestartContext;
        if (this.saveRestoreHooks?.onRestartRequested) {
          const shouldRestart = await this.saveRestoreHooks.onRestartRequested(context);
          if (shouldRestart) {
            await this.restartGame();
            completionEvents.push(createRestartCompletedEvent(true));
          } else {
            completionEvents.push(createRestartCompletedEvent(false));
          }
        } else {
          // No restart hook — auto-confirm
          await this.restartGame();
          completionEvents.push(createRestartCompletedEvent(true));
        }
        break;
      }

      case PlatformEventType.UNDO_REQUESTED: {
        const success = this.undo();
        if (success) {
          completionEvents.push(createUndoCompletedEvent(true, this.context.currentTurn));
        } else {
          completionEvents.push(createUndoCompletedEvent(false, undefined, 'Nothing to undo'));
        }
        break;
      }

      case PlatformEventType.AGAIN_REQUESTED: {
        const againContext = platformOp.payload.context as IAgainContext;
        if (!againContext?.command) {
          completionEvents.push(createAgainFailedEvent('No command to repeat'));
        } else {
          // Recursive call - the repeated command will dispatch normally
          // (meta path if it was meta, regular path if it was regular)
          try {
            await this.executeTurn(againContext.command);
            // The repeated command handles its own text output
            // No completion event needed for successful AGAIN
          } catch (error: any) {
            completionEvents.push(createAgainFailedEvent(error.message));
          }
        }
        break;
      }
    }

    return completionEvents;
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

    const newActorTrait = newPlayer.get<ActorTrait>('actor');
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
    const oldActorTrait = oldPlayer.get<ActorTrait>('actor');
    if (oldActorTrait) {
      oldActorTrait.isPlayer = false;
    }

    // Set new PC's flag
    newActorTrait.isPlayer = true;

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
   * Configure language provider with narrative settings (ADR-089)
   *
   * Sets up the language provider for perspective-aware message resolution.
   * For 3rd person narratives, extracts player pronouns from ActorTrait.
   */
  private configureLanguageProviderNarrative(player: IFEntity): void {
    // Check if language provider supports narrative settings
    if (!this.languageProvider || !hasNarrativeSettings(this.languageProvider)) {
      return;
    }

    // Build narrative context for language provider
    const narrativeContext: NarrativeSettings = {
      perspective: this.narrativeSettings.perspective,
    };

    // For 3rd person, get player pronouns from ActorTrait or story config
    if (this.narrativeSettings.perspective === '3rd') {
      // First try story config
      if (this.narrativeSettings.playerPronouns) {
        narrativeContext.playerPronouns = this.narrativeSettings.playerPronouns;
      } else {
        // Fall back to player entity's ActorTrait
        const actorTrait = player.get(ActorTrait);
        if (actorTrait?.pronouns) {
          // Handle both single PronounSet and array of PronounSets
          const pronounSet = Array.isArray(actorTrait.pronouns)
            ? actorTrait.pronouns[0]
            : actorTrait.pronouns;
          narrativeContext.playerPronouns = pronounSet;
        }
      }
    }

    // Configure language provider (type narrowed by hasNarrativeSettings guard)
    this.languageProvider.setNarrativeSettings(narrativeContext);
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

    if (this.parser && hasWorldContext(this.parser)) {
      const playerLocation = this.world.getLocation(newPlayerId) || '';
      this.parser.setWorldContext(this.world, newPlayerId, playerLocation);
    }

    if (this.parser && hasPronounContext(this.parser)) {
      this.parser.resetPronounContext();
    }

    this.updateScopeVocabulary();
    this.configureLanguageProviderNarrative(newPlayer);
  }

  /**
   * Get plugin registry for registering turn-cycle plugins (ADR-120)
   */
  getPluginRegistry(): PluginRegistry {
    return this.pluginRegistry;
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
   * Get the dedicated action RNG stream (ADR-231 D6). Part of the
   * ISaveRestoreStateProvider contract — the save service persists this
   * stream's seed and the restore path re-seeds it.
   */
  getActionRandom(): SeededRandom {
    return this.actionRandom;
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
   * Execute input through an alternate input mode handler (ADR-137).
   *
   * Bypasses the standard parser pipeline. Events go through the text
   * service for rendering. Turn counter advances only if the handler says so.
   */
  private executeInputMode(
    input: string,
    handler: InputModeHandler,
    turn: number
  ): TurnResult {
    const events = handler.handleInput(input, this.world);

    // Emit events through engine event system
    for (const event of events) {
      this.emit('event', event);
    }

    // Process through text service
    if (this.textService) {
      const blocks = this.textService.processTurn(events);
      this.appendPromptBlock(blocks);
      if (blocks.length > 0) {
        this.emit('text:output', blocks, turn);
      }
      // ADR-163: alternate input modes also fire channel packets.
      this.emitChannelPacket(events, blocks, turn);
    }

    // Advance turn only if the mode says to
    if (handler.advancesTurn) {
      this.context.currentTurn++;
    }

    return {
      type: 'turn',
      turn,
      input,
      success: true,
      events,
    };
  }

  /**
   * Append a PROMPT block to the output (ADR-137).
   *
   * Reads the current prompt from world state, resolves through the
   * language provider, and appends as the last block.
   */
  private appendPromptBlock(blocks: ITextBlock[]): void {
    if (!this.languageProvider || !this.world) return;

    const prompt = this.world.getPrompt();
    const resolved = this.languageProvider.getMessage(
      prompt.messageId,
      prompt.params as Record<string, any>
    );

    // Only append if the message resolved (not echoed back as the ID)
    if (resolved && resolved !== prompt.messageId) {
      blocks.push({ key: BLOCK_KEYS.PROMPT, content: [resolved] });
    }
  }

  /**
   * Get the text service
   */
  getTextService(): IProsePipeline | undefined {
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
   * pipeline's `processTurn`. No-op if the text service is not yet constructed.
   *
   * @param contributor the slot contributor to register.
   */
  registerSlotContributor(contributor: SlotContributor): void {
    this.textService?.registerSlotContributor(contributor);
  }

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
  registerSlotEntry(entry: SlotEntry): void {
    this.textService?.registerSlotEntry(entry);
  }

  /**
   * Register save/restore hooks
   */
  registerSaveRestoreHooks(hooks: ISaveRestoreHooks): void {
    this.saveRestoreHooks = hooks;
  }

  /**
   * Get currently registered save/restore hooks
   */
  getSaveRestoreHooks(): ISaveRestoreHooks | undefined {
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
    if (!this.saveRestoreHooks) {
      return false; // No save capability
    }

    try {
      const saveData = this.createSaveData();
      await this.saveRestoreHooks.onSaveRequested(saveData);
      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  }

  /**
   * Restore game state using registered hooks
   */
  async restore(): Promise<boolean> {
    if (!this.saveRestoreHooks) {
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
      console.error('Restore failed:', error);
      return false;
    }
  }

  /**
   * Create an undo snapshot of the current world state
   */
  private createUndoSnapshot(): void {
    this.saveRestoreService.createUndoSnapshot(this.world, this.context.currentTurn);
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
   * Process events from a plugin through the shared pipeline (ADR-120)
   * Enriches, filters, stores, and emits events.
   */
  private processPluginEvents(
    events: ISemanticEvent[],
    turn: number,
    playerLocation: string | null | undefined
  ): void {
    const enrichmentContext = {
      turn,
      playerId: this.context.player.id,
      locationId: playerLocation ?? undefined
    };

    let processed = events.map(e => processEvent(e, enrichmentContext));

    if (this.perceptionService) {
      processed = this.perceptionService.filterEvents(
        processed,
        this.context.player,
        this.world
      );
    }

    // Add to turn events
    const existing = this.turnEvents.get(turn) || [];
    this.turnEvents.set(turn, [...existing, ...processed]);

    // Track in event source and check for platform requests
    for (const event of processed) {
      this.eventSource.emit(event);
      if (isPlatformRequestEvent(event)) {
        this.pendingPlatformOps.push(event as IPlatformEvent);
      }
    }

    // Emit through callbacks and event system
    if (this.config.onEvent) {
      for (const event of processed) {
        this.config.onEvent(event);
      }
    }
    for (const event of processed) {
      this.emit('event', event);
    }
  }

  /**
   * Create save data from current engine state
   */
  private createSaveData(): ISaveData {
    return this.saveRestoreService.createSaveData(this);
  }

  /**
   * Load save data into engine
   */
  private loadSaveData(saveData: ISaveData): void {
    const result = this.saveRestoreService.loadSaveData(saveData, this);

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
    const fullEvent: ISemanticEvent = {
      ...event,
      id: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: {
        ...existingData,
        turn: this.context.currentTurn
      }
    };

    this.platformEvents.addEvent(fullEvent);
  }

  /**
   * Update context after a turn
   */
  private updateContext(result: TurnResult): void {
    // Add to history
    this.context.history.push(result);

    // Trim history if needed
    if (this.context.history.length > this.config.maxHistory!) {
      this.context.history = this.context.history.slice(-this.config.maxHistory!);
    }

    // Increment turn
    this.context.currentTurn++;

    // Update last played
    this.context.metadata.lastPlayed = new Date();

    // Update vocabulary for new scope
    this.updateScopeVocabulary();

    this.emit('state:changed', this.context);
  }

  /**
   * Update command history capability
   */
  private updateCommandHistory(result: TurnResult, input: string, turn: number): void {
    // Get command history capability
    const historyData = this.world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData | null;
    if (!historyData) {
      // Command history capability not registered
      return;
    }

    // Note: Meta-commands (again, undo, save, etc.) are excluded by the isMeta check
    // in executeTurn before calling this function. No need for string-based exclusion.

    // Get the action ID from the result
    const actionId = result.actionId;
    if (!actionId) {
      // No action was executed (parse error, etc.)
      return;
    }

    // Extract the parsed command structure
    let parsedCommand: any = {
      verb: result.parsedCommand?.action || input.split(' ')[0]
    };

    // If we have a full parsed command structure, use it
    if (result.parsedCommand) {
      const parsed = result.parsedCommand;

      // Handle new ParsedCommand structure (has structure property)
      if (parsed.structure) {
        parsedCommand = {
          verb: parsed.structure.verb?.text || parsed.action,
          directObject: parsed.structure.directObject?.text,
          preposition: parsed.structure.preposition?.text,
          indirectObject: parsed.structure.indirectObject?.text
        };
      }
      // Handle old ParsedCommandV1 structure (directObject at top level)
      // Use type assertion for backward compatibility
      else {
        const v1 = parsed as unknown as { directObject?: { text?: string }; indirectObject?: { text?: string }; preposition?: string };
        if (v1.directObject || v1.indirectObject) {
          parsedCommand = {
            verb: parsed.action,
            directObject: v1.directObject?.text,
            preposition: v1.preposition,
            indirectObject: v1.indirectObject?.text
          };
        }
      }
    }

    // Create the history entry
    const entry: CommandHistoryEntry = {
      actionId,
      originalText: input,
      parsedCommand,
      turnNumber: turn,
      timestamp: Date.now()
    };

    // Add to history
    if (!historyData.entries) {
      historyData.entries = [];
    }
    historyData.entries.push(entry);

    // Trim to maxEntries if needed
    const maxEntries = historyData.maxEntries || 100;
    if (historyData.entries.length > maxEntries) {
      historyData.entries = historyData.entries.slice(-maxEntries);
    }
  }

  /**
   * Process pending platform operations
   */
  private async processPlatformOperations(turn?: number): Promise<void> {
    const currentTurn = turn ?? this.context.currentTurn;

    // Ensure there's an entry for the current turn
    if (!this.turnEvents.has(currentTurn)) {
      this.turnEvents.set(currentTurn, []);
    }

    // IMPORTANT: Save and clear pending ops at START to prevent infinite recursion
    // When AGAIN calls executeTurn() recursively, that nested call must not see
    // the same pending operations, or it will process AGAIN_REQUESTED again.
    const opsToProcess = [...this.pendingPlatformOps];
    this.pendingPlatformOps = [];

    // Process each pending operation
    for (const platformOp of opsToProcess) {
      try {
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED: {
            const context = platformOp.payload.context as ISaveContext;
            if (this.saveRestoreHooks?.onSaveRequested) {
              const saveData = this.createSaveData();
              // Add any additional context from the platform event
              if (context?.saveName) {
                saveData.metadata.description = context.saveName;
              }
              if (context?.metadata) {
                Object.assign(saveData.metadata, context.metadata);
              }
              
              await this.saveRestoreHooks.onSaveRequested(saveData);
              
              // Emit completion event
              const completionEvent = createSaveCompletedEvent(true);
              this.eventSource.emit(completionEvent);
              this.turnEvents.get(currentTurn)?.push(completionEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', completionEvent);
            } else {
              // No save hook registered
              const errorEvent = createSaveCompletedEvent(false, 'No save handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', errorEvent);
            }
            break;
          }
          
          case PlatformEventType.RESTORE_REQUESTED: {
            const context = platformOp.payload.context as IRestoreContext;
            if (this.saveRestoreHooks?.onRestoreRequested) {
              const saveData = await this.saveRestoreHooks.onRestoreRequested();
              if (saveData) {
                this.loadSaveData(saveData);
                
                // Emit completion event
                const completionEvent = createRestoreCompletedEvent(true);
                this.eventSource.emit(completionEvent);
                this.turnEvents.get(currentTurn)?.push(completionEvent);
                // Also emit through engine's event emitter for tests
                this.emit('event', completionEvent);
              } else {
                // User cancelled or no save available
                const errorEvent = createRestoreCompletedEvent(false, 'No save data available or restore cancelled');
                this.eventSource.emit(errorEvent);
                this.turnEvents.get(currentTurn)?.push(errorEvent);
                // Also emit through engine's event emitter for tests
                this.emit('event', errorEvent);
              }
            } else {
              // No restore hook registered
              const errorEvent = createRestoreCompletedEvent(false, 'No restore handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', errorEvent);
            }
            break;
          }
          
          case PlatformEventType.QUIT_REQUESTED: {
            const context = platformOp.payload.context as IQuitContext;
            
            if (this.saveRestoreHooks?.onQuitRequested) {
              const shouldQuit = await this.saveRestoreHooks.onQuitRequested(context);
              if (shouldQuit) {
                // Stop the engine with quit reason
                this.stop('quit');
                
                // Emit confirmation event
                const confirmEvent = createQuitConfirmedEvent();
                this.eventSource.emit(confirmEvent);
                const turnEvents = this.turnEvents.get(currentTurn);
                if (turnEvents) {
                  turnEvents.push(confirmEvent);
                }
                // Also emit through engine's event emitter for tests
                this.emit('event', confirmEvent);
              } else {
                // User cancelled quit
                const cancelEvent = createQuitCancelledEvent();
                this.eventSource.emit(cancelEvent);
                const turnEvents = this.turnEvents.get(currentTurn);
                if (turnEvents) {
                  turnEvents.push(cancelEvent);
                }
                // Also emit through engine's event emitter for tests
                this.emit('event', cancelEvent);
              }
            } else {
              // No quit hook registered, auto-confirm
              const confirmEvent = createQuitConfirmedEvent();
              this.eventSource.emit(confirmEvent);
              const turnEvents = this.turnEvents.get(currentTurn);
              if (turnEvents) {
                turnEvents.push(confirmEvent);
              }
              // Also emit through engine's event emitter for tests
              this.emit('event', confirmEvent);
            }
            
            break;
          }
          
          case PlatformEventType.RESTART_REQUESTED: {
            const context = platformOp.payload.context as IRestartContext;
            let shouldRestart = true;

            if (this.saveRestoreHooks?.onRestartRequested) {
              shouldRestart = await this.saveRestoreHooks.onRestartRequested(context);
            }

            if (shouldRestart) {
              const completionEvent = createRestartCompletedEvent(true);
              this.eventSource.emit(completionEvent);
              this.emit('event', completionEvent);
              await this.restartGame();
            } else {
              const cancelEvent = createRestartCompletedEvent(false);
              this.eventSource.emit(cancelEvent);
              this.emit('event', cancelEvent);
            }
            break;
          }

          case PlatformEventType.UNDO_REQUESTED: {
            const previousTurn = this.context.currentTurn;
            const success = this.undo();

            if (success) {
              const completionEvent = createUndoCompletedEvent(true, this.context.currentTurn);
              this.eventSource.emit(completionEvent);
              this.turnEvents.get(currentTurn)?.push(completionEvent);
              this.emit('event', completionEvent);
            } else {
              const errorEvent = createUndoCompletedEvent(false, undefined, 'Nothing to undo');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              this.emit('event', errorEvent);
            }
            break;
          }

          case PlatformEventType.AGAIN_REQUESTED: {
            const againContext = platformOp.payload.context as IAgainContext;

            if (!againContext?.command) {
              const errorEvent = createAgainFailedEvent('No command to repeat');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              this.emit('event', errorEvent);
              break;
            }

            // Re-execute the stored command
            // Note: The repeated command goes through normal validation/execution
            // and its events will be added to the current turn
            try {
              const repeatResult = await this.executeTurn(againContext.command);

              // Merge the repeated command's events into this turn
              // (executeTurn already stored them, but we want them in currentTurn's context)
              // The events are already emitted by executeTurn, no need to re-emit
            } catch (error) {
              const errorEvent = createAgainFailedEvent(
                error instanceof Error ? error.message : 'Failed to repeat command'
              );
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              this.emit('event', errorEvent);
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing platform operation ${platformOp.type}:`, error);

        // Emit appropriate error event based on operation type
        let errorEvent: IPlatformEvent;
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED:
            errorEvent = createSaveCompletedEvent(false, error instanceof Error ? error.message : 'Unknown error');
            break;
          case PlatformEventType.RESTORE_REQUESTED:
            errorEvent = createRestoreCompletedEvent(false, error instanceof Error ? error.message : 'Unknown error');
            break;
          case PlatformEventType.QUIT_REQUESTED:
            errorEvent = createQuitCancelledEvent();
            break;
          case PlatformEventType.RESTART_REQUESTED:
            errorEvent = createRestartCompletedEvent(false);
            break;
          case PlatformEventType.UNDO_REQUESTED:
            errorEvent = createUndoCompletedEvent(false, undefined, error instanceof Error ? error.message : 'Unknown error');
            break;
          case PlatformEventType.AGAIN_REQUESTED:
            errorEvent = createAgainFailedEvent(error instanceof Error ? error.message : 'Unknown error');
            break;
          default:
            continue;
        }
        
        this.eventSource.emit(errorEvent);
        this.turnEvents.get(currentTurn)?.push(errorEvent);
        // Also emit through engine's event emitter for tests
        this.emit('event', errorEvent);
      }
    }
    // Note: pendingPlatformOps was cleared at the start of this function
  }

  /**
   * Emit a game lifecycle event.
   * All game events now use ISemanticEvent with data in the `data` field.
   * (IGameEvent with `payload` is deprecated - see ADR-097)
   */
  private emitGameEvent(event: ISemanticEvent): void {
    this.emit('event', event);

    // Store in turn events for text-service processing
    if (this.context.currentTurn > 0) {
      const turnEvents = this.turnEvents.get(this.context.currentTurn) || [];
      turnEvents.push(event);
      this.turnEvents.set(this.context.currentTurn, turnEvents);
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
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Check if game is over
   */
  private isGameOver(): boolean {
    // Check story-specific completion
    if (this.story && this.story.isComplete) {
      return this.story.isComplete();
    }

    // Default: game never ends
    return false;
  }

  /**
   * The `cause` of a canonical player-death event (ADR-224) emitted during the
   * given turn, or `undefined` if the player did not die this turn. Scans the
   * turn's accumulated events, so it sees deaths from the action, interceptors,
   * and scheduler daemons alike. When several fire in one turn (rare), the first
   * is authoritative — `killPlayer` is idempotent, so later calls emit nothing.
   * @param turn the turn number whose events to scan
   */
  private playerDeathCauseThisTurn(turn: number): string | undefined {
    const events = this.turnEvents.get(turn) || [];
    for (const event of events) {
      if (event.type === PLAYER_DIED_EVENT) {
        const cause = (event.data as { cause?: unknown } | undefined)?.cause;
        return typeof cause === 'string' ? cause : 'unknown';
      }
    }
    return undefined;
  }

  /**
   * Whether the player is currently dead by their derived `HealthTrait` state
   * (ADR-226/ADR-224). A player with no `HealthTrait` is alive by default (the
   * opt-in rule) — `killPlayer` lazily attaches one, so a real death always has a
   * trait to read. This is the engine's "final word" after story policy has run.
   */
  private isPlayerDead(): boolean {
    const player = this.context.player;
    if (!player) return false;
    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    return health ? !HealthBehavior.isAlive(health) : false;
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


/**
 * Split a raw input line into chained statements (ADR pending — classic IF
 * command chaining). Separators are `.`, `;`, and the standalone word `then`.
 * Commas are NOT separators — they belong to multi-object phrases
 * ("take lamp, sword"). Empty statements (doubled or trailing separators)
 * are dropped.
 */
export function splitChainedInput(input: string): string[] {
  return input
    .split(/(?:[.;]|\bthen\b)+/i)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
