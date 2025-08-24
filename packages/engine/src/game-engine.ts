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
  IFActions,
  MetaCommandRegistry
} from '@sharpee/stdlib';
import { LanguageProvider } from '@sharpee/if-domain';
import { TextService, TextServiceContext, TextOutput } from '@sharpee/if-services';
import { ISemanticEvent, createSemanticEventSource, ISaveData, ISaveRestoreHooks, ISaveResult, IRestoreResult, ISerializedEvent, ISerializedEntity, ISerializedLocation, ISerializedRelationship, ISerializedSpatialIndex, ISerializedTurn, IEngineState, ISaveMetadata, ISerializedParserState, IPlatformEvent, isPlatformRequestEvent, PlatformEventType, ISaveContext, IRestoreContext, IQuitContext, IRestartContext, createSaveCompletedEvent, createRestoreCompletedEvent, createQuitConfirmedEvent, createQuitCancelledEvent, createRestartCompletedEvent, ISemanticEventSource, GameEventType, createGameInitializingEvent, createGameInitializedEvent, createStoryLoadingEvent, createStoryLoadedEvent, createGameStartingEvent, createGameStartedEvent, createGameEndingEvent, createGameEndedEvent, createGameWonEvent, createGameLostEvent, createGameQuitEvent, createGameAbortedEvent } from '@sharpee/core';

import {
  GameContext,
  TurnResult,
  EngineConfig,
  GameState,
  SequencedEvent,
  GameEvent
} from './types';
import { Story } from './story';

