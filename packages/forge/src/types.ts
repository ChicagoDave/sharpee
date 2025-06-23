// packages/forge/src/types.ts

import { 
  Entity, 
  EntityId, 
  SemanticEvent, 
  GameContext as CoreGameContext, 
  ChannelMessage,
  CommandResult
} from '@sharpee/core';

/**
 * Context provided to event handlers and callbacks
 */
export interface ForgeContext {
  /**
   * The player entity
   */
  player: PlayerContext;
  
  /**
   * The current location
   */
  currentLocation: LocationContext;
  
  /**
   * Whether this is the first visit to the current location
   */
  isFirstVisit: boolean;
  
  /**
   * Get an entity by its ID
   */
  getEntity: (id: EntityId) => EntityContext | undefined;
  
  /**
   * Find an entity by name
   */
  findEntity: (name: string) => EntityContext | undefined;
  
  /**
   * Move the player to a new location
   */
  moveTo: (locationId: string) => void;
  
  /**
   * Emit a message to the main output channel
   */
  emit: (message: string) => void;
  
  /**
   * Emit a message to a specific channel
   */
  emitToChannel: (channelId: string, message: string) => void;
  
  /**
   * Limit available actions (useful for special circumstances)
   */
  limitActions: (allowedActions: string[]) => void;
  
  /**
   * Start a conversation with an NPC
   */
  startConversation: (conversationId: string, npcId?: string) => void;
  
  /**
   * Get the underlying core game context
   */
  getCoreContext: () => CoreGameContext;
}

/**
 * Context for a player entity
 */
export interface PlayerContext extends EntityContext {
  /**
   * Check if the player has an item
   */
  has: (itemId: string) => boolean;
  
  /**
   * Get the player's inventory
   */
  getInventory: () => EntityContext[];
  
  /**
   * Add an item to the player's inventory
   */
  addToInventory: (itemId: string) => void;
  
  /**
   * Remove an item from the player's inventory
   */
  removeFromInventory: (itemId: string) => void;
  
  /**
   * Set a player attribute
   */
  setAttribute: <T>(key: string, value: T) => void;
  
  /**
   * Get a player attribute
   */
  getAttribute: <T>(key: string) => T | undefined;
}

/**
 * Context for a location entity
 */
export interface LocationContext extends EntityContext {
  /**
   * Get items in this location
   */
  getItems: () => EntityContext[];
  
  /**
   * Get characters in this location
   */
  getCharacters: () => EntityContext[];
  
  /**
   * Get exits from this location
   */
  getExits: () => Record<string, string>;
  
  /**
   * Check if this location is dark
   */
  isDark: boolean;
  
  /**
   * Check if this location has been visited
   */
  hasBeenVisited: boolean;
}

/**
 * Context for any entity
 */
export interface EntityContext {
  /**
   * Entity ID
   */
  id: EntityId;
  
  /**
   * Entity type
   */
  type: string;
  
  /**
   * Entity name
   */
  name: string;
  
  /**
   * Entity description
   */
  description: string;
  
  /**
   * Get an attribute value
   */
  getAttribute: <T>(key: string) => T | undefined;
  
  /**
   * Set an attribute value
   */
  setAttribute: <T>(key: string, value: T) => void;
  
  /**
   * Check if this entity has a specific attribute
   */
  hasAttribute: (key: string) => boolean;
  
  /**
   * Get entities related to this one by relationship type
   */
  getRelated: (relationshipType: string) => EntityContext[];
  
  /**
   * Add a relationship to another entity
   */
  addRelationship: (relationshipType: string, targetId: EntityId) => void;
  
  /**
   * Remove a relationship to another entity
   */
  removeRelationship: (relationshipType: string, targetId: EntityId) => void;
  
  /**
   * Get the underlying entity object
   */
  getEntity: () => Entity;
}

/**
 * Handler for events in the forge system
 */
