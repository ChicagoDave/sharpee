/**
 * Story class - High-level API for Sharpee stories
 * This provides the author-centric interface that enables simple patterns like:
 * story.languageSet(US_EN)
 */

import { IFWorld, IFWorldConfig } from '../world-model/if-world';
import { LanguageInstance, LanguageOptions } from '../languages/types';
import { SupportedLanguage, US_EN } from '../languages/constants';
import { getLanguageInstance } from '../languages/registry';
import { createIFParser, IFParser } from '../parser/if-parser';
import { createEnhancedIFParser, EnhancedIFParser } from '../parser/enhanced-if-parser';
import { createWorldAwareParser, WorldAwareParser } from '../parser/integration';
import { EventEmitter } from '../world-model/if-world/if-event-emitter';
import { CommandResolver, createCommandResolver } from '../execution/command-resolver';
import { ActionExecutor, createActionExecutor } from '../execution/action-executor';
import { standardActions } from '../actions';
import { ParsedIFCommand, ResolvedIFCommand } from '../parser/if-parser-types';
import { GameContext } from '../world-model/types';
import { SemanticEvent } from '../core-imports';

/**
 * Events emitted by the Story
 */
export interface StoryEvents {
  'language:changed': { previousLanguage?: SupportedLanguage; newLanguage: SupportedLanguage };
  'story:created': { title?: string };
  'story:started': { playerId: string };
}

/**
 * Configuration for creating a story
 */
export interface StoryConfig {
  /** The player entity ID */
  playerId?: string;
  /** Default language code */
  language?: SupportedLanguage;
  /** Story title */
  title?: string;
  /** Starting room */
  startingRoom?: string;
}

/**
 * Main Story class providing author-centric API
 */
export class Story extends EventEmitter<StoryEvents> {
  private world: IFWorld;
  private language?: LanguageInstance;
  private parser?: IFParser;
  private worldAwareParser?: WorldAwareParser;
  private storyTitle?: string;
  private playerId: string;
  private useEnhancedParser: boolean;
  private commandResolver: CommandResolver;
  private actionExecutor: ActionExecutor;

  constructor(config: StoryConfig = {}) {
    super();
    
    this.playerId = config.playerId || 'player';
    this.storyTitle = config.title;
    this.useEnhancedParser = true; // Default to enhanced parser
    
    // Create the world
    const worldConfig: IFWorldConfig = {
      playerId: this.playerId,
      startingRoom: config.startingRoom
    };
    this.world = new IFWorld(worldConfig);
    
    // Create execution pipeline components
    this.commandResolver = createCommandResolver();
    this.actionExecutor = createActionExecutor();
    
    // Register standard actions
    this.actionExecutor.registerActions(standardActions);
    
    // Set initial language
    if (config.language) {
      this.languageSet(config.language);
    }
    
    this.emit('story:created', { title: this.storyTitle });
  }

  /**
   * Set the language for this story - the main API from the redesign
   * Usage: story.languageSet(US_EN)
   */
  languageSet(languageCode: SupportedLanguage, options: LanguageOptions = {}): this {
    const previousLanguage = this.language?.definition.code;
    
    // Create language instance with options
    this.language = getLanguageInstance(languageCode, options);
    
    if (this.useEnhancedParser) {
      // Create enhanced parser with language configuration
      const parserConfig = this.language.getParserConfig();
      const languageData = this.language.getLanguageData();
      const enhancedParser = createEnhancedIFParser(parserConfig, languageData);
      
      // Add language-specific grammar patterns
      this.language.getGrammarPatterns().forEach(pattern => {
        enhancedParser.addGrammar(pattern);
      });
      
      // Create world-aware parser
      this.worldAwareParser = createWorldAwareParser(enhancedParser, this.world);
      this.parser = this.worldAwareParser;
    } else {
      // Use old parser for compatibility
      this.parser = createIFParser(this.language.getParserConfig());
      
      // Add language-specific grammar patterns
      this.language.getGrammarPatterns().forEach(pattern => {
        this.parser!.addGrammar(pattern);
      });
    }
    
    this.emit('language:changed', { previousLanguage, newLanguage: languageCode });
    return this;
  }

  /**
   * Get the current language instance
   */
  getLanguage(): LanguageInstance | undefined {
    return this.language;
  }

  /**
   * Get a formatted message using the current language
   */
  getMessage(key: string, ...params: any[]): string {
    if (!this.language) {
      // Fallback if no language set
      return key;
    }
    return this.language.formatMessage(key, ...params);
  }

