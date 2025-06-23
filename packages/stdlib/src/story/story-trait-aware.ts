/**
 * Story class - High-level API for Sharpee stories
 * This provides the author-centric interface that enables simple patterns like:
 * story.languageSet(englishPlugin)
 * 
 * Updated to support trait-based actions through TraitAwareActionExecutor
 */

import { IFWorld, IFWorldConfig } from '../world-model/if-world';
import { IFLanguagePlugin } from '../language/base/types';
import { createIFParser } from '../parser/if-parser';
import { EventEmitter } from '../world-model/if-world/if-event-emitter';
import { CommandResolver, createCommandResolver } from '../execution/command-resolver';
import { createTraitAwareActionExecutor, TraitAwareActionExecutor } from '../execution/trait-aware-action-executor';
import { standardActions } from '../actions';
import { ParsedIFCommand, ResolvedIFCommand, IFParser, ScopeContext, IFParserConfig } from '../parser/if-parser-types';
import { GameContext } from '../world-model/types';
import { SemanticEvent, Entity, createEvent } from '../core-imports';
import { IFLanguageProvider } from '../language/if-language-provider';
import { LanguageData } from '../parser/languages/language-data';
import { IFActions } from '../constants/if-actions';
import { WorldModelService } from '../world-model/services/world-model-service';

/**
 * Events emitted by the Story
 */
export interface StoryEvents {
  'language:changed': { previousLanguage?: string; newLanguage: string };
  'story:created': { title?: string };
  'story:started': { playerId: string };
}

/**
 * Configuration for creating a story
 */
export interface StoryConfig {
  /** The player entity ID */
  playerId?: string;
  /** Language plugin to use */
  language?: IFLanguagePlugin;
  /** Story title */
  title?: string;
  /** Starting room */
  startingRoom?: string;
  /** Use trait-based actions (for migration) */
  useTraitBasedActions?: boolean;
}

/**
 * Main Story class providing author-centric API
 */
export class Story extends EventEmitter<StoryEvents> {
  private world: IFWorld;
  private language?: IFLanguagePlugin;
  private parser?: IFParser;
  private storyTitle?: string;
  private playerId: string;
  private commandResolver: CommandResolver;
  private actionExecutor: TraitAwareActionExecutor;
  private useTraitBasedActions: boolean;

  constructor(config: StoryConfig = {}) {
    super();
    
    this.playerId = config.playerId || 'player';
    this.storyTitle = config.title;
    this.useTraitBasedActions = config.useTraitBasedActions ?? false;
    
    // Create the world
    const worldConfig: IFWorldConfig = {
      playerId: this.playerId,
      startingRoom: config.startingRoom
    };
    this.world = new IFWorld(worldConfig);
    
    // Create execution pipeline components
    this.commandResolver = createCommandResolver();
    this.actionExecutor = createTraitAwareActionExecutor({
      forceTraitContext: this.useTraitBasedActions
    });
    
    // Register standard actions
    this.registerStandardActions();
    
    // Set initial language
    if (config.language) {
      this.languageSet(config.language);
    }
    
    this.emit('story:created', { title: this.storyTitle });
  }

  /**
   * Register standard actions, marking trait-based ones appropriately
   */
  private registerStandardActions(): void {
    // List of actions that have been migrated to trait-based
    const traitBasedActionIds = new Set([
      IFActions.EXAMINING,
      IFActions.TAKING,
      IFActions.DROPPING,
      IFActions.OPENING,
      IFActions.CLOSING,
      IFActions.PUTTING,
      IFActions.LOCKING,
      IFActions.UNLOCKING,
      IFActions.SWITCHING_ON,
      IFActions.SWITCHING_OFF,
      IFActions.GOING,
      IFActions.GIVING,
      IFActions.USING,
      IFActions.TALKING,
      IFActions.ASKING,
      IFActions.TELLING
    ]);
    
    standardActions.forEach(action => {
      if (traitBasedActionIds.has(action.id as IFActions)) {
        this.actionExecutor.registerTraitBasedAction(action);
      } else {
        this.actionExecutor.registerAction(action);
      }
    });
  }

