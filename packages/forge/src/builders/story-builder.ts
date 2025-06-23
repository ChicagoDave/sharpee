// packages/forge/src/builders/story-builder.ts

import { 
  StoryOptions, 
  LocationConfig,
  ItemConfig,
  CharacterConfig,
  ActionConfig,
  RuleConfig,
  ForgeEventHandler,
  ChannelOutputHandler,
  ForgeContext,
  LocationContext,
  EntityContext,
  PlayerContext,
  EntityId,
  RelationshipType
} from '../types';
import { DoorBuilder, DoorConfig } from './door-builder';
import { Entity, DoorAttributes, IFEntity, IFEntityType } from '@sharpee/core/src/world-model/if-entities/types';
import { Direction } from '@sharpee/core/src/world-model/types';
import { GameContext } from '@sharpee/core';
import { ChannelManager, createChannelManager, createEventEmitter } from '@sharpee/core/src/channels/types';
import { SemanticEvent } from '@sharpee/core/src/events/types';
import { TextService, createTextService } from '@sharpee/core/src/events/text-processor';
import { setupStandardChannels } from '@sharpee/core/src/channels/standard';
import { LanguageProvider, VerbDefinition, VerbCategory } from '@sharpee/core/src/language/types';
import { findEntities, findEntitiesByName } from '@sharpee/core/src/world-model/types/query';

/**
 * Implementation of the LocationBuilder for fluent API
 */
export class LocationBuilder {
  private storyBuilder: StoryBuilder;
  private locationId: string;
  private config: LocationConfig;
  private doors: Record<string, DoorConfig> = {}; // Track doors associated with this location

  constructor(storyBuilder: StoryBuilder, locationId: string, config: LocationConfig) {
    this.storyBuilder = storyBuilder;
    this.locationId = locationId;
    this.config = config;
  }

  /**
   * Add an exit from this location to another
   */
  /**
   * Add a door connecting this location to another
   */
  public withDoor(direction: Direction, destinationId: string, doorId: string, options: { locked?: boolean, hidden?: boolean, key?: string } = {}): DoorBuilder {
    const doorConfig: DoorConfig = {
      type: IFEntityType.DOOR,
      name: `door_${this.locationId}_${destinationId}`,
      description: options.hidden ? "A hidden door" : "A door",
      attributes: {
        openable: true,
        open: false,
        lockable: options.locked || false,
        key: options.key,
        takeable: false,
        fixed: true,
        hidden: options.hidden || false
      },
      connects: [this.locationId, destinationId]
    };

    // Store the door config
    this.doors[doorId] = doorConfig;

    // Add the door to the story
    this.storyBuilder.addEntity(doorId, doorConfig);

    // Add relationships
    this.storyBuilder.addRelationship(doorId, this.locationId, IFRelationship.CONNECTS);
    this.storyBuilder.addRelationship(doorId, destinationId, IFRelationship.CONNECTS);

    // Add exit relationship
    if (!options.hidden) {
      this.storyBuilder.addRelationship(this.locationId, destinationId, directionToRelationship(direction));
    }

    return new DoorBuilder(this.storyBuilder, doorId, doorConfig);
  }

  /**
   * Add an item to this location
   */
  public withItem(itemId: string, config: ItemConfig): LocationBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Add a character to this location
   */
  public withCharacter(characterId: string, config: CharacterConfig): LocationBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Register a handler for when the player enters this location
   */
  public onEnter(handler: (context: ForgeContext) => void): LocationBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Return to the story builder
   */
  public endLocation(): StoryBuilder {
    // Add all doors to the location's exits if they're not hidden
    for (const [doorId, doorConfig] of Object.entries(this.doors)) {
      if (!doorConfig.hidden) {
        const [from, to] = doorConfig.connects || [];
        const direction = this.storyBuilder.getDirection(from, to);
        if (direction) {
          this.config.exits = this.config.exits || {};
          this.config.exits[direction] = doorId;
        }
      }
    }
    return this.storyBuilder;
  }
}

