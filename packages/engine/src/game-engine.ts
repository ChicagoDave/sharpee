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
  ContainerTrait
} from '@sharpee/world-model';
import { EventProcessor } from '@sharpee/event-processor';
import { 
  ActionRegistry, 
  StandardActionRegistry,
  standardActions,
  vocabularyRegistry,
  Parser,
  ParserFactory
} from '@sharpee/stdlib';
import { LanguageProvider } from '@sharpee/if-domain';
import { TextService, TextServiceContext, TextOutput } from '@sharpee/if-services';
import { SemanticEvent, createSemanticEventSource } from '@sharpee/core';

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
      // Execute the command
      const result = await this.commandExecutor.execute(
        input,
        this.world,
        this.context,
        this.config
      );

      // Store events for this turn
      this.turnEvents.set(turn, result.events);

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
   * Save game state
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
   * Load game state
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