  /**
   * Set the language for this story
   * Usage: story.languageSet(new EnglishLanguagePlugin())
   */
  languageSet(languagePlugin: IFLanguagePlugin): this {
    const previousLanguage = this.language?.getLanguageCode();
    
    // Set the language plugin
    this.language = languagePlugin;
    
    // Register action verbs with the executor
    standardActions.forEach(action => {
      const verbs = languagePlugin.getVerbsForAction(action.id as IFActions);
      action.verbs = verbs;
    });
    
    // Create language data
    const languageData: LanguageData = {
      code: languagePlugin.getLanguageCode(),
      articles: languagePlugin.getArticles(),
      prepositions: languagePlugin.getPrepositions(),
      pronouns: languagePlugin.getPronouns(),
      conjunctions: languagePlugin.getConjunctions(),
      directions: languagePlugin.getDirections(),
      patterns: [], // TODO: Get patterns from language plugin
      normalization: {
        abbreviations: new Map(),
        irregularPlurals: new Map(),
        actionSynonyms: new Map()
      }
    };
    
    // Create parser config
    const parserConfig: IFParserConfig = {
      articles: languagePlugin.getArticles(),
      conjunctions: languagePlugin.getConjunctions(),
      pronouns: languagePlugin.getPronouns(),
      implicitPrepositions: new Map(),
      directions: languagePlugin.getDirections(),
      scoring: {
        exactMatch: 100,
        partialMatch: 50,
        synonymMatch: 75,
        adjectiveMatch: 25,
        visibleBonus: 20,
        reachableBonus: 30,
        recentlyMentionedBonus: 40,
        pronounPenalty: -20
      }
    };
    
    this.parser = createIFParser(parserConfig, languageData);
    
    this.emit('language:changed', { 
      previousLanguage, 
      newLanguage: languagePlugin.getLanguageCode() 
    });
    return this;
  }

  /**
   * Get the current language plugin
   */
  getLanguage(): IFLanguagePlugin | undefined {
    return this.language;
  }

