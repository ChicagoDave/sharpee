/**
 * Game Engine - Main runtime for Sharpee IF games
 * 
 * Manages game state, turn execution, and coordinates all subsystems
 */

import { EventEmitter } from 'events';
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
  LanguageProvider
} from '@sharpee/stdlib';

import {
  GameContext,
  TurnResult,
  EngineConfig,
  GameState,
  SequencedEvent
} from './types';
import { Story, loadLanguageProvider } from './story';

import { CommandExecutor, createCommandExecutor } from './command-executor';
import { EventSequenceUtils } from './event-sequencer';
import { TextService, TextChannel, createBasicTextService } from './text-service';

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
}

/**
 * Main game engine
 */
export class GameEngine extends EventEmitter {
  private world: WorldModel;
  private context: GameContext;
  private config: EngineConfig;
  private commandExecutor!: CommandExecutor;
  private eventProcessor: EventProcessor;
  private actionRegistry: ActionRegistry;
  private textService: TextService;
  private textChannels: TextChannel[];
  private running = false;
  private story?: Story;
  private languageProvider?: LanguageProvider;

  constructor(
    world: WorldModel,
    player: IFEntity,
    config: EngineConfig = {},
    languageProvider?: LanguageProvider
  ) {
    super();
    
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
    
    // If we have a language provider, use it. Otherwise we'll need to set story later
    if (languageProvider) {
      this.languageProvider = languageProvider;
      this.commandExecutor = createCommandExecutor(
        this.world,
        this.actionRegistry,
        this.eventProcessor,
        this.languageProvider
      );
    }
    
    // Create text service
    const { service, channels } = createBasicTextService();
    this.textService = service;
    this.textChannels = channels;
  }

  /**
   * Set the story for this engine
   */
  async setStory(story: Story): Promise<void> {
    this.story = story;
    
    // Load the language provider based on story configuration
    try {
      this.languageProvider = await loadLanguageProvider(story.config.language);
      
      // Create or recreate command executor with the language provider
      this.commandExecutor = createCommandExecutor(
        this.world,
        this.actionRegistry,
        this.eventProcessor,
        this.languageProvider
      );
      
      // Initialize story-specific world content
      story.initializeWorld(this.world);
      
      // Create player if needed
      if (!this.context.player) {
        this.context.player = story.createPlayer(this.world);
        this.world.setPlayer(this.context.player.id);
      }
      
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
    } catch (error) {
      throw new Error(`Failed to initialize story: ${error}`);
    }
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
    this.emit('turn:start', turn, input);

    try {
      // Execute the command
      const result = await this.commandExecutor.execute(
        input,
        this.world,
        this.context,
        this.config
      );

      // Emit events if configured
      if (this.config.onEvent) {
        for (const event of result.events) {
          this.config.onEvent(event);
          this.emit('event', event);
        }
      }

      // Update context
      this.updateContext(result);

      // Process text output
      this.textService.processTurn(result, this.textChannels, {
        includeEventTypes: this.config.debug || false,
        includeSystemEvents: this.config.debug || false,
        verbose: this.config.debug || false
      });

      // Emit completion
      this.emit('turn:complete', result);

      // Check for game over
      if (this.isGameOver()) {
        this.emit('game:over', this.context);
        this.stop();
      }

      return result;

    } catch (error) {
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
        adjectives: [], // Could extract from description or add as trait property
        inScope
      });
    }
  }

  /**
   * Set text service and channels
   */
  setTextService(service: TextService, channels: TextChannel[]): void {
    this.textService = service;
    this.textChannels = channels;
  }
  
  /**
   * Add a text output channel
   */
  addTextChannel(channel: TextChannel): void {
    this.textChannels.push(channel);
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
      entities: this.world.getAllEntities().map(e => ({
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
    // Would need to rebuild world from serialized data
    console.warn('World deserialization not fully implemented');
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
 * Note: This creates an engine without a language provider,
 * so you must call setStory() before using it
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

  // Create engine (without language provider)
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
  
  // Load language provider
  const languageProvider = await loadLanguageProvider(story.config.language);
  
  // Initialize world from story
  story.initializeWorld(world);
  
  // Create player from story
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  
  // Create engine with language provider
  const engine = new GameEngine(world, player, config, languageProvider);
  
  // Set the story (this will register custom actions, etc.)
  await engine.setStory(story);
  
  // Initial vocabulary update
  engine.updateScopeVocabulary();
  
  return engine;
}