import { CommandExecutor, createCommandExecutor } from './command-executor';
import { EventSequenceUtils, eventSequencer } from './event-sequencer';
import { toSequencedEvent, toSemanticEvent, processEvent } from './event-adapter';

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
  private textService?: TextService;
  private turnEvents = new Map<number, ISemanticEvent[]>();
  private running = false;
  private story?: Story;
  private languageProvider?: LanguageProvider;
  private parser?: Parser;
  private eventListeners = new Map<GameEngineEventName, Set<Function>>();
  private saveRestoreHooks?: ISaveRestoreHooks;
  private eventSource = createSemanticEventSource();
  private systemEventSource?: any; // GenericEventSource<SystemEvent>
  private pendingPlatformOps: IPlatformEvent[] = [];

  constructor(options: {
    world: WorldModel;
    player: IFEntity;
    parser: Parser;
    language: LanguageProvider;
    textService: TextService;
    config?: EngineConfig;
  }) {
    this.world = options.world;
    this.config = {
      maxHistory: 100,
      validateEvents: true,
      collectTiming: false,
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
    this.platformEvents = createSemanticEventSource();
    
    // Set provided dependencies
    this.languageProvider = options.language;
    this.parser = options.parser;
    this.textService = options.textService;
    
    // Update action registry with language provider
    this.actionRegistry.setLanguageProvider(this.languageProvider);
    
    // Wire parser with platform events if supported
    if (this.parser && 'setPlatformEventEmitter' in this.parser) {
      (this.parser as any).setPlatformEventEmitter((event: any) => {
        this.platformEvents.addEvent(event);
      });
    }
    
    // Create command executor with dependencies
    this.commandExecutor = createCommandExecutor(
      this.world,
      this.actionRegistry,
      this.eventProcessor,
      this.parser
    );
    
    // Query handling is now managed by the platform layer
    // Platform owns the QueryManager and handles all queries
    
    // Emit initialized event now that engine is set up
    // We'll defer this slightly to ensure all listeners are attached
    setTimeout(() => {
      const initializedEvent = createGameInitializedEvent();
      this.emitGameEvent(initializedEvent);
    }, 0);
  }

  /**
   * Set the story for this engine
   */
  setStory(story: Story): void {
    // Emit story loading event
    const loadingEvent = createStoryLoadingEvent(story.config.id);
    this.emitGameEvent(loadingEvent);
    
    this.story = story;
    
    // Initialize story-specific world content
    story.initializeWorld(this.world);
    
    // Create player if needed (or replace existing one)
    const newPlayer = story.createPlayer(this.world);
    this.context.player = newPlayer;
    this.world.setPlayer(newPlayer.id);
    
    // Update metadata
    this.context.metadata.title = story.config.title;
    this.context.metadata.author = Array.isArray(story.config.author) 
      ? story.config.author.join(', ') 
      : story.config.author;
    this.context.metadata.version = story.config.version;
    
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
    
    // Emit game started event
    const startedEvent = createGameStartedEvent({
      id: this.story?.config.id,
      title: this.context.metadata.title,
      author: this.context.metadata.author,
      version: this.context.metadata.version
    }, this.sessionStartTime);
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
      // Query handling is managed by the platform layer
      // Platform will intercept input before it reaches here
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
      const semanticEvents = result.events.map(e => {
        const semantic = toSemanticEvent(e);
        return processEvent(semantic, enrichmentContext);
      });
      this.turnEvents.set(turn, semanticEvents);
      
      // Also track in event source for save/restore
      for (const semanticEvent of semanticEvents) {
        this.eventSource.emit(semanticEvent);
        
        // Check if this is a client.query event
        if (semanticEvent.type === 'client.query') {
          // The handleClientQuery will be called by the event listener
        }
        
        // Check if this is a platform request event
        if (isPlatformRequestEvent(semanticEvent)) {
          this.pendingPlatformOps.push(semanticEvent as IPlatformEvent);
        }
      }

      // Check if this is a meta-command (out-of-world action)
      // Meta-commands don't increment turns, trigger NPCs, or get recorded in history
      const isMeta = result.actionId ? MetaCommandRegistry.isMeta(result.actionId) : false;

      // Update command history if command was successful and not a meta-command
      if (result.success && !isMeta) {
        this.updateCommandHistory(result, input, turn);
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
        
        // Check for story victory event but don't stop immediately
        // (we're still processing the turn)
        if (event.type === 'story.victory') {
          victoryDetected = true;
          victoryDetails = {
            reason: event.data?.reason || 'Story completed',
            score: event.data?.score || 0
          };
        }
      }

      // Update context only for non-meta commands
      if (!isMeta) {
        this.updateContext(result);
        // Update session statistics
        this.sessionTurns++;
        if (result.success) {
          this.sessionMoves++;
        }
      } else {
        // For meta-commands, only update vocabulary (scope may have changed)
        this.updateScopeVocabulary();
      }

      // Process pending platform operations before text service
      if (this.pendingPlatformOps.length > 0) {
        await this.processPlatformOperations(turn);
      }

      // Process text output
      if (this.textService) {
        // Create context for text service
        const textContext: TextServiceContext = {
          currentTurn: turn,
          getCurrentTurnEvents: () => this.turnEvents.get(turn) || [],
          getEventsByType: (type: string) => {
            const events = this.turnEvents.get(turn) || [];
            return events.filter(e => e.type === type);
          },
          getAllEvents: () => {
            const allEvents: ISemanticEvent[] = [];
            for (const [, events] of this.turnEvents) {
              allEvents.push(...events);
            }
            return allEvents;
          },
          world: this.world,
          getPlayer: () => this.context.player,
          getContents: (locationId: string) => this.world.getContents(locationId),
          getLocation: (entityId: string) => {
            const entity = this.world.getEntity(entityId);
            if (!entity) return null;
            return this.world.getLocation(entityId) || null;
          },
          getPlatformEvents: () => {
            // Get platform events for the current turn only
            // Filter by turn number in the event data
            const currentTurn = turn;
            return this.platformEvents.getAllEvents()
              .filter((e: any) => {
                if (!e.tags?.includes('platform')) return false;
                // Check if event has turn data
                const eventTurn = (e.data as any)?.turn;
                // If no turn data, assume it's from initialization (turn 0)
                return eventTurn === undefined ? currentTurn === 1 : eventTurn === currentTurn;
              });
          }
        };
        
        // Initialize text service with context
        this.textService.initialize(textContext);
        
        // Process turn and get output
        const output = this.textService.processTurn();
        
        // Emit appropriate output based on type
        if (typeof output === 'string') {
          this.emit('text:output', output, turn);
        } else if (output.type === 'json') {
          this.emit('text:output', JSON.stringify(output, null, 2), turn);
        } else if (output.type === 'channeled') {
          // Emit each channel separately
          for (const [channel, text] of output.channels) {
            this.emit('text:channel', channel, text, turn);
          }
          // Also emit the main channel as text:output
          const mainText = output.channels.get('main');
          if (mainText) {
            this.emit('text:output', mainText, turn);
          }
        }
      }

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
          score: 0  // TODO: Get score from story or scoring capability
        });
      }

      return result;

    } catch (error: any) {
      this.emit('turn:failed', error as Error, turn);
      throw error;
    }
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
   * Get the text service
   */
  getTextService(): TextService | undefined {
    return this.textService;
  }
  
  /**
   * Set a custom text service
   */
  setTextService(service: TextService): void {
    this.textService = service;
    
    // Set language provider if we have one
    if (this.languageProvider) {
      this.textService.setLanguageProvider(this.languageProvider);
    }
  }

  /**
   * Register save/restore hooks
   */
  registerSaveRestoreHooks(hooks: ISaveRestoreHooks): void {
    this.saveRestoreHooks = hooks;
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
   * Create save data from current engine state
   */
  private createSaveData(): ISaveData {
    const metadata: ISaveMetadata = {
      storyId: this.story?.config.id || 'unknown',
      storyVersion: this.story?.config.version || '0.0.0',
      turnCount: this.context.currentTurn - 1,
      playTime: Date.now() - this.context.metadata.started.getTime(),
      description: `Turn ${this.context.currentTurn - 1}`
    };

    const engineState: IEngineState = {
      eventSource: this.serializeEventSource(),
      spatialIndex: this.serializeSpatialIndex(),
      turnHistory: this.serializeTurnHistory(),
      parserState: this.serializeParserState()
    };

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      metadata,
      engineState,
      storyConfig: {
        id: this.story?.config.id || 'unknown',
        version: this.story?.config.version || '0.0.0',
        title: this.story?.config.title || 'Unknown',
        author: Array.isArray(this.story?.config.author) 
          ? this.story.config.author.join(', ') 
          : (this.story?.config.author || 'Unknown')
      }
    };
  }

  /**
   * Load save data into engine
   */
  private loadSaveData(saveData: ISaveData): void {
    // Validate save compatibility
    if (saveData.version !== '1.0.0') {
      throw new Error(`Unsupported save version: ${saveData.version}`);
    }

    if (saveData.storyConfig?.id && this.story?.config.id && 
        saveData.storyConfig.id !== this.story.config.id) {
      throw new Error(`Save is for different story: ${saveData.storyConfig.id}`);
    }

    // Restore event source
    this.deserializeEventSource(saveData.engineState.eventSource);

    // Restore spatial index (world state)
    this.deserializeSpatialIndex(saveData.engineState.spatialIndex);

    // Restore turn history
    this.deserializeTurnHistory(saveData.engineState.turnHistory);

    // Restore parser state if present
    if (saveData.engineState.parserState) {
      this.deserializeParserState(saveData.engineState.parserState);
    }

    // Update context
    this.context.currentTurn = saveData.metadata.turnCount + 1;
    this.context.metadata.lastPlayed = new Date();

    // Update vocabulary for current scope
    this.updateScopeVocabulary();

    this.emit('state:changed', this.context);
  }

  /**
   * @deprecated Use save() instead
   */
  saveState(): GameState {
    return {
      version: '1.0.0',
      turn: this.context.currentTurn,
      world: this.serializeWorld(),
      context: this.context,
      saved: new Date()
    };
  }

  /**
   * @deprecated Use restore() instead
   */
  loadState(state: GameState): void {
    // Validate version
    if (state.version !== '1.0.0') {
      throw new Error(`Unsupported save version: ${state.version}`);
    }

    // Restore world
    this.deserializeWorld(state.world);

    // Restore context
    this.context = state.context;
    this.context.metadata.lastPlayed = new Date();

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
    const identityTrait = entity.get('IDENTITY');
    if (identityTrait && typeof identityTrait === 'object') {
      const identity = identityTrait as any;
      // Build nouns from name and aliases
      const nouns: string[] = [];
      if (identity.name) {
        nouns.push(identity.name.toLowerCase());
      }
      if (identity.aliases && Array.isArray(identity.aliases)) {
        nouns.push(...identity.aliases);
      }
      
      vocabularyRegistry.registerEntity({
        entityId: entity.id,
        nouns: nouns,
        adjectives: [],
        inScope
      });
    }
  }
  
  /**
   * Update vocabulary for all entities in scope
   */
  updateScopeVocabulary(): void {
    const inScope = this.world.getInScope(this.context.player.id);
    
    // Mark all entities as out of scope first
    for (const entity of this.world.getAllEntities()) {
      this.updateEntityVocabulary(entity, false);
    }

    // Mark in-scope entities
    for (const entity of inScope) {
      this.updateEntityVocabulary(entity, true);
    }
  }

  /**
   * Emit a platform event with turn metadata
   */
  emitPlatformEvent(event: Omit<ISemanticEvent, 'id' | 'timestamp'>): void {
    const fullEvent: ISemanticEvent = {
      ...event,
      id: `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: {
        ...(event.data as any || {}),
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

    // Check if this was an AGAIN command execution
    const executeCommandEvent = result.events.find(e => e.type === 'if.event.execute_command');
    if (executeCommandEvent && executeCommandEvent.data?.isRepeat) {
      // This is the AGAIN action itself - execute the repeated command
      const repeatedCommand = executeCommandEvent.data.command;
      const originalText = executeCommandEvent.data.originalText;
      
      // Execute the repeated command
      // Note: This is a simplified approach. In a full implementation, you might want to
      // re-parse and re-execute through the normal flow
      this.executeTurn(originalText).then(repeatedResult => {
        // The repeated command will update its own history
      }).catch(error => {
        console.error('Failed to repeat command:', error);
      });
      
      // Don't record the AGAIN command itself
      return;
    }

    // Get the action ID from the result
    const actionId = result.actionId;
    if (!actionId) {
      // No action was executed (parse error, etc.)
      return;
    }

    // Don't record non-repeatable actions
    const nonRepeatable = [
      IFActions.AGAIN,
      IFActions.SAVING,
      IFActions.RESTORING,
      IFActions.QUITTING,
      IFActions.RESTARTING,
      IFActions.VERSION,
      IFActions.VERIFYING
    ];
    
    if (nonRepeatable.includes(actionId as any)) {
      return;
    }

    // Extract the parsed command structure
    let parsedCommand: any = {
      verb: result.parsedCommand?.action || input.split(' ')[0]
    };

    // If we have a full parsed command structure, use it
    if (result.parsedCommand) {
      const parsed = result.parsedCommand;
      
      // Handle new ParsedCommand structure
      if (parsed.structure) {
        parsedCommand = {
          verb: parsed.structure.verb?.text || parsed.action,
          directObject: parsed.structure.directObject?.text,
          preposition: parsed.structure.preposition?.text,
          indirectObject: parsed.structure.indirectObject?.text
        };
      }
      // Handle old ParsedCommandV1 structure
      else if (parsed.directObject || parsed.indirectObject) {
        parsedCommand = {
          verb: parsed.action,
          directObject: parsed.directObject?.text,
          preposition: parsed.preposition,
          indirectObject: parsed.indirectObject?.text
        };
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
    
    // Process each pending operation
    for (const platformOp of this.pendingPlatformOps) {
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
                await this.setStory(this.story);
                this.start();
              }
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
          default:
            continue;
        }
        
        this.eventSource.emit(errorEvent);
        this.turnEvents.get(currentTurn)?.push(errorEvent);
        // Also emit through engine's event emitter for tests
        this.emit('event', errorEvent as any);
      }
    }
    
    // Clear pending operations
    this.pendingPlatformOps = [];
  }

  /**
   * Emit a game lifecycle event
   */
  private emitGameEvent(event: any): void {
    // Create a GameEvent that's compatible with the engine's type system
    const gameEvent: GameEvent = {
      type: event.type,
      data: {
        ...(event.data as any || {}),
        id: event.id || `event-${Date.now()}`,
        timestamp: event.timestamp || Date.now(),
        entities: event.entities || {}
      }
    };
    
    // Convert to sequenced event for consistency
    const sequencedEvent = eventSequencer.sequence(gameEvent, this.context.currentTurn);
    
    // Emit through event emitter
    this.emit('event', sequencedEvent);
    
    // Store in turn events if we're in a turn (as SemanticEvent for compatibility)
    if (this.context.currentTurn > 0) {
      const semanticEvent: ISemanticEvent = {
        id: event.id || gameEvent.data?.id as string,
        type: event.type,
        timestamp: event.timestamp || Date.now(),
        entities: event.entities || {},
        data: event.data || {}
      };
      const turnEvents = this.turnEvents.get(this.context.currentTurn) || [];
      turnEvents.push(semanticEvent);
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
   * Serialize world state
   */
  private serializeWorld(): unknown {
    // Simple implementation - override for better serialization
    return {
      entities: this.world.getAllEntities().map((e: IFEntity) => ({
        id: e.id,
        traits: Array.from(e.traits.entries())
      }))
    };
  }

  /**
   * Deserialize world state
   */
  private deserializeWorld(data: unknown): void {
    // Simple implementation - override for better deserialization
    console.warn('World deserialization not fully implemented');
  }

  /**
   * Serialize event source
   */
  private serializeEventSource(): ISerializedEvent[] {
    const events: ISerializedEvent[] = [];
    
    // Get all events from the event source
    for (const event of this.eventSource.getAllEvents()) {
      events.push({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp || Date.now(),
        data: this.serializeEventData(event.data)
      });
    }
    
    return events;
  }

  /**
   * Serialize event data, handling functions and special types
   */
  private serializeEventData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return (data || {}) as Record<string, unknown>;
    }
    
    const serialized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'function') {
        // Mark functions for special handling during deserialization
        // Store function marker instead of the actual function
        serialized[key] = { __type: 'function', __marker: '[Function]' };
      } else if (value && typeof value === 'object') {
        // Recursively serialize nested objects
        if (Array.isArray(value)) {
          serialized[key] = value.map(item => 
            typeof item === 'object' ? this.serializeEventData(item) : item
          );
        } else {
          serialized[key] = this.serializeEventData(value);
        }
      } else {
        // Primitive values can be stored directly
        serialized[key] = value;
      }
    }
    
    return serialized;
  }

  /**
   * Deserialize event source
   */
  private deserializeEventSource(events: ISerializedEvent[]): void {
    // Clear existing event source
    this.eventSource = createSemanticEventSource();
    
    // Replay events
    for (const event of events) {
      this.eventSource.emit({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: this.deserializeEventData(event.data),
        entities: {}
      });
    }
  }

  /**
   * Deserialize event data, handling function markers
   */
  private deserializeEventData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Check if this is a function marker
    if ((data as any).__type === 'function') {
      // Return a placeholder function that indicates it was serialized
      // This maintains the shape of the data but won't execute
      return () => '[Serialized Function]';
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.deserializeEventData(item));
    }
    
    const deserialized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      deserialized[key] = this.deserializeEventData(value);
    }
    
    return deserialized;
  }

  /**
   * Serialize spatial index (world state)
   */
  private serializeSpatialIndex(): ISerializedSpatialIndex {
    const entities: Record<string, ISerializedEntity> = {};
    const locations: Record<string, ISerializedLocation> = {};
    const relationships: Record<string, ISerializedRelationship[]> = {};
    
    // Serialize all entities
    for (const entity of this.world.getAllEntities()) {
      const traits: Record<string, unknown> = {};
      
      // Serialize each trait
      for (const [name, trait] of entity.traits) {
        traits[name] = this.serializeTrait(trait);
      }
      
      entities[entity.id] = {
        id: entity.id,
        traits,
        entityType: entity.constructor.name
      };
    }
    
    // Serialize locations and their contents
    const allLocations = this.world.getAllEntities().filter(e => 
      e.type === 'room' || e.type === 'location' || e.has('if.trait.room')
    );
    for (const location of allLocations) {
      const contents = this.world.getContents(location.id);
      locations[location.id] = {
        id: location.id,
        properties: {
          name: (location.get(TraitType.IDENTITY) as any)?.name || 'Unknown',
          description: (location.get(TraitType.IDENTITY) as any)?.description || ''
        },
        contents: contents.map(e => e.id),
        connections: this.extractConnections(location)
      };
    }
    
    // TODO: Serialize other relationships
    
    return { entities, locations, relationships };
  }

  /**
   * Deserialize spatial index
   */
  private deserializeSpatialIndex(index: ISerializedSpatialIndex): void {
    // Clear existing world
    this.world = new WorldModel();
    
    // Restore entities
    for (const [id, data] of Object.entries(index.entities)) {
      const entity = this.world.createEntity(id);
      
      // Restore traits
      for (const [name, traitData] of Object.entries(data.traits as any)) {
        const trait = this.deserializeTrait(name, traitData);
        if (trait) {
          entity.add(trait);
        }
      }
    }
    
    // Restore locations and contents
    for (const [locationId, data] of Object.entries(index.locations)) {
      // Place entities in their locations
      for (const entityId of (data as any).contents) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          this.world.moveEntity(entity.id, locationId);
        }
      }
    }
    
    // Restore player reference
    const playerId = this.context.player.id;
    const player = this.world.getEntity(playerId);
    if (player) {
      this.context.player = player;
      this.world.setPlayer(playerId);
    }
  }

  /**
   * Serialize turn history
   */
  private serializeTurnHistory(): ISerializedTurn[] {
    const turns: ISerializedTurn[] = [];
    
    for (const [turnNumber, result] of this.context.history.entries()) {
      turns.push({
        turnNumber: turnNumber + 1,
        eventIds: result.events.map(e => e.source || `${e.turn}-${e.sequence}`),
        timestamp: result.events[0]?.timestamp.getTime() || Date.now(),
        command: result.input
      });
    }
    
    return turns;
  }

  /**
   * Deserialize turn history
   */
  private deserializeTurnHistory(turns: ISerializedTurn[]): void {
    // Clear existing history
    this.context.history = [];
    
    // Restore turn results
    for (const turn of turns) {
      // Find the events for this turn
      const events = this.eventSource.getAllEvents().filter(e => 
        turn.eventIds.includes(e.id)
      );
      
      // Create a minimal turn result
      // Convert SemanticEvents to SequencedEvents
      const sequencedEvents = events.map((event, index) => 
        toSequencedEvent(event, turn.turnNumber, index)
      );
      
      this.context.history.push({
        turn: turn.turnNumber,
        input: turn.command || '',
        success: true,
        events: sequencedEvents
      });
    }
  }

  /**
   * Serialize parser state
   */
  private serializeParserState(): ISerializedParserState | undefined {
    if (!this.parser) {
      return undefined;
    }
    
    // Parser state serialization is parser-specific
    // For now, return empty object
    return {};
  }

  /**
   * Deserialize parser state
   */
  private deserializeParserState(state: ISerializedParserState): void {
    // Parser state restoration is parser-specific
    // For now, do nothing
  }

  /**
   * Serialize a trait
   */
  private serializeTrait(trait: unknown): unknown {
    // Most traits are POJOs and can be serialized directly
    if (typeof trait === 'object' && trait !== null) {
      // Handle special cases if needed
      return { ...trait };
    }
    return trait;
  }

  /**
   * Deserialize a trait
   */
  private deserializeTrait(name: string, data: unknown): ITrait | null {
    // This would need to reconstruct the proper trait classes
    // For now, return the data as-is with the type field
    // In a full implementation, you'd use a trait factory
    if (data && typeof data === 'object') {
      return { type: name, ...data } as ITrait;
    }
    return null;
  }

  /**
   * Extract connections from a location entity
   */
  private extractConnections(location: IFEntity): Record<string, string> {
    const connections: Record<string, string> = {};
    
    // Check for ROOM trait with exits
    const roomTrait = location.get('if.trait.room') as any;
    if (roomTrait?.exits) {
      Object.entries(roomTrait.exits).forEach(([direction, exit]: [string, any]) => {
        if (exit.destination) {
          connections[direction] = exit.destination;
        }
      });
    }
    
    // Check for doors in this location
    const contents = this.world.getContents(location.id);
    contents.forEach(entity => {
      const doorTrait = entity.get('if.trait.door') as any;
      if (doorTrait) {
        // Door connects two rooms
        const otherRoom = doorTrait.room1 === location.id ? doorTrait.room2 : doorTrait.room1;
        if (otherRoom) {
          // Try to determine direction from door name or exit trait
          const name = entity.name?.toLowerCase() || '';
          if (name.includes('north')) connections.north = otherRoom;
          else if (name.includes('south')) connections.south = otherRoom;
          else if (name.includes('east')) connections.east = otherRoom;
          else if (name.includes('west')) connections.west = otherRoom;
          else connections.door = otherRoom; // Generic door connection
        }
      }
    });
    
    return connections;
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

