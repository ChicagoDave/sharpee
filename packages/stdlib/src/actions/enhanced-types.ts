/**
 * Enhanced action system types
 * 
 * This provides a cleaner, more author-friendly action system while
 * maintaining the event-driven architecture. Actions return events,
 * but the enhanced context makes it easy to create those events.
 */

import { SemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, ValidatedCommand } from '@sharpee/world-model';

/**
 * Read-only context for action execution
 * 
 * Provides query methods but NO mutation capabilities
 */
export interface ActionContext {
  /**
   * Read-only access to the world model
   */
  readonly world: WorldModel;
  
  /**
   * The player entity
   */
  readonly player: IFEntity;
  
  /**
   * The player's current location
   */
  readonly currentLocation: IFEntity;
  
  /**
   * The validated command being executed
   */
  readonly command: ValidatedCommand;
  
  /**
   * Check if an entity is visible to the player
   */
  canSee(entity: IFEntity): boolean;
  
  /**
   * Check if an entity is physically reachable by the player
   */
  canReach(entity: IFEntity): boolean;
  
  /**
   * Check if an entity can be taken by the player
   */
  canTake(entity: IFEntity): boolean;
  
  /**
   * Check if an entity is in scope for the player
   */
  isInScope(entity: IFEntity): boolean;
  
  /**
   * Get all entities visible to the player
   */
  getVisible(): IFEntity[];
  
  /**
   * Get all entities in scope for the player
   */
  getInScope(): IFEntity[];
}

/**
 * Enhanced action context with helper methods for event creation
 * 
 * This makes it easy to create properly formatted events with message IDs
 * while maintaining the event-driven architecture.
 * 
 * ADR-041: Simplified to a single event() method for consistency
 */
export interface EnhancedActionContext extends ActionContext {
  /**
   * The action being executed (for message resolution)
   */
  readonly action: Action;
  
  /**
   * Create an event with automatic entity injection and metadata enrichment
   * 
   * @param type Event type (e.g., 'if.event.taken', 'action.success', 'action.error')
   * @param data Event data - will be enriched with entities and metadata
   * @returns A properly formatted SemanticEvent
   * 
   * @example
   * // Simple error
   * return [context.event('action.error', { 
   *   actionId: this.id, 
   *   messageId: 'no_target' 
   * })]
   * 
   * @example  
   * // Success with typed data
   * const eventData: TakenEventData = { item: noun.name }
   * return [
   *   context.event('if.event.taken', eventData),
   *   context.event('action.success', { 
   *     actionId: this.id, 
   *     messageId: 'taken',
   *     params: eventData
   *   })
   * ]
   */
  event(type: string, data: any): SemanticEvent;
}

/**
 * Unified action interface
 * 
 * Actions define patterns, messages, and execution logic together.
 * They return events, not direct text or mutation instructions.
 */
export interface Action {
  /**
   * Unique identifier for this action
   */
  id: string;
  
  /**
   * List of message IDs this action requires
   * Used for documentation and validation
   * Example: ['taken', 'already_have', 'cant_take']
   */
  requiredMessages?: string[];
  
  /**
   * Execute the action and return events
   * 
   * @param context Enhanced context with helper methods
   * @returns Array of events describing what should happen
   */
  execute(context: EnhancedActionContext): SemanticEvent[];
  
  /**
   * Optional method to validate if this action can handle the command
   * By default, pattern matching is sufficient
   */
  canExecute?(context: EnhancedActionContext): boolean;
  
  /**
   * Message ID for the action description (for help/documentation)
   * The language provider should have this message
   */
  descriptionMessageId?: string;
  
  /**
   * Message ID for example commands (for help/documentation)
   * The language provider should format this as a list
   */
  examplesMessageId?: string;
  
  /**
   * Action group (for organizing related actions)
   */
  group?: string;
  
  /**
   * Priority for pattern matching (higher = preferred)
   * Default is 0
   */
  priority?: number;
}

/**
 * Text event structure
 * 
 * Standard structure for events that produce text output
 */
export interface TextEvent extends SemanticEvent {
  type: 'text' | 'action.success' | 'action.error' | 'game.message';
  data: {
    /**
     * Message ID to look up
     */
    messageId: string;
    
    /**
     * Parameters for message formatting
     */
    params?: Record<string, any>;
    
    /**
     * Optional fallback text if message ID not found
     */
    fallback?: string;
    
    /**
     * Optional metadata
     */
    metadata?: Record<string, any>;
  };
}

/**
 * Action registry interface
 */
export interface ActionRegistry {
  /**
   * Register an action
   */
  register(action: Action): void;
  
  /**
   * Register multiple actions
   */
  registerMany(actions: Action[]): void;
  
  /**
   * Get an action by ID
   */
  get(actionId: string): Action | undefined;
  
  /**
   * Get all registered actions
   */
  getAll(): Action[];
  
  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean;
  
  /**
   * Find actions by pattern
   */
  findByPattern(pattern: string): Action[];
  
  /**
   * Get actions by group
   */
  getByGroup(group: string): Action[];
  
  /**
   * Register messages for an action
   */
  registerMessages(actionId: string, messages: Record<string, string>): void;
}

/**
 * Message registry interface
 */
export interface MessageRegistry {
  /**
   * Register messages
   */
  register(messages: Record<string, string>): void;
  
  /**
   * Register messages with a namespace
   */
  registerNamespaced(namespace: string, messages: Record<string, string>): void;
  
  /**
   * Get a message by ID
   */
  getMessage(id: string, params?: Record<string, any>): string;
  
  /**
   * Check if a message exists
   */
  hasMessage(id: string): boolean;
  
  /**
   * Get all messages in a namespace
   */
  getNamespace(namespace: string): Record<string, string>;
  
  /**
   * Override a message
   */
  override(id: string, message: string): void;
}

/**
 * Helper type for action definitions
 */
export type ActionDefinition = Omit<Action, 'execute'> & {
  execute: (context: EnhancedActionContext) => SemanticEvent[];
};

/**
 * Standard message namespaces
 */
export const MessageNamespaces = {
  SYSTEM: 'if.system',
  ACTION: 'if.action',
  ERROR: 'if.error',
  GAME: 'if.game',
  STORY: 'story',
  EXTENSION: 'ext'
} as const;

/**
 * Standard event types
 */
export const EventTypes = {
  TEXT: 'text',
  ACTION_SUCCESS: 'action.success',
  ACTION_ERROR: 'action.error',
  ACTION_FAILED: 'action.failed',
  GAME_MESSAGE: 'game.message',
  SYSTEM_MESSAGE: 'system.message'
} as const;