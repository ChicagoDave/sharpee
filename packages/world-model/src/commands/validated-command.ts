/**
 * Command types for the validation phase
 * These types represent fully resolved and validated commands
 * with entities and action IDs identified
 */

import type { ParsedObjectReference, ParsedCommand } from './parsed-command';
import type { IFEntity } from '../entities/if-entity';

/**
 * Resolved entity reference after validation
 */
export interface ValidatedObjectReference {
  /** The resolved entity */
  entity: IFEntity;
  
  /** Original parsed reference */
  parsed: ParsedObjectReference;
}

/**
 * Result of validation phase - fully resolved and checked
 */
export interface ValidatedCommand {
  /** Original parsed command */
  parsed: ParsedCommand;
  
  /** ID of the action that will handle this command */
  actionId: string;
  
  /** Resolved direct object if present */
  directObject?: ValidatedObjectReference;
  
  /** Resolved indirect object if present */
  indirectObject?: ValidatedObjectReference;
  
  /** Validation metadata */
  metadata?: {
    /** Time taken to validate */
    validationTime?: number;
    
    /** Any warnings during validation */
    warnings?: string[];
  };
}

/**
 * Errors that can occur during validation
 */
export interface ValidationError {
  type: 'VALIDATION_ERROR';
  code: 'ENTITY_NOT_FOUND' | 'ENTITY_NOT_VISIBLE' | 'ACTION_NOT_AVAILABLE' | 'PRECONDITION_FAILED';
  message: string;
  parsed: ParsedCommand;
  details?: Record<string, any>;
}
