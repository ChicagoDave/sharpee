/**
 * Domain contracts for world state changes and event processing
 */

import { SemanticEvent } from '@sharpee/core';

/**
 * Represents a change to the world state
 */
export interface WorldChange {
  type: 'move' | 'create' | 'delete' | 'modify' | 'relate' | 'unrelate';
  entityId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Configuration for world model behavior
 */
export interface WorldConfig {
  enableSpatialIndex?: boolean;
  maxDepth?: number;
  strictMode?: boolean;
}

/**
 * World state storage
 */
export interface WorldState {
  [key: string]: any;
}

/**
 * Options for finding entities
 */
export interface FindOptions {
  includeScenery?: boolean;
  includeInvisible?: boolean;
  maxDepth?: number;
}

/**
 * Options for getting contents
 */
export interface ContentsOptions {
  recursive?: boolean;
  includeWorn?: boolean;
  visibleOnly?: boolean;
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
  failed: Array<{
    event: SemanticEvent;
    reason: string;
  }>;
  
  /**
   * World changes that occurred
   */
  changes: WorldChange[];
  
  /**
   * Events generated as reactions to the processed events
   */
  reactions: SemanticEvent[];
}

/**
 * Options for event processing
 */
export interface ProcessorOptions {
  /**
   * Whether to validate events before applying them
   */
  validate?: boolean;
  
  /**
   * Whether to preview changes before applying
   */
  preview?: boolean;
  
  /**
   * Maximum depth for reaction processing
   */
  maxReactionDepth?: number;
}
