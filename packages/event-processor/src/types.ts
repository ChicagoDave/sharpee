/**
 * Event processor types
 */

import { SemanticEvent } from '@sharpee/core';
import { WorldModel, WorldChange } from '@sharpee/world-model';

/**
 * Event handler function type
 */
export type EventHandler = (event: SemanticEvent, world: WorldModel) => void;

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