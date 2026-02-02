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
  StandardCapabilities,
  ITrait,
  TraitType,
  EntityType
} from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
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
  createScopeResolver
} from '@sharpee/stdlib';
import { LanguageProvider, IEventProcessorWiring } from '@sharpee/if-domain';
import { ITextService, createTextService, renderToString } from '@sharpee/text-service';
import { ISemanticEvent, ISystemEvent, IGenericEventSource, createSemanticEventSource, createGenericEventSource, ISaveData, ISaveRestoreHooks, ISaveResult, IRestoreResult, ISerializedEvent, ISerializedEntity, ISerializedLocation, ISerializedRelationship, ISerializedSpatialIndex, ISerializedTurn, IEngineState, ISaveMetadata, ISerializedParserState, IPlatformEvent, isPlatformRequestEvent, PlatformEventType, ISaveContext, IRestoreContext, IQuitContext, IRestartContext, IAgainContext, createSaveCompletedEvent, createRestoreCompletedEvent, createQuitConfirmedEvent, createQuitCancelledEvent, createRestartCompletedEvent, createUndoCompletedEvent, createAgainFailedEvent, ISemanticEventSource, GameEventType, createGameInitializingEvent, createGameInitializedEvent, createStoryLoadingEvent, createStoryLoadedEvent, createGameStartingEvent, createGameStartedEvent, createGameEndingEvent, createGameEndedEvent, createGameWonEvent, createGameLostEvent, createGameQuitEvent, createGameAbortedEvent, getUntypedEventData, createSeededRandom, SeededRandom } from '@sharpee/core';

import { PluginRegistry, TurnPluginContext } from '@sharpee/plugins';


import {
  GameContext,
  TurnResult,
  MetaCommandResult,
  CommandResult,
  EngineConfig,
  SequencedEvent,
  GameEvent
} from './types';
import { Story } from './story';
import { NarrativeSettings, buildNarrativeSettings } from './narrative';

import { CommandExecutor, createCommandExecutor, ParsedCommandTransformer } from './command-executor';
import { createActionContext } from './action-context-factory';
import { EventSequenceUtils, eventSequencer } from './event-sequencer';
import { toSequencedEvent, toSemanticEvent, processEvent } from './event-adapter';
import { IEngineAwareParser, hasPronounContext, hasPlatformEventEmitter, hasWorldContext } from './parser-interface';
import { VocabularyManager, createVocabularyManager } from './vocabulary-manager';
import { SaveRestoreService, createSaveRestoreService, ISaveRestoreStateProvider } from './save-restore-service';
import { TurnEventProcessor, createTurnEventProcessor, EnrichmentContext } from './turn-event-processor';
import { PlatformOperationHandler, createPlatformOperationHandler, EngineCallbacks } from './platform-operations';

/**
 * Game engine events
 */
export interface GameEngineEvents {
  'turn:start': (turn: number, input: string) => void;
  'turn:complete': (result: TurnResult) => void;
  'turn:failed': (error: Error, turn: number) => void;
  'event': (event: SequencedEvent) => void;
  'state:changed': (context: GameContext) => void;
  'game:over': (context: GameContext) => void;
  'text:output': (text: string, turn: number) => void;
  'text:channel': (channel: string, text: string, turn: number) => void;
}

