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
  StandardCapabilities
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
  IFActions
} from '@sharpee/stdlib';
import { LanguageProvider } from '@sharpee/if-domain';
import { TextService, TextServiceContext, TextOutput } from '@sharpee/if-services';
import { SemanticEvent, createSemanticEventSource, SaveData, SaveRestoreHooks, SaveResult, RestoreResult, SerializedEvent, SerializedEntity, SerializedLocation, SerializedRelationship, SerializedSpatialIndex, SerializedTurn, EngineState, SaveMetadata, SerializedParserState, QueryManager, createQueryManager, PendingQuery, PlatformEvent, isPlatformRequestEvent, PlatformEventType, SaveContext, RestoreContext, QuitContext, RestartContext, createSaveCompletedEvent, createRestoreCompletedEvent, createQuitConfirmedEvent, createQuitCancelledEvent, createRestartCompletedEvent } from '@sharpee/core';

import {
  GameContext,
  TurnResult,
  EngineConfig,
  GameState,
  SequencedEvent
} from './types';
import { Story, loadLanguageProvider, loadTextService } from './story';

import { CommandExecutor, createCommandExecutor } from './command-executor';
import { EventSequenceUtils, eventSequencer } from './event-sequencer';

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
  private context: GameContext;
  private config: EngineConfig;
  private commandExecutor!: CommandExecutor;
  private eventProcessor: EventProcessor;
  private actionRegistry: ActionRegistry;
  private textService?: TextService;
  private turnEvents = new Map<number, SemanticEvent[]>();
  private running = false;
  private story?: Story;
  private languageProvider?: LanguageProvider;
  private parser?: Parser;
  private eventListeners = new Map<GameEngineEventName, Set<Function>>();
  private saveRestoreHooks?: SaveRestoreHooks;
  private eventSource = createSemanticEventSource();
  private queryManager: QueryManager;
  private pendingPlatformOps: PlatformEvent[] = [];

  constructor(
    world: WorldModel,
    player: IFEntity,
    config: EngineConfig = {},
    languageProvider?: LanguageProvider
  ) {
    
    this.world = world;
    this.config = {
      maxHistory: 100,
      validateEvents: true,
      collectTiming: false,
      ...config
    };

    // Initialize context
    this.context = {
      currentTurn: 1,
      player,
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
    
    // If we have a language provider, use it
    if (languageProvider) {
      this.languageProvider = languageProvider;
    }
    
    // Create query manager
    this.queryManager = createQueryManager();
    
    // Listen for client.query events
    this.setupQueryHandling();
  }

  /**
   * Set the story for this engine
   */
  async setStory(story: Story): Promise<void> {
    this.story = story;
    
    // Set language from story configuration
    await this.setLanguage(story.config.language);
    
    // Set text service from story configuration
    await this.setTextServiceFromConfig(story.config.textService);
    
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
  }

  /**
   * Set the language for this engine
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!languageCode) {
      throw new Error('Language code is required');
    }

    try {
      // Load language provider
      this.languageProvider = await loadLanguageProvider(languageCode);
      
      // Update action registry with language provider
      if (this.actionRegistry.setLanguageProvider) {
        this.actionRegistry.setLanguageProvider(this.languageProvider);
      }
      
      // Update text service with language provider
      if (this.textService) {
        this.textService.setLanguageProvider(this.languageProvider);
      }
      
      // Load parser dynamically
      const parserPackageName = `@sharpee/parser-${languageCode.toLowerCase()}`;
      try {
        const parserModule = await import(parserPackageName);
        
        // Try to get the parser class from various export patterns
        let ParserClass;
        if (parserModule.Parser && typeof parserModule.Parser === 'function') {
          ParserClass = parserModule.Parser;
        } else if (parserModule.default && typeof parserModule.default === 'function') {
          ParserClass = parserModule.default;
        } else if (parserModule.EnglishParser && typeof parserModule.EnglishParser === 'function') {
          ParserClass = parserModule.EnglishParser;
        } else {
          const exportedClasses = Object.values(parserModule).filter(
            (exp: any) => typeof exp === 'function' && exp.name && exp.name.includes('Parser')
          );
          if (exportedClasses.length > 0) {
            ParserClass = exportedClasses[0];
          } else {
            throw new Error(`No parser class found in ${parserPackageName}`);
          }
        }
        
        // Register the parser with the factory
        ParserFactory.registerParser(languageCode, ParserClass as any);
        
        // Create parser instance
        this.parser = ParserFactory.createParser(languageCode, this.languageProvider);
        
      } catch (error: any) {
        if (error.message?.includes('Cannot find module')) {
          throw new Error(`Parser package not found for language: ${languageCode}. Expected package: ${parserPackageName}`);
        }
        throw new Error(`Failed to load parser for ${languageCode}: ${error.message}`);
      }
      
      // Create or recreate command executor
      this.commandExecutor = createCommandExecutor(
        this.world,
        this.actionRegistry,
        this.eventProcessor,
        this.languageProvider,
        this.parser
      );
      
    } catch (error: any) {
      throw new Error(`Failed to set language: ${error.message}`);
    }
  }

  /**
   * Set text service from story configuration
   */
  private async setTextServiceFromConfig(config?: Story['config']['textService']): Promise<void> {
    const textService = await loadTextService(config);
    this.setTextService(textService);
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

    if (!this.commandExecutor) {
      throw new Error('Engine must have a story set before starting');
    }

    if (!this.textService) {
      throw new Error('Engine must have a text service set before starting');
    }

    this.running = true;
    this.emit('state:changed', this.context);
  }

  /**
   * Stop the game engine
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Setup query handling
   */
  private setupQueryHandling(): void {
    // Listen for client.query events from the event source
    this.eventSource.getEmitter().on('client.query', (event: SemanticEvent) => {
      this.handleClientQuery(event);
    });
    
    // Listen for query manager events and forward them
    this.queryManager.on('query:pending', (query) => {
      // Emit a semantic event for the text service
      const queryEvent: SemanticEvent = {
        id: `evt_query_${Date.now()}`,
        type: 'query.pending',
        timestamp: Date.now(),
        entities: {},
        data: { query },
        payload: { query }
      };
      this.eventSource.emit(queryEvent);
    });
    
    this.queryManager.on('query:invalid', (input, result, query) => {
      // Emit validation error event
      const errorEvent: SemanticEvent = {
        id: `evt_invalid_${Date.now()}`,
        type: 'query.invalid',
        timestamp: Date.now(),
        entities: {},
        data: { 
          input,
          message: result.message,
          hint: result.hint
        },
        payload: { input, result, query }
      };
      this.eventSource.emit(errorEvent);
    });
  }
  
  /**
   * Handle a client query event
   */
  private async handleClientQuery(event: SemanticEvent): Promise<void> {
    const queryData = event.data || event.payload || {};
    
    // Create a PendingQuery from the event data
    const query: PendingQuery = {
      id: queryData.queryId || `query_${Date.now()}`,
      source: queryData.source || 'system',
      type: queryData.type || 'multiple_choice',
      messageId: queryData.messageId,
      messageParams: queryData.messageParams,
      options: queryData.options,
      context: queryData.context || {},
      allowInterruption: queryData.allowInterruption !== false,
      validator: queryData.validator,
      timeout: queryData.timeout,
      created: Date.now(),
      priority: queryData.priority
    };
    
    // Register quit handler if needed
    if (query.type === 'quit_confirmation' && !this.queryManager['handlers'].has('quit')) {
      const { createQuitQueryHandler } = await import('@sharpee/stdlib');
      const quitHandler = createQuitQueryHandler();
      this.queryManager.registerHandler('quit', quitHandler);
      
      // Connect quit handler events to engine event source
      quitHandler.getEventSource().subscribe((evt) => {
        this.eventSource.emit(evt);
      });
    }
    
    // Ask the query
    await this.queryManager.askQuery(query);
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
      // Check if query manager should handle this input
      if (this.queryManager.hasPendingQuery()) {
        const queryResult = this.queryManager.processInput(input);
        
        if (queryResult === 'handled' || queryResult === 'interrupt') {
          // Query handled the input, return a minimal turn result
          const queryHandledEvent = eventSequencer.sequence({
            type: 'query.response',
            data: {
              input,
              handled: true,
              wasInterruption: queryResult === 'interrupt'
            }
          }, turn);
          
          return {
            turn,
            input,
            success: true,
            events: [queryHandledEvent]
          };
        }
        // If 'pass', continue normal command processing
      }
      // Execute the command
      const result = await this.commandExecutor.execute(
        input,
        this.world,
        this.context,
        this.config
      );

      // Store events for this turn
      this.turnEvents.set(turn, result.events);
      
      // Also track in event source for save/restore
      for (const event of result.events) {
        this.eventSource.emit(event);
        
        // Check if this is a client.query event
        if (event.type === 'client.query') {
          // The handleClientQuery will be called by the event listener
        }
        
        // Check if this is a platform request event
        if (isPlatformRequestEvent(event)) {
          this.pendingPlatformOps.push(event as PlatformEvent);
        }
      }

      // Update command history if command was successful
      if (result.success) {
        this.updateCommandHistory(result, input, turn);
      }

      // Emit events if configured
      if (this.config.onEvent) {
        for (const event of result.events) {
          this.config.onEvent(event);
        }
      }
      
      // Always emit events through the engine's event system
      for (const event of result.events) {
        this.emit('event', event);
      }

      // Update context
      this.updateContext(result);

      // Process pending platform operations before text service
      if (this.pendingPlatformOps.length > 0) {
        await this.processPlatformOperations();
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
            const allEvents: SemanticEvent[] = [];
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
            return this.world.getLocation(entityId);
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

      // Check for game over
      if (this.isGameOver()) {
        this.emit('game:over', this.context);
        this.stop();
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
   * Get the query manager
   */
  getQueryManager(): QueryManager {
    return this.queryManager;
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
  registerSaveRestoreHooks(hooks: SaveRestoreHooks): void {
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
  private createSaveData(): SaveData {
    const metadata: SaveMetadata = {
      storyId: this.story?.config.id || 'unknown',
      storyVersion: this.story?.config.version || '0.0.0',
      turnCount: this.context.currentTurn - 1,
      playTime: Date.now() - this.context.metadata.started.getTime(),
      description: `Turn ${this.context.currentTurn - 1}`
    };

    const engineState: EngineState = {
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
        author: this.story?.config.author || 'Unknown'
      }
    };
  }

  /**
   * Load save data into engine
   */
  private loadSaveData(saveData: SaveData): void {
    // Validate save compatibility
    if (saveData.version !== '1.0.0') {
      throw new Error(`Unsupported save version: ${saveData.version}`);
    }

    if (saveData.storyConfig.id !== this.story?.config.id) {
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
    
    if (nonRepeatable.includes(actionId)) {
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
  private async processPlatformOperations(): Promise<void> {
    // Process each pending operation
    for (const platformOp of this.pendingPlatformOps) {
      try {
        switch (platformOp.type) {
          case PlatformEventType.SAVE_REQUESTED: {
            const context = platformOp.payload.context as SaveContext;
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
              this.turnEvents.get(this.context.currentTurn - 1)?.push(completionEvent);
            } else {
              // No save hook registered
              const errorEvent = createSaveCompletedEvent(false, 'No save handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(this.context.currentTurn - 1)?.push(errorEvent);
            }
            break;
          }
          
          case PlatformEventType.RESTORE_REQUESTED: {
            const context = platformOp.payload.context as RestoreContext;
            if (this.saveRestoreHooks?.onRestoreRequested) {
              const saveData = await this.saveRestoreHooks.onRestoreRequested();
              if (saveData) {
                this.loadSaveData(saveData);
                
                // Emit completion event
                const completionEvent = createRestoreCompletedEvent(true);
                this.eventSource.emit(completionEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(completionEvent);
              } else {
                // User cancelled or no save available
                const errorEvent = createRestoreCompletedEvent(false, 'No save data available or restore cancelled');
                this.eventSource.emit(errorEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(errorEvent);
              }
            } else {
              // No restore hook registered
              const errorEvent = createRestoreCompletedEvent(false, 'No restore handler registered');
              this.eventSource.emit(errorEvent);
              this.turnEvents.get(this.context.currentTurn - 1)?.push(errorEvent);
            }
            break;
          }
          
          case PlatformEventType.QUIT_REQUESTED: {
            const context = platformOp.payload.context as QuitContext;
            if (this.saveRestoreHooks?.onQuitRequested) {
              const shouldQuit = await this.saveRestoreHooks.onQuitRequested(context);
              if (shouldQuit) {
                // Emit confirmation event
                const confirmEvent = createQuitConfirmedEvent();
                this.eventSource.emit(confirmEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(confirmEvent);
                
                // Stop the engine
                this.stop();
              } else {
                // Quit was cancelled
                const cancelEvent = createQuitCancelledEvent();
                this.eventSource.emit(cancelEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(cancelEvent);
              }
            } else {
              // No quit hook registered - default behavior is to quit
              const confirmEvent = createQuitConfirmedEvent();
              this.eventSource.emit(confirmEvent);
              this.turnEvents.get(this.context.currentTurn - 1)?.push(confirmEvent);
              
              // Stop the engine
              this.stop();
            }
            break;
          }
          
          case PlatformEventType.RESTART_REQUESTED: {
            const context = platformOp.payload.context as RestartContext;
            if (this.saveRestoreHooks?.onRestartRequested) {
              const shouldRestart = await this.saveRestoreHooks.onRestartRequested(context);
              if (shouldRestart) {
                // Emit completion event
                const completionEvent = createRestartCompletedEvent(true);
                this.eventSource.emit(completionEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(completionEvent);
                
                // Re-initialize the story
                if (this.story) {
                  await this.setStory(this.story);
                  this.start();
                }
              } else {
                // Restart was cancelled
                const cancelEvent = createRestartCompletedEvent(false);
                this.eventSource.emit(cancelEvent);
                this.turnEvents.get(this.context.currentTurn - 1)?.push(cancelEvent);
              }
            } else {
              // No restart hook registered - default behavior is to restart
              const completionEvent = createRestartCompletedEvent(true);
              this.eventSource.emit(completionEvent);
              this.turnEvents.get(this.context.currentTurn - 1)?.push(completionEvent);
              
              // Re-initialize the story
              if (this.story) {
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
        let errorEvent: PlatformEvent;
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
        this.turnEvents.get(this.context.currentTurn - 1)?.push(errorEvent);
      }
    }
    
    // Clear pending operations
    this.pendingPlatformOps = [];
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
  private serializeEventSource(): SerializedEvent[] {
    const events: SerializedEvent[] = [];
    
    // Get all events from the event source
    for (const event of this.eventSource.getAllEvents()) {
      events.push({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp || Date.now(),
        data: event.data || {},
        metadata: event.metadata
      });
    }
    
    return events;
  }

  /**
   * Deserialize event source
   */
  private deserializeEventSource(events: SerializedEvent[]): void {
    // Clear existing event source
    this.eventSource = createSemanticEventSource();
    
    // Replay events
    for (const event of events) {
      this.eventSource.emit({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata
      });
    }
  }

  /**
   * Serialize spatial index (world state)
   */
  private serializeSpatialIndex(): SerializedSpatialIndex {
    const entities: Record<string, SerializedEntity> = {};
    const locations: Record<string, SerializedLocation> = {};
    const relationships: Record<string, SerializedRelationship[]> = {};
    
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
    const allLocations = this.world.getAllLocations();
    for (const location of allLocations) {
      const contents = this.world.getContents(location.id);
      locations[location.id] = {
        id: location.id,
        properties: {
          name: location.get('IDENTITY')?.name || 'Unknown',
          description: location.get('IDENTITY')?.description || ''
        },
        contents: contents.map(e => e.id),
        connections: this.world.getConnections(location.id)
      };
    }
    
    // TODO: Serialize other relationships
    
    return { entities, locations, relationships };
  }

  /**
   * Deserialize spatial index
   */
  private deserializeSpatialIndex(index: SerializedSpatialIndex): void {
    // Clear existing world
    this.world = new WorldModel();
    
    // Restore entities
    for (const [id, data] of Object.entries(index.entities)) {
      const entity = this.world.createEntity(id);
      
      // Restore traits
      for (const [name, traitData] of Object.entries(data.traits)) {
        const trait = this.deserializeTrait(name, traitData);
        if (trait) {
          entity.add(trait);
        }
      }
    }
    
    // Restore locations and contents
    for (const [locationId, data] of Object.entries(index.locations)) {
      // Place entities in their locations
      for (const entityId of data.contents) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          this.world.setLocation(entity, locationId);
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
  private serializeTurnHistory(): SerializedTurn[] {
    const turns: SerializedTurn[] = [];
    
    for (const [turnNumber, result] of this.context.history.entries()) {
      turns.push({
        turnNumber: turnNumber + 1,
        eventIds: result.events.map(e => e.id),
        timestamp: result.events[0]?.timestamp || Date.now(),
        command: result.input
      });
    }
    
    return turns;
  }

  /**
   * Deserialize turn history
   */
  private deserializeTurnHistory(turns: SerializedTurn[]): void {
    // Clear existing history
    this.context.history = [];
    
    // Restore turn results
    for (const turn of turns) {
      // Find the events for this turn
      const events = this.eventSource.getAllEvents().filter(e => 
        turn.eventIds.includes(e.id)
      );
      
      // Create a minimal turn result
      this.context.history.push({
        turn: turn.turnNumber,
        input: turn.command || '',
        success: true,
        events: events as SequencedEvent[]
      });
    }
  }

  /**
   * Serialize parser state
   */
  private serializeParserState(): SerializedParserState | undefined {
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
  private deserializeParserState(state: SerializedParserState): void {
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
  private deserializeTrait(name: string, data: unknown): unknown {
    // This would need to reconstruct the proper trait classes
    // For now, return the data as-is
    // In a full implementation, you'd use a trait factory
    return data;
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

  /**
   * Emit event
   */
  private emit<K extends GameEngineEventName>(
    event: K,
    ...args: Parameters<GameEngineEventListener<K>>
  ): boolean {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
      return true;
    }
    return false;
  }
}

/**
 * Factory function to create a game engine
 */
export function createGameEngine(
  world: WorldModel,
  player: IFEntity,
  config?: EngineConfig,
  languageProvider?: LanguageProvider
): GameEngine {
  return new GameEngine(world, player, config, languageProvider);
}

/**
 * Create a basic game engine with standard setup
 */
export function createStandardEngine(config?: EngineConfig): GameEngine {
  // Create world
  const world = new WorldModel();

  // Create player entity
  const player = world.createEntity('player', 'You');
  
  // Add traits to player
  player.add(new IdentityTrait({
    name: 'You',
    aliases: ['self', 'me', 'myself'],
    description: 'As good-looking as ever.',
    properName: true,
    article: ''
  }));
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait({
    capacity: {
      maxItems: 10
    }
  }));

  // Create engine
  const engine = new GameEngine(world, player, config);

  // Initial vocabulary update
  engine.updateScopeVocabulary();

  return engine;
}

/**
 * Create a game engine with a story
 */
export async function createEngineWithStory(
  story: Story,
  config?: EngineConfig
): Promise<GameEngine> {
  // Create world
  const world = new WorldModel();
  
  // Create player from story
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  
  // Create engine
  const engine = new GameEngine(world, player, config);
  
  // Set the story
  await engine.setStory(story);
  
  // Initial vocabulary update
  engine.updateScopeVocabulary();
  
  return engine;
}