/**
 * Implementation of the ItemBuilder for fluent API
 */
export class ItemBuilder {
  private storyBuilder: StoryBuilder;
  private itemId: string;
  private config: ItemConfig;

  constructor(storyBuilder: StoryBuilder, itemId: string, config: ItemConfig) {
    this.storyBuilder = storyBuilder;
    this.itemId = itemId;
    this.config = config;
  }

  /**
   * Make this item a container
   */
  public asContainer(options: { openable?: boolean, open?: boolean } = {}): ItemBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Add content to this item (if it's a container)
   */
  public withContent(itemId: string, config: ItemConfig): ItemBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Register a handler for when the player examines this item
   */
  public onExamine(handler: (context: ForgeContext) => void): ItemBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Return to the story builder
   */
  public endItem(): StoryBuilder {
    return this.storyBuilder;
  }
}

/**
 * Implementation of the CharacterBuilder for fluent API
 */
export class CharacterBuilder {
  private storyBuilder: StoryBuilder;
  private characterId: string;
  private config: CharacterConfig;

  constructor(storyBuilder: StoryBuilder, characterId: string, config: CharacterConfig) {
    this.storyBuilder = storyBuilder;
    this.characterId = characterId;
    this.config = config;
  }

  /**
   * Add a conversation for this character
   */
  public withConversation(id: string, topics: Record<string, string>): CharacterBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Register a handler for when the player talks to this character
   */
  public onTalkTo(handler: (context: ForgeContext) => void): CharacterBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Return to the story builder
   */
  public endCharacter(): StoryBuilder {
    return this.storyBuilder;
  }
}

/**
 * Implementation of the ActionBuilder for fluent API
 */
export class ActionBuilder {
  private storyBuilder: StoryBuilder;
  private actionId: string;
  private config: ActionConfig;

  constructor(storyBuilder: StoryBuilder, actionId: string, config: ActionConfig) {
    this.storyBuilder = storyBuilder;
    this.actionId = actionId;
    this.config = config;
  }

  /**
   * Register a handler for this custom action
   */
  public onExecute(handler: (context: ForgeContext, command: any) => void): ActionBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Return to the story builder
   */
  public endAction(): StoryBuilder {
    return this.storyBuilder;
  }
}

/**
 * Implementation of the Story class for running the story
 */
export class Story {
  private gameContext: GameContext;
  private eventEmitter: ReturnType<typeof createEventEmitter>;
  private channelManager: ChannelManager;
  private defaultTemplates: Record<string, string>;
  private startingLocationId: string;

  constructor(options: {
    gameContext: GameContext,
    eventEmitter: ReturnType<typeof createEventEmitter>,
    channelManager: ChannelManager,
    defaultTemplates: Record<string, string>,
    startingLocationId: string
  }) {
    this.gameContext = options.gameContext;
    this.eventEmitter = options.eventEmitter;
    this.channelManager = options.channelManager;
    this.defaultTemplates = options.defaultTemplates;
    this.startingLocationId = options.startingLocationId;
  }

  /**
   * Start the story
   */
  public start(): void {
    // Implementation will go here
  }

  /**
   * Process a command
   */
  public processCommand(command: string): void {
    // Implementation will go here
  }

  /**
   * Get messages from a specific channel
   */
  public getChannelMessages(channelId: string): any[] {
    return this.channelManager.getMessages(channelId);
  }

  /**
   * Get all current messages across channels
   */
  public getAllMessages(): any[] {
    return this.channelManager.getAllMessages();
  }

  /**
   * Get the forge context
   */
  public getForgeContext(): ForgeContext {
    // Implementation will go here
    return {} as ForgeContext;
  }
}

/**
 * Fluent API for creating interactive fiction stories
 */
export class StoryBuilder {
  private entities: Record<string, any> = {};
  private relationships: Record<string, Record<string, string[]>> = {};
  private eventHandlers: Map<string, ForgeEventHandler[]> = new Map();
  private channelHandlers: Map<string, ChannelOutputHandler[]> = new Map();
  private startingLocationId: string | null = null;
  private defaultTemplates: Record<string, string> = {};
  private doors: Record<string, DoorConfig> = {};

