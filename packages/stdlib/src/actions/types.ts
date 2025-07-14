/**
 * Core types for the event-driven action system
 * 
 * @deprecated Most types in this file have been replaced by enhanced-types.ts
 * Only ProcessedEvents and WorldChange remain relevant.
 * 
 * Actions are pure functions that validate conditions and return events.
 * They NEVER mutate state directly.
 */

import { SemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, ValidatedCommand, CapabilityData } from '@sharpee/world-model';

/**
 * @deprecated Use ActionContext from enhanced-types.ts instead
 * 
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
  
  /**
   * Get capability data (convenience method)
   */
  getCapability(name: string): CapabilityData | undefined;
}



/**
 * @deprecated Use Action interface from enhanced-types.ts instead
 * 
 * Action executor interface
 * 
 * Actions validate conditions and return events describing what should happen
 */
export interface ActionExecutor {
  /**
   * Unique identifier for this action
   */
  id: string;
  
  /**
   * Execute the action and return events
   * 
   * @param command The validated command
   * @param context Read-only context for queries
   * @returns Array of events describing what should happen
   */
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[];
  
  /**
   * Optional method to validate if this action can handle the command
   */
  canExecute?(command: ValidatedCommand, context: ActionContext): boolean;
  
  /**
   * Optional aliases for this action
   */
  aliases?: string[];
}

/**
 * @deprecated Use ActionRegistry from enhanced-types.ts instead
 * 
 * Registry for action executors
 */
export interface ActionRegistry {
  /**
   * Register an action executor
   */
  register(action: ActionExecutor): void;
  
  /**
   * Get an action executor by ID
   */
  get(actionId: string): ActionExecutor | any | undefined;
  
  /**
   * Get all registered actions
   */
  getAll(): ActionExecutor[];
  
  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean;
  
  /**
   * Find an action by ID or alias
   */
  find(actionIdOrAlias: string): ActionExecutor | undefined;
}

/**
 * Result of processing events
 */
export interface ProcessedEvents {
  /**
   * Events that were successfully applied
   */
  applied: SemanticEvent[];
  
  /**
   * Events that failed validation
   */
  failed: SemanticEvent[];
  
  /**
   * World changes that occurred
   */
  changes: WorldChange[];
}

/**
 * Describes a change to the world state
 */
export interface WorldChange {
  type: 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
  entityId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}