  /**
   * Get the parser instance (used by the test)
   */
  getParser(): IFParser {
    if (!this.parser) {
      throw new Error('No parser available. Call languageSet() first.');
    }
    return this.parser;
  }

  /**
   * Get the world instance
   */
  getWorld(): IFWorld {
    return this.world;
  }

  /**
   * Set the story title
   */
  title(title: string): this {
    this.storyTitle = title;
    return this;
  }

  /**
   * Get the story title
   */
  getTitle(): string | undefined {
    return this.storyTitle;
  }

  /**
   * Start the story
   */
  start(): this {
    this.emit('story:started', { playerId: this.playerId });
    return this;
  }

  /**
   * Parse player input using the current language
   * @deprecated Use processInput() for the full pipeline, or parseToParsedCommand() for just parsing
   */
  parse(input: string) {
    if (!this.parser) {
      throw new Error('No parser available. Call languageSet() first.');
    }
    
    if (this.worldAwareParser) {
      // Use world-aware parser directly
      return this.worldAwareParser.parse(input);
    } else {
      // Use old parser with manual scope calculation
      const scope = this.world.calculateScope();
      const getEntity = (id: string) => this.world.getEntity(id);
      
      return this.parser.parse(input, scope, getEntity);
    }
  }

  /**
   * Parse input into a ParsedIFCommand
   */
  parseToParsedCommand(input: string): ParsedIFCommand | null {
    if (!this.parser) {
      throw new Error('No parser available. Call languageSet() first.');
    }
    
    const result = this.parse(input);
    
    // Convert old parse result to ParsedIFCommand if needed
    // The parser should already return ParsedIFCommand
    return result as ParsedIFCommand | null;
  }

  /**
   * Resolve a parsed command into a ResolvedIFCommand
   */
  async resolve(parsed: ParsedIFCommand): Promise<ResolvedIFCommand> {
    const context = this.createGameContext();
    return this.commandResolver.resolve(parsed, context);
  }

  /**
   * Execute a resolved command and return semantic events
   */
  async execute(resolved: ResolvedIFCommand): Promise<SemanticEvent[]> {
    const context = this.createGameContext();
    return this.actionExecutor.execute(resolved, context);
  }

  /**
   * Process input through the complete pipeline: parse → resolve → execute
   * This is the main method for handling player input
   */
  async processInput(input: string): Promise<SemanticEvent[]> {
    // Parse
    const parsed = this.parseToParsedCommand(input);
    if (!parsed) {
      return [{
        type: 'parse-error',
        data: {
          message: 'Could not understand that command.',
          input
        },
        metadata: {
          narrate: true
        }
      }];
    }
    
    // Resolve
    const resolved = await this.resolve(parsed);
    
    // Execute
    return this.execute(resolved);
  }

  /**
   * Create a GameContext for the current state
   */
  private createGameContext(): GameContext {
    const player = this.world.getEntity(this.playerId);
    if (!player) {
      throw new Error('Player entity not found');
    }
    
    const locationId = this.world.getLocation(this.playerId);
    if (!locationId) {
      throw new Error('Player location not found');
    }
    
    const currentLocation = this.world.getEntity(locationId);
    if (!currentLocation) {
      throw new Error('Current location entity not found');
    }
    
    return {
      world: this.world,
      player,
      currentLocation,
      languageProvider: this.language!,
      getScope: () => this.world.calculateScope(),
      isVisible: (entityId: string) => {
        const scope = this.world.calculateScope();
        return scope.some(e => e.id === entityId);
      },
      isAccessible: (entityId: string) => {
        // For now, visible = accessible
        // Later we might check containers, darkness, etc.
        const scope = this.world.calculateScope();
        return scope.some(e => e.id === entityId);
      },
      isCarriedBy: (itemId: string, carrierId: string) => {
        const location = this.world.getLocation(itemId);
        return location === carrierId;
      },
      findLocationOf: (entityId: string) => {
        return this.world.getLocation(entityId);
      }
    };
  }

  /**
   * Get the command resolver
   */
  getCommandResolver(): CommandResolver {
    return this.commandResolver;
  }

  /**
   * Get the action executor
   */
  getActionExecutor(): ActionExecutor {
    return this.actionExecutor;
  }
}

/**
 * Create a new story instance
 * This provides the factory function mentioned in the test example
 */
export function createStory(config?: StoryConfig): Story {
  return new Story(config);
}