  /**
   * Create a new story builder
   */
  constructor(options: StoryOptions = {}) {
    // Set up default templates if provided
    if (options.defaultTemplates) {
      this.defaultTemplates = { ...options.defaultTemplates };
    }
  }

  /**
   * Set the starting location for the story
   */
  public startAt(locationId: string): StoryBuilder {
    this.startingLocationId = locationId;
    return this;
  }

  /**
   * Add a location to the story
   */
  public addLocation(id: string, config: LocationConfig): LocationBuilder {
    // Store the location entity
    this.entities[id] = {
      id,
      type: 'location',
      attributes: {
        name: config.name,
        description: config.description,
        isDark: config.isDark || false
      }
    };
    
    // Add exits if defined
    if (config.exits) {
      this.relationships[id] = this.relationships[id] || {};
      this.relationships[id][RelationshipType.CONNECTS_TO] = Object.values(config.exits);
      
      // Create relationship for the other direction
      Object.entries(config.exits).forEach(([direction, targetId]) => {
        // Store the reverse direction
        const reverseDirection = this.getReverseDirection(direction);
        
        this.relationships[targetId] = this.relationships[targetId] || {};
        this.relationships[targetId][RelationshipType.CONNECTS_TO] = 
          this.relationships[targetId][RelationshipType.CONNECTS_TO] || [];
          
        if (!this.relationships[targetId][RelationshipType.CONNECTS_TO].includes(id)) {
          this.relationships[targetId][RelationshipType.CONNECTS_TO].push(id);
        }
      });
    }
    
    // Create and return a location builder for further configuration
    return new LocationBuilder(this, id, config);
  }

  /**
   * Add an item to the story
   */
  public addItem(id: string, config: ItemConfig): ItemBuilder {
    // Store the item entity
    this.entities[id] = {
      id,
      type: 'item',
      attributes: {
        name: config.name,
        description: config.description,
        takeable: config.takeable !== false,
        adjectives: config.adjectives || []
      }
    };
    
    // Set up container properties if applicable
    if (config.isContainer) {
      this.entities[id].attributes.isContainer = true;
      this.entities[id].attributes.isOpen = config.isOpen !== false;
      this.entities[id].attributes.isOpenable = config.isOpenable !== false;
    }
    
    // Create and return an item builder for further configuration
    return new ItemBuilder(this, id, config);
  }

  /**
   * Add a character to the story
   */
  public addCharacter(id: string, config: CharacterConfig): CharacterBuilder {
    // Store the character entity
    this.entities[id] = {
      id,
      type: 'character',
      attributes: {
        name: config.name,
        description: config.description,
        canMove: config.canMove || false
      }
    };
    
    // Place in initial location if specified
    if (config.initialLocation) {
      this.relationships[config.initialLocation] = this.relationships[config.initialLocation] || {};
      this.relationships[config.initialLocation][RelationshipType.CONTAINS] = 
    }
    
    // Create and return a character builder for further configuration
    return new CharacterBuilder(this, id, config);
  }

  /**
   * Add a custom action to the story
   */
  public addAction(id: string, config: ActionConfig): ActionBuilder {
    // Implementation will go here
    
    // Create and return an action builder for further configuration
    return new ActionBuilder(this, id, config);
  }

  /**
   * Add a game rule to the story
   */
  public addRule(config: RuleConfig): StoryBuilder {
    // Implementation will go here
    return this;
  }

  /**
   * Add an entity to the story
   */
  addEntity(id: string, entity: IFEntity): void {
    this.entities[id] = entity;
  }

  /**
   * Add a relationship between entities
   */
  addRelationship(from: string, to: string, type: IFRelationship): void {
    if (!this.relationships[from]) {
      this.relationships[from] = {};
    }
    if (!this.relationships[from][type]) {
      this.relationships[from][type] = [];
    }
    this.relationships[from][type].push(to);
  }

