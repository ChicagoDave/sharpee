/**
 * Core types for the event-driven action system
 * 
 * Contains result processing types used by the event system.
 * Action interfaces have been moved to enhanced-types.ts.
 */

import { ISemanticEvent } from '@sharpee/core';

/**
 * Result of processing events
 */
export interface ProcessedEvents {
  /**
   * Events that were successfully applied
   */
  applied: ISemanticEvent[];
  
  /**
   * Events that failed validation
   */
  failed: ISemanticEvent[];
  
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