export type ForgeEventHandler = (context: ForgeContext, event: SemanticEvent) => void;

/**
 * Handler for channel messages
 */
export type ChannelOutputHandler = (context: ForgeContext, message: ChannelMessage) => void;

/**
 * Handler for entering a location
 */
export type LocationEnterHandler = (context: ForgeContext) => void;

/**
 * Handler for examining an object
 */
export type ExamineHandler = (context: ForgeContext) => void;

/**
 * Handler for talking to a character
 */
export type TalkToHandler = (context: ForgeContext) => void;

/**
 * Handler for action commands
 */
export type ActionHandler = (context: ForgeContext, command: ParsedCommandContext) => void | Promise<void>;

/**
 * Condition function for game rules
 */
export type RuleCondition = (context: ForgeContext) => boolean;

/**
 * Effect function for game rules
 */
export type RuleEffect = (context: ForgeContext) => void;

/**
 * Simplified parsed command interface for forge actions
 */
export interface ParsedCommandContext {
  /**
   * The verb used in the command
   */
  verb: string;
  
  /**
   * The direct object of the command, if any
   */
  directObject?: string;
  
  /**
   * The preposition used, if any
   */
  preposition?: string;
  
  /**
   * The indirect object of the command, if any
   */
  indirectObject?: string;
  
  /**
   * The original command text
   */
  original: string;
}

/**
 * Configuration options for story creation
 */
export interface StoryOptions {
  /**
   * Whether to use strict type checking
   */
  strictMode?: boolean;
  
  /**
   * Default templates to use
   */
  defaultTemplates?: Record<string, string>;
  
  /**
   * Initial channel configuration
   */
  channelConfig?: Record<string, any>;
}

/**
 * Configuration for a location
 */
export interface LocationConfig {
  /**
   * Location name
   */
  name: string;
  
  /**
   * Location description
   */
  description: string;
  
  /**
   * Whether the location is dark
   */
  isDark?: boolean;
  
  /**
   * Exit connections to other locations
   */
  exits?: Record<string, string>;
}

/**
 * Configuration for an item
 */
export interface ItemConfig {
  /**
   * Item name
   */
  name: string;
  
  /**
   * Item description
   */
  description: string;
  
  /**
   * Whether the item can be taken
   */
  takeable?: boolean;
  
  /**
   * Adjectives that can be used to refer to the item
   */
  adjectives?: string[];
  
  /**
   * Whether the item is a container
   */
  isContainer?: boolean;
  
  /**
   * Whether the container is open (if it is a container)
   */
  isOpen?: boolean;
  
  /**
   * Whether the container is openable (if it is a container)
   */
  isOpenable?: boolean;
}

/**
 * Configuration for a character
 */
export interface CharacterConfig {
  /**
   * Character name
   */
  name: string;
  
  /**
   * Character description
   */
  description: string;
  
  /**
   * Character's conversations
   */
  conversations?: Record<string, string | Record<string, string>>;
  
  /**
   * Whether the character can move between locations
   */
  canMove?: boolean;
  
  /**
   * Initial location for the character
   */
  initialLocation?: string;
}

/**
 * Configuration for a custom action
 */
export interface ActionConfig {
  /**
   * Verbs that trigger this action
   */
  verbs: string[];
  
  /**
   * Whether the action requires a direct object
   */
  requiresDirectObject?: boolean;
  
  /**
   * Whether the action requires a specific preposition
   */
  requiredPreposition?: string;
  
  /**
   * Whether the action requires an indirect object
   */
  requiresIndirectObject?: boolean;
}

/**
 * Configuration for a game rule
 */
export interface RuleConfig {
  /**
   * Name of the rule
   */
  name: string;
  
  /**
   * Condition when the rule applies
   */
  condition: RuleCondition;
  
  /**
   * Effect to apply when the condition is met
   */
  effect: RuleEffect;
  
  /**
   * Priority of the rule (higher runs first)
   */
  priority?: number;
}