  /**
   * Get the direction between two locations
   */
  getDirection(from: string, to: string): Direction | null {
    // For now, just return the first direction we find
    for (const direction of ['north', 'south', 'east', 'west',
      'northeast', 'northwest', 'southeast', 'southwest',
      'up', 'down', 'in', 'out'] as Direction[]) {
      const relationship = directionToRelationship(direction);
      if (this.relationships[from]?.[relationship]?.includes(to)) {
        return direction;
      }
    }
    return null;
  }

  /**
   * Get the reverse direction for exit connections
   */
  private getReverseDirection(direction: string): string {
    const directionMap: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'northeast': 'southwest',
      'southwest': 'northeast',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in',
      // Add nautical directions if needed
      'fore': 'aft',
      'aft': 'fore',
      'port': 'starboard',
      'starboard': 'port'
    };
    
    return directionMap[direction] || direction;
  }

  /**
  }

  /**
   * Register an event handler
   */
  public onEvent(eventType: string, handler: ForgeEventHandler): StoryBuilder {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    return this;
  }

  /**
   * Register a channel output handler
   */
  public onChannel(channelId: string, handler: ChannelOutputHandler): StoryBuilder {
    if (!this.channelHandlers.has(channelId)) {
      this.channelHandlers.set(channelId, []);
    }
    this.channelHandlers.get(channelId)!.push(handler);
    return this;
  }

  /**
   * Set a template for a specific event type
   */
  public setTemplate(eventType: string, template: string): StoryBuilder {
    this.defaultTemplates[eventType] = template;
    return this;
  }