  /**
   * Get a formatted message using the current language
   */
  getMessage(key: string, params?: Record<string, unknown>): string {
    if (!this.language) {
      // Fallback if no language set
      return key;
    }
    return this.language.formatMessage(key, params);
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
   * Get the world model service
   */
  getWorldModelService(): WorldModelService {
    // IFWorld extends WorldModelService
    return this.world as unknown as WorldModelService;
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
    
    const scopeResult = this.world.calculateScope();
    const scope: ScopeContext = {
      visible: scopeResult.visible,
      reachable: scopeResult.reachable,
      known: scopeResult.known,
      recentlyMentioned: [] // TODO: Track recently mentioned entities
    };
    const getEntity = (id: string) => this.world.getEntity(id);
    
    return this.parser.parse(input, scope, getEntity);
  }

  /**
   * Parse input into a ParsedIFCommand
   */
  parseToParsedCommand(input: string): ParsedIFCommand | null {
    if (!this.parser) {
      throw new Error('No parser available. Call languageSet() first.');
    }
    
    const result = this.parse(input);
    
    if (!result.success || result.commands.length === 0) {
      return null;
    }
    
    return result.commands[0];
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
      return [createEvent(
        'parse-error',
        {
          message: 'Could not understand that command.',
          input
        },
        {
          narrate: true
        }
      )];
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
    
    // Create an IFLanguageProvider adapter for the plugin
    const languageProvider: IFLanguageProvider = this.createLanguageProviderAdapter();
    
    const context: GameContext = {
      world: this.world as unknown as any, // IFWorld is compatible with the world interface
      player: player as unknown as Entity, // Cast IFEntity to Entity via unknown
      currentLocation: currentLocation as unknown as Entity, // Cast IFEntity to Entity via unknown
      languageProvider,
      textService: {
        processEvents: (events: SemanticEvent[]) => {
          // Simple implementation that joins event messages
          return events
            .filter(e => e.metadata?.narrate !== false)
            .map(e => {
              if (e.data && typeof e.data === 'object' && 'message' in e.data) {
                return e.data.message as string;
              }
              return '';
            })
            .filter(msg => msg.length > 0)
            .join('\n');
        },
        formatMessage: (templateKey: string, params?: Record<string, unknown>) => {
          return languageProvider.formatMessage(templateKey, params);
        },
        setLanguageProvider: () => {
          // Not implemented in adapter
        },
        getLanguageProvider: () => languageProvider
      },
      getScope: () => {
        const scopeResult = this.world.calculateScope();
        // Convert scope result to Entity array
        const entities: Entity[] = [];
        scopeResult.visible.forEach(id => {
          const entity = this.world.getEntity(id);
          if (entity) entities.push(entity as unknown as Entity);
        });
        scopeResult.reachable.forEach(id => {
          const entity = this.world.getEntity(id);
          if (entity && !entities.find(e => e.id === entity.id)) {
            entities.push(entity as unknown as Entity);
          }
        });
        return entities;
      },
      isVisible: (entityId: string) => {
        const scope = this.world.calculateScope();
        return scope.visible.has(entityId);
      },
      isAccessible: (entityId: string) => {
        const scope = this.world.calculateScope();
        return scope.reachable.has(entityId);
      },
      isCarriedBy: (itemId: string, carrierId: string) => {
        const location = this.world.getLocation(itemId);
        return location === carrierId;
      },
      findLocationOf: (entityId: string) => {
        return this.world.getLocation(entityId) || undefined;
      },
      getTurnNumber: () => 0 // TODO: Implement turn tracking
    };
    
    return context;
  }

  /**
   * Create an IFLanguageProvider adapter for the current plugin
   */
  private createLanguageProviderAdapter(): IFLanguageProvider {
    if (!this.language) {
      throw new Error('No language plugin set');
    }
    
    const plugin = this.language;
    
    // Create an adapter that implements IFLanguageProvider using the plugin
    return {
      // Core LanguageProvider methods
      formatMessage: (key: string, params?: unknown) => 
        plugin.formatMessage(key, params as Record<string, unknown>),
      formatList: (items: string[], options?: Record<string, unknown>) => 
        plugin.formatList(items, options),
      getLanguageCode: () => plugin.getLanguageCode(),
      getLanguageName: () => plugin.getLanguageName(),
      getTextDirection: () => plugin.getTextDirection(),
      
      // IFLanguageProvider methods
      getVerbRegistry: () => {
        throw new Error('Verb registry not implemented in adapter');
      },
      getActionVerbs: (action) => plugin.getVerbsForAction(action),
      getActionForVerb: (verb) => plugin.getActionForVerb(verb),
      getEventMessage: (event, params) => plugin.formatEventMessage(event, params),
      getActionMessage: (action, phase, key, params) => 
        plugin.formatActionMessage(action, phase, key, params),
      formatItemName: (name, options) => plugin.formatItemName(name, options),
      formatDirection: (direction) => plugin.formatDirection(direction),
      getCanonicalDirection: (direction) => plugin.canonicalizeDirection(direction)
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
  getActionExecutor(): TraitAwareActionExecutor {
    return this.actionExecutor;
  }

  /**
   * Register a custom trait-based action
   */
  registerTraitBasedAction(action: any): void {
    this.actionExecutor.registerTraitBasedAction(action);
  }

  /**
   * Enable trait-based actions for all actions
   * (useful for testing during migration)
   */
  enableTraitBasedActions(): void {
    this.actionExecutor = createTraitAwareActionExecutor({
      forceTraitContext: true
    });
    this.registerStandardActions();
  }
}

/**
 * Create a new story instance
 * This provides the factory function mentioned in the test example
 */
export function createStory(config?: StoryConfig): Story {
  return new Story(config);
}
