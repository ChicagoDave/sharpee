// packages/core/src/world-model/types/state-tree.ts

import { Entity, EntityId } from './entity';

/**
 * Represents the entire world state as an immutable tree
 */
export interface WorldState {
  /**
   * All entities indexed by their ID
   */
  entities: Record<EntityId, Entity>;
  
  /**
   * Metadata about the current state
   */
  meta: WorldStateMeta;
  
  /**
   * Optional system-specific state extensions
   */
  extensions?: Record<string, unknown>;
}

/**
 * Metadata about the world state
 */
export interface WorldStateMeta {
  /**
   * Version of the world model
   */
  version: string;
  
  /**
   * Timestamp when this state was created
   */
  timestamp: number;
  
  /**
   * Current turn or tick number
   */
  turnNumber: number;
  
  /**
   * ID of the current active entity (e.g., player character)
   */
  activeEntityId?: EntityId;
  
  /**
   * ID of the current focal point (e.g., current room)
   */
  focusEntityId?: EntityId;
}

/**
 * A function that transforms a world state into a new world state
 */
export type StateTransformer = (state: WorldState) => WorldState;

/**
 * History entry for tracking state changes
 */
export interface StateHistoryEntry {
  /**
   * The world state at this point in history
   */
  state: WorldState;
  
  /**
   * Optional description of what caused this state change
   */
  description?: string;
  
  /**
   * Optional command that led to this state
   */
  command?: string;
}

/**
 * Configuration for the state manager
 */
export interface StateManagerConfig {
  /**
   * Maximum number of history entries to keep
   */
  maxHistorySize?: number;
  
  /**
   * Whether to enable undo functionality
   */
  enableUndo?: boolean;
  
  /**
   * Whether to track all state changes or just command-driven ones
   */
  trackAllChanges?: boolean;
}