  /**
   * Build and return the complete story
   */
  public  build(): Story {
    if (!this.startingLocationId) {
      throw new Error('No starting location set. Use startAt(locationId) to set one.');
    }

    // Create the game context
    const gameContext = {
      worldState: {
        entities: this.entities,
        relationships: this.relationships,
        meta: {
          version: '1.0',
          timestamp: Date.now(),
          storyId: Math.random().toString(36).substring(2),
          turnNumber: 0,
          activeEntityId: this.playerId,
          focusEntityId: this.startingLocationId
        }
      },
      player: this.entities[this.playerId!] as Entity,
      currentLocation: this.entities[this.startingLocationId] as Entity,
      textService: createTextService(),
      languageProvider: {
        verbs: new Map(Object.entries({
          look: {
            canonical: 'look',
            synonyms: ['look', 'examine', 'x', 'l'],
            description: 'Look at something or examine your surroundings',
            category: VerbCategory.OBSERVATION,
            requiresDirectObject: false,
            allowsIndirectObject: false
          },
          take: {
            canonical: 'take',
            synonyms: ['take', 'get', 'pick up', 'grab'],
            description: 'Take an object from the current location',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          drop: {
            canonical: 'drop',
            synonyms: ['drop', 'put down', 'discard'],
            description: 'Drop an object you are carrying',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          go: {
            canonical: 'go',
            synonyms: ['go', 'move', 'walk', 'run'],
            description: 'Move to a different location',
            category: VerbCategory.MOVEMENT,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          open: {
            canonical: 'open',
            synonyms: ['open'],
            description: 'Open a container or door',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          close: {
            canonical: 'close',
            synonyms: ['close'],
            description: 'Close a container or door',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          lock: {
            canonical: 'lock',
            synonyms: ['lock'],
            description: 'Lock a container or door with a key',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: true
          },
          unlock: {
            canonical: 'unlock',
            synonyms: ['unlock'],
            description: 'Unlock a container or door with a key',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: true
          },
          use: {
            canonical: 'use',
            synonyms: ['use', 'activate', 'operate'],
            description: 'Use or activate an object',
            category: VerbCategory.MANIPULATION,
            requiresDirectObject: true,
            allowsIndirectObject: false
          },
          inventory: {
            canonical: 'inventory',
            synonyms: ['inventory', 'i', 'inv'],
            description: 'View your current inventory',
            category: VerbCategory.INFORMATION,
            requiresDirectObject: false,
            allowsIndirectObject: false
          },
          help: {
            canonical: 'help',
            synonyms: ['help', '?'],
            description: 'Get help or list available commands',
            category: VerbCategory.META,
            requiresDirectObject: false,
            allowsIndirectObject: false
          }
        })) as Map<string, VerbDefinition>,
        getVerbs: () => this.languageProvider.verbs,
        getVerbSynonyms: (canonicalVerb: string) => {
          const definition = this.languageProvider.verbs.get(canonicalVerb);
          return definition ? definition.synonyms : [];
        },
        getTemplate: (key: string) => this.defaultTemplates[key] || '',
        formatMessage: (templateKey: string, ...params: any[]) => {
          const template = this.languageProvider.getTemplate(templateKey);
          return template.replace(/{(\d+)}/g, (match, index) => {
            return params[index] || match;
          });
        },
        formatList: (headerTemplate: string, itemTemplate: string, headerParams: any[], items: any[]) => {
          const header = this.languageProvider.formatMessage(headerTemplate, ...headerParams);
          const itemTexts = items.map(item => 
            this.languageProvider.formatMessage(itemTemplate, item)
          );
          return `${header}\n${itemTexts.join('\n')}`;
        },
        isVerb: (word: string) => {
          const verbs = this.languageProvider.getVerbs();
          for (const [canonical, def] of verbs.entries()) {
            if (canonical === word || def.synonyms.includes(word)) {
              return true;
            }
          }
          return false;
        },
        getCanonicalVerb: (verb: string) => {
          const verbs = this.languageProvider.getVerbs();
          for (const [canonical, def] of verbs.entries()) {
            if (canonical === verb || def.synonyms.includes(verb)) {
              return canonical;
            }
          }
          return undefined;
        },
        addVerbs: (verbs: Record<string, VerbDefinition>) => {
          const newVerbs = new Map(this.languageProvider.verbs);
          for (const [verb, def] of Object.entries(verbs)) {
            newVerbs.set(verb, def);
          }
          this.languageProvider.verbs = newVerbs;
        },
        setTemplate: (key: string, template: string) => {
          this.defaultTemplates[key] = template;
        },
        getParserProvider: () => {
          // TODO: Implement parser provider
          return {} as LanguageParserProvider;
        },
          look: {
            synonyms: ['look', 'examine', 'x', 'l'],
            requiresObject: false,
            requiresIndirect: false
          },
          take: {
            synonyms: ['take', 'get', 'pick up', 'grab'],
            requiresObject: true,
            requiresIndirect: false
          },
          drop: {
            synonyms: ['drop', 'put down', 'discard'],
            requiresObject: true,
            requiresIndirect: false
          },
          go: {
            synonyms: ['go', 'move', 'walk', 'run'],
            requiresObject: true,
            requiresIndirect: false
          },
          open: {
            synonyms: ['open'],
            requiresObject: true,
            requiresIndirect: false
          },
          close: {
            synonyms: ['close'],
            requiresObject: true,
            requiresIndirect: false
          },
          lock: {
            synonyms: ['lock'],
            requiresObject: true,
            requiresIndirect: true
          },
          unlock: {
            synonyms: ['unlock'],
            requiresObject: true,
            requiresIndirect: true
          },
          use: {
            synonyms: ['use', 'activate', 'operate'],
            requiresObject: true,
            requiresIndirect: false
          },
          inventory: {
            synonyms: ['inventory', 'i', 'inv'],
            requiresObject: false,
            requiresIndirect: false
          },
          help: {
            synonyms: ['help', '?'],
            requiresObject: false,
            requiresIndirect: false
          }
        })),
        getVerbSynonyms: (verb: string) => {
          const verbMap = this.languageProvider.getVerbs();
          const definition = verbMap.get(verb);
          return definition ? definition.synonyms : [];
        },
        formatMessage: (message: string, ...args: any[]) => {
          return message.replace(/{(\d+)}/g, (match, index) => {
            return args[index] || match;
          });
        },
        formatList: (items: string[], conjunction: string = 'and') => {
          if (items.length === 0) return '';
          if (items.length === 1) return items[0];
          if (items.length === 2) return items.join(` ${conjunction} `);
          return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
        },
        getArticle: (entity: Entity) => {
          if (entity.attributes.article) return entity.attributes.article;
          return entity.attributes.plural ? 'some' : 'a';
        },
        getPreposition: (entity: Entity) => {
          return entity.attributes.container ? 'in' : 'on';
        },
        formatEntityName: (entity: Entity) => {
          const article = this.languageProvider.getArticle(entity);
          const name = entity.attributes.name || 'it';
          return `${article} ${name}`;
        },
        formatVerb: (verb: string, entity?: Entity) => {
          return verb;
        },
        formatDirection: (direction: string) => {
          return direction;
        },
        formatNumber: (number: number) => {
          return number.toString();
        },
        formatTime: (time: number) => {
          return new Date(time).toLocaleTimeString();
        },
        formatDate: (date: number) => {
          return new Date(date).toLocaleDateString();
        },
        formatDateTime: (datetime: number) => {
          return new Date(datetime).toLocaleString();
        },
        formatDuration: (duration: number) => {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          return `${minutes}m ${seconds}s`;
        },
        formatScore: (score: number, maxScore: number) => {
          return `${score}/${maxScore}`;
        },
        formatTurn: (turn: number) => {
          return `Turn ${turn}`;
        },
        formatProgress: (current: number, total: number) => {
          return `${current}/${total}`;
        }
      },
      getEntity: (id: EntityId) => this.entities[id] as Entity,
      getEntitiesByType: (type: string) => Object.values(this.entities).filter(e => e.type === type),
      getRelatedEntities: (entityId: EntityId, relationship: RelationshipType) => {
        return this.relationships[entityId]?.[relationship] || [];
      },
      isAccessible: (entityId: EntityId) => {
        // TODO: Implement proper accessibility check
        return true;
      },
      isReachable: (entityId: EntityId) => {
        // TODO: Implement proper reachability check
        return true;
      },
      isVisible: (entityId: EntityId) => {
        const entity = this.entities[entityId];
        return entity.attributes.visible !== false;
      },
      findEntityByName: (name: string) => {
        return Object.values(this.entities).find(entity => 
          entity.attributes.name?.toLowerCase() === name.toLowerCase()
        );
      },
      findEntitiesByName: (name: string) => {
        return Object.values(this.entities).filter(entity => 
          entity.attributes.name?.toLowerCase() === name.toLowerCase()
        );
      },
      findEntities: (options: { includeInventory?: boolean; typeFilter?: string[] }) => {
        const { includeInventory = false, typeFilter = [] } = options;
        let entities = Object.values(this.entities);
        
        if (typeFilter.length > 0) {
          entities = entities.filter(entity => typeFilter.includes(entity.type));
        }
        
        return entities;
      },
      createTextFormatter: () => createTextService()
      findLocationOf: (entityId: EntityId) => {
        const relationships = this.relationships;
        for (const [subject, verbs] of Object.entries(relationships)) {
          if (verbs.contains && verbs.contains.includes(entityId)) {
            return subject;
          }
        }
        return undefined;
      },
      isContainedIn: (itemId: EntityId, containerId: EntityId) => {
        return this.relationships[containerId]?.contains?.includes(itemId) || false;
      },
      updateWorldState: (updater) => {
        const newEntities = { ...this.entities };
        const newRelationships = { ...this.relationships };
        updater({ entities: newEntities, relationships: newRelationships });
        return {
          ...gameContext,
          worldState: {
            entities: newEntities,
            relationships: newRelationships
          }
        };
      }
    };

    // Create event emitter
    const eventEmitter = createEventEmitter();

    // Create channel manager
    const channelManager = createChannelManager();

    // Set up standard channels
    this.setupStandardChannels(channelManager);

    // Register event handlers
    this.eventHandlers.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        eventEmitter.on(eventType, (event: SemanticEvent) => {
          // Will need to convert GameContext to ForgeContext before calling handler
          // handler(forgeContext, event);
        });
      });
    });

    // Create story instance
    return new Story({
      gameContext,
      eventEmitter,
      channelManager,
      defaultTemplates: this.defaultTemplates,
      startingLocationId: this.startingLocationId
    });
  }
  
  /**
   * Set up standard channels for the story
   */
  private setupStandardChannels(channelManager: ChannelManager): void {
    // Main output channel
    channelManager.registerChannel({
      id: 'MAIN',
      name: 'Main Output',
      description: 'Primary text output channel',
      eventTypes: ['*'],
      formatter: createTextFormatter('text')
    });
    
    // Location channel
    channelManager.registerChannel({
      id: 'LOCATION',
      name: 'Location',
      description: 'Current location information',
      eventTypes: [StandardEventTypes.LOCATION_ENTERED, StandardEventTypes.LOCATION_DESCRIBED],
      formatter: createTextFormatter('location')
    });
    
    // Inventory channel
    channelManager.registerChannel({
      id: 'INVENTORY',
      name: 'Inventory',
      description: 'Player inventory information',
      eventTypes: [StandardEventTypes.INVENTORY_LISTED, StandardEventTypes.ITEM_TAKEN, StandardEventTypes.ITEM_DROPPED],
      formatter: createTextFormatter('inventory')
    });
    
    // Status channel
    channelManager.registerChannel({
      id: 'STATUS',
      name: 'Status',
      description: 'Game status information',
      eventTypes: [StandardEventTypes.SCORE_CHANGED, StandardEventTypes.TURN_PASSED, StandardEventTypes.GAME_STATE_CHANGED],
      formatter: createTextFormatter('status')
    });
    
    // Error channel
    channelManager.registerChannel({
      id: 'ERROR',
      name: 'Error',
      description: 'Error messages',
      eventTypes: [StandardEventTypes.ERROR, StandardEventTypes.COMMAND_FAILED],
      formatter: createTextFormatter('error')
    });
    
    // NPC channel
    channelManager.registerChannel({
      id: 'NPC-ACTIVITY',
      name: 'NPC Activity',
      description: 'Non-player character activities',
      eventTypes: [StandardEventTypes.CHARACTER_ACTED, StandardEventTypes.CHARACTER_SPOKE, StandardEventTypes.CHARACTER_MOVED],
      formatter: createTextFormatter('npc-activity')
    });
    
    // Item channels
    channelManager.registerChannel({
      id: 'ITEM-DROPPED',
      name: 'Item Dropped',
      description: 'When items are dropped',
      eventTypes: [StandardEventTypes.ITEM_DROPPED],
      formatter: createTextFormatter('item-dropped')
    });
    
    channelManager.registerChannel({
      id: 'ITEM-TAKEN',
      name: 'Item Taken',
      description: 'When items are taken',
      eventTypes: [StandardEventTypes.ITEM_TAKEN],
      formatter: createTextFormatter('item-taken')
    });
    
    channelManager.registerChannel({
      id: 'ITEM-STOLEN',
      name: 'Item Stolen',
      description: 'When items are stolen',
      eventTypes: [StandardEventTypes.ITEM_STOLEN],
      formatter: createTextFormatter('item-stolen')
    });
  }
  
  /**
   * Get the reverse direction for exit connections
   */
  private getReverseDirection(direction: string): string {
    const directionMap: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'northeast': 'southwest',
      'southwest': 'northeast',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in',
      // Add nautical directions if needed
      'fore': 'aft',
      'aft': 'fore',
      'port': 'starboard',
      'starboard': 'port'
    };
    
    return directionMap[direction.toLowerCase()] || direction;
  }
}
