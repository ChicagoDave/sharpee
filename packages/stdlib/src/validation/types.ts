/**
 * Enhanced validation types for stdlib
 * 
 * Extends the core validation types with scope information
 */

import type { ValidatedCommand as CoreValidatedCommand } from '@sharpee/world-model';
import type { ScopeLevel, SenseType } from '../scope/types';

/**
 * Scope information for validated objects
 */
export interface ScopeInfo {
  /** The scope level of the entity */
  level: ScopeLevel;
  
  /** Which senses can perceive the entity */
  perceivedBy: SenseType[];
}

/**
 * Extended validated command with scope information
 */
export interface ValidatedCommand extends CoreValidatedCommand {
  /** Scope information for resolved entities */
  scopeInfo?: {
    /** Scope info for direct object */
    directObject?: ScopeInfo;
    
    /** Scope info for indirect object */
    indirectObject?: ScopeInfo;
  };
}

/**
 * Extended validation error codes
 */
export type ValidationErrorCode = 
  | 'ENTITY_NOT_FOUND' 
  | 'ENTITY_NOT_VISIBLE' 
  | 'ENTITY_NOT_REACHABLE'
  | 'ENTITY_NOT_AUDIBLE'
  | 'ENTITY_NOT_DETECTABLE'
  | 'NOT_CARRIED'
  | 'ACTION_NOT_AVAILABLE' 
  | 'PRECONDITION_FAILED'
  | 'NO_PLAYER';