type GameEngineEventName = keyof GameEngineEvents;
type GameEngineEventListener<K extends GameEngineEventName> = GameEngineEvents[K];

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
  private textService?: ITextService;
  private turnEvents = new Map<number, ISemanticEvent[]>();
  private running = false;
  private story?: Story;
  private languageProvider?: LanguageProvider;
  private parser?: Parser;
  private eventListeners = new Map<GameEngineEventName, Set<Function>>();
  private saveRestoreHooks?: ISaveRestoreHooks;
  private eventSource = createSemanticEventSource();
  private systemEventSource: IGenericEventSource<ISystemEvent>;
  private pendingPlatformOps: IPlatformEvent[] = [];
  private perceptionService?: IPerceptionService;
  private pluginRegistry: PluginRegistry;
  private random: SeededRandom;
  private narrativeSettings: NarrativeSettings;

  // Extracted services (Phase 4 remediation)
  private vocabularyManager: VocabularyManager;
  private saveRestoreService: SaveRestoreService;
  private turnEventProcessor: TurnEventProcessor;
  private platformOpHandler?: PlatformOperationHandler;

  // Phase 5: Track if initialized event has been emitted
  private hasEmittedInitialized = false;

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
          // Cast to Effect[] since handler returns unknown[] (to avoid circular deps)
          return handler(event) as any[];
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
        timestamp: new Date(event.timestamp),
        type: `system.${event.type}`,
        data: event.data,
        sequence: 0,
        turn: this.context.currentTurn,
        scope: 'global'
      } as SequencedEvent);
    });

    this.pluginRegistry = new PluginRegistry();
    this.random = createSeededRandom();
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
    this.textService = createTextService(this.languageProvider);
    
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
      this.systemEventSource
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

    // Initialize story-specific world content
    story.initializeWorld(this.world);
    
    // Create player if needed (or replace existing one)
    const newPlayer = story.createPlayer(this.world);
    this.context.player = newPlayer;
    this.world.setPlayer(newPlayer.id);

    // Configure language provider with narrative settings (ADR-089)
    this.configureLanguageProviderNarrative(newPlayer);

    // Update metadata
    this.context.metadata.title = story.config.title;
    this.context.metadata.author = Array.isArray(story.config.author)
      ? story.config.author.join(', ')
      : story.config.author;
    this.context.metadata.version = story.config.version;

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
   * Start the game engine
   */
  start(): void {
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
    
    // Get version info from StoryInfoTrait (or fall back to legacy (world as any) for backward compat)
    const storyInfoEntities = this.world.findByTrait('storyInfo' as any);
    const storyInfoTrait = storyInfoEntities[0]?.get<any>('storyInfo');
    const engineVersion = storyInfoTrait?.engineVersion || (this.world as any).versionInfo?.engineVersion;
    const clientVersion = storyInfoTrait?.clientVersion || (this.world as any).versionInfo?.clientVersion || (this.world as any).clientVersion;

    // Emit game started event
    const startedEvent = createGameStartedEvent({
      id: this.story?.config.id,
      title: this.context.metadata.title,
      author: this.context.metadata.author,
      version: this.context.metadata.version,
      buildDate: this.story?.config.buildDate
    }, this.sessionStartTime, engineVersion, clientVersion);
    this.emitGameEvent(startedEvent);

    this.emit('state:changed', this.context);
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
   * Execute a turn
   */
  async executeTurn(input: string): Promise<TurnResult> {
    if (!this.running) {
      throw new Error('Engine is not running');
    }

    if (!this.commandExecutor) {
      throw new Error('Engine must have a story set before executing turns');
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
      const errorEvent = eventSequencer.sequence({
        type: 'command.failed',
        data: {
          reason: 'Input cannot be null or undefined',
          input: input
        }
      }, turn);
      
      return {
        turn,
        input: input,
        success: false,
        events: [errorEvent],
        error: 'Input cannot be null or undefined'
      };
    }

    this.emit('turn:start', turn, input);

    try {
      // Early detection: Parse first to check if this is a meta-command
      // Meta-commands (VERSION, SCORE, HELP, etc.) take a completely separate path
      // that doesn't interact with turn machinery (no turn increment, no NPCs, etc.)
      if (this.parser) {
        // Set world context for parser
        const player = this.world.getPlayer();
        if (player && hasWorldContext(this.parser)) {
          const playerLocation = this.world.getLocation(player.id) || '';
          (this.parser as any).setWorldContext(this.world, player.id, playerLocation);
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
              events: metaResult.events.map(e => eventSequencer.sequence(e as any, turn)),
              error: metaResult.error,
              actionId: metaResult.actionId
            };
          }
        }
        // If parse failed or not a meta-command, fall through to regular execution
      }

      // Regular command path - full turn processing
      // Execute the command
      const result = await this.commandExecutor.execute(
        input,
        this.world,
        this.context,
        this.config
      );

      // Get context for event enrichment
      const playerLocation = this.world.getLocation(this.context.player.id);
      const enrichmentContext = {
        turn,
        playerId: this.context.player.id,
        locationId: playerLocation
      };
      
      // Store events for this turn (convert to SemanticEvent and process through pipeline)
      let semanticEvents = result.events.map(e => {
        const semantic = toSemanticEvent(e);
        return processEvent(semantic, enrichmentContext);
      });

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

        // NOTE: Entity handlers (entity.on) are already dispatched by the
        // event-processor in the command executor, so we don't call
        // dispatchEntityHandlers here to avoid duplicate handler invocations.

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
        const pluginContext: TurnPluginContext = {
          world: this.world,
          turn,
          playerId: this.context.player.id,
          playerLocation: playerLocation || '',
          random: this.random,
          actionResult: {
            actionId: result.actionId || '',
            success: result.success,
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
        result.events = allTurnEvents as any; // Platform ops may have added completion events
      }

      // Process text output (ADR-096)
      if (this.textService) {
        const turnEvents = this.turnEvents.get(turn) || [];
        const blocks = this.textService.processTurn(turnEvents);
        const output = renderToString(blocks);
        if (output) {
          this.emit('text:output', output, turn);
        }
      }

      // Clear turn events after processing to prevent accumulation on same turn (meta commands)
      this.turnEvents.set(turn, []);

      // Emit completion
      this.emit('turn:complete', result);

      // Check for victory from events
      if (victoryDetected) {
        this.stop('victory', victoryDetails);
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
      const validationResult = (this.commandExecutor as any).validator.validate(parsedCommand);

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
      const actionContext = createActionContext(this.world, this.context, command, action, scopeResolver);

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
      this.emit('event', event as any);
    }

    // Process events through text service
    const blocks = this.textService.processTurn(events);
    const output = renderToString(blocks);

    if (output) {
      // Emit text output with current turn number (for display context only)
      this.emit('text:output', output, this.context.currentTurn);
    }
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
          if (shouldRestart && this.story) {
            if (this.running) this.stop();
            if (this.parser && hasPronounContext(this.parser)) {
              this.parser.resetPronounContext();
            }
            await this.setStory(this.story);
            this.start();
            completionEvents.push(createRestartCompletedEvent(true));
          } else {
            completionEvents.push(createRestartCompletedEvent(false));
          }
        } else if (this.story) {
          // Default: restart
          if (this.running) this.stop();
          if (this.parser && hasPronounContext(this.parser)) {
            this.parser.resetPronounContext();
          }
          await this.setStory(this.story);
          this.start();
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
    if (!this.languageProvider || !('setNarrativeSettings' in this.languageProvider)) {
      return;
    }

    // Build narrative context for language provider
    const narrativeContext: { perspective: '1st' | '2nd' | '3rd'; playerPronouns?: any } = {
      perspective: this.narrativeSettings.perspective,
    };

    // For 3rd person, get player pronouns from ActorTrait or story config
    if (this.narrativeSettings.perspective === '3rd') {
      // First try story config
      if (this.narrativeSettings.playerPronouns) {
        narrativeContext.playerPronouns = this.narrativeSettings.playerPronouns;
      } else {
        // Fall back to player entity's ActorTrait
        const actorTrait = player.get<any>('actor');
        if (actorTrait?.pronouns) {
          // Handle both single PronounSet and array of PronounSets
          narrativeContext.playerPronouns = Array.isArray(actorTrait.pronouns)
            ? actorTrait.pronouns[0]
            : actorTrait.pronouns;
        }
      }
    }

    // Configure language provider
    (this.languageProvider as any).setNarrativeSettings(narrativeContext);
  }

  /**
   * Get plugin registry for registering turn-cycle plugins (ADR-120)
   */
  getPluginRegistry(): PluginRegistry {
    return this.pluginRegistry;
  }

  /**
   * Get event processor for handler registration (ADR-075)
   */
  getEventProcessor(): EventProcessor {
    return this.eventProcessor;
  }

  /**
   * Get the text service
   */
  getTextService(): ITextService | undefined {
    return this.textService;
  }

  /**
   * Set a custom text service
   */
  setTextService(service: ITextService): void {
    this.textService = service;
  }

  /**
   * Register save/restore hooks
   */
  registerSaveRestoreHooks(hooks: ISaveRestoreHooks): void {
    this.saveRestoreHooks = hooks;
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

    // Update vocabulary for current scope
    this.updateScopeVocabulary();

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
        this.config.onEvent(event as any);
      }
    }
    for (const event of processed) {
      this.emit('event', event as any);
      this.dispatchEntityHandlers(event as any);
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

    // Reset pronoun context - old references may not be valid (ADR-089)
    if (this.parser && hasPronounContext(this.parser)) {
      this.parser.resetPronounContext();
    }

    // Update vocabulary for current scope
    this.updateScopeVocabulary();

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
  getRecentEvents(count = 10): SequencedEvent[] {
    const allEvents: SequencedEvent[] = [];
    
    // Collect events from recent turns
    const recentTurns = this.context.history.slice(-Math.ceil(count / 5));
    for (const turn of recentTurns) {
      allEvents.push(...turn.events);
    }

    // Sort and return most recent
    return EventSequenceUtils.sort(allEvents).slice(-count);
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
              this.emit('event', completionEvent as any);
            } else {
              // No save hook registered
              const errorEvent = createSaveCompletedEvent(false, 'No save handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', errorEvent as any);
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
                this.emit('event', completionEvent as any);
              } else {
                // User cancelled or no save available
                const errorEvent = createRestoreCompletedEvent(false, 'No save data available or restore cancelled');
                this.eventSource.emit(errorEvent);
                this.turnEvents.get(currentTurn)?.push(errorEvent);
                // Also emit through engine's event emitter for tests
                this.emit('event', errorEvent as any);
              }
            } else {
              // No restore hook registered
              const errorEvent = createRestoreCompletedEvent(false, 'No restore handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', errorEvent as any);
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
                this.emit('event', confirmEvent as any);
              } else {
                // User cancelled quit
                const cancelEvent = createQuitCancelledEvent();
                this.eventSource.emit(cancelEvent);
                const turnEvents = this.turnEvents.get(currentTurn);
                if (turnEvents) {
                  turnEvents.push(cancelEvent);
                }
                // Also emit through engine's event emitter for tests
                this.emit('event', cancelEvent as any);
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
              this.emit('event', confirmEvent as any);
            }
            
            break;
          }
          
          case PlatformEventType.RESTART_REQUESTED: {
            const context = platformOp.payload.context as IRestartContext;
            if (this.saveRestoreHooks?.onRestartRequested) {
              const shouldRestart = await this.saveRestoreHooks.onRestartRequested(context);
              if (shouldRestart) {
                // Emit completion event
                const completionEvent = createRestartCompletedEvent(true);
                this.eventSource.emit(completionEvent);
                this.turnEvents.get(currentTurn)?.push(completionEvent);
                // Also emit through engine's event emitter for tests
                this.emit('event', completionEvent as any);
                
                // Re-initialize the story
                if (this.story) {
                  // Stop first if running
                  if (this.running) {
                    this.stop();
                  }
                  // Reset pronoun context (ADR-089)
                  if (this.parser && hasPronounContext(this.parser)) {
                    this.parser.resetPronounContext();
                  }
                  await this.setStory(this.story);
                  this.start();
                }
              } else {
                // Restart was cancelled
                const cancelEvent = createRestartCompletedEvent(false);
                this.eventSource.emit(cancelEvent);
                this.turnEvents.get(currentTurn)?.push(cancelEvent);
                // Also emit through engine's event emitter for tests
                this.emit('event', cancelEvent as any);
              }
            } else {
              // No restart hook registered - default behavior is to restart
              const completionEvent = createRestartCompletedEvent(true);
              this.eventSource.emit(completionEvent);
              this.turnEvents.get(currentTurn)?.push(completionEvent);
              // Also emit through engine's event emitter for tests
              this.emit('event', completionEvent as any);

              // Re-initialize the story
              if (this.story) {
                // Stop first if running
                if (this.running) {
                  this.stop();
                }
                // Reset pronoun context (ADR-089)
                if (this.parser && hasPronounContext(this.parser)) {
                  this.parser.resetPronounContext();
                }
                await this.setStory(this.story);
                this.start();
              }
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
              this.emit('event', completionEvent as any);
            } else {
              const errorEvent = createUndoCompletedEvent(false, undefined, 'Nothing to undo');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              this.emit('event', errorEvent as any);
            }
            break;
          }

          case PlatformEventType.AGAIN_REQUESTED: {
            const againContext = platformOp.payload.context as IAgainContext;

            if (!againContext?.command) {
              const errorEvent = createAgainFailedEvent('No command to repeat');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(currentTurn)?.push(errorEvent);
              this.emit('event', errorEvent as any);
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
              this.emit('event', errorEvent as any);
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
        this.emit('event', errorEvent as any);
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
    // Create a GameEvent for the sequencer (internal type)
    const gameEvent: GameEvent = {
      type: event.type,
      data: {
        ...(typeof event.data === 'object' && event.data !== null ? event.data : {}),
        id: event.id,
        timestamp: event.timestamp,
        entities: event.entities || {}
      }
    };

    // Sequence and emit
    const sequencedEvent = eventSequencer.sequence(gameEvent, this.context.currentTurn);
    this.emit('event', sequencedEvent);

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
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Dispatch an event to entity handlers (entity.on)
   * Entities can define handlers for specific event types
   */
  private dispatchEntityHandlers(event: SequencedEvent): void {
    // Get all entities that might have handlers
    const entities = this.world.getAllEntities();

    for (const entity of entities) {
      // Check if entity has event handlers defined
      const handlers = (entity as any).on;
      if (!handlers || typeof handlers !== 'object') {
        continue;
      }

      // Check if there's a handler for this event type
      const handler = handlers[event.type];
      if (typeof handler === 'function') {
        try {
          // Call the handler with the event and world
          const result = handler(event, this.world);

          // If handler returns events, add them to the current turn
          if (Array.isArray(result)) {
            const turnEvents = this.turnEvents.get(this.context.currentTurn) || [];
            for (const reactionEvent of result) {
              turnEvents.push(reactionEvent);
              this.emit('event', reactionEvent);
            }
            this.turnEvents.set(this.context.currentTurn, turnEvents);
          }
        } catch (error) {
          console.error(`Error in entity handler for ${entity.id} on ${event.type}:`, error);
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

