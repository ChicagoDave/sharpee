// packages/stdlib/src/actions/types/index.ts

import { ResolvedIFCommand } from '../../parser/if-parser-types';
import { ActionContext } from './action-context';
import { SemanticEvent } from '../../core-imports';

// Re-export ActionContext for easier imports
export { ActionContext } from './action-context';
export * from './command-types';

/**
 * Base action definition for the action system
 * This is an IF concept that belongs in StdLib, not Core
 */
export interface ActionDefinition {
  /**
   * Unique identifier for the action
   */
  id: string;
  
  /**
   * Human-readable name for the action
   */
  name: string;
  
  /**
   * List of verbs that trigger this action
   * These are populated by the language provider
   */
  verbs?: string[];
  
  /**
   * Action metadata
   */
  metadata?: {
    /**
     * Whether this action is reversible
     */
    reversible?: boolean;
    
    /**
     * Category of the action
     */
    category?: string;
    
    /**
     * Additional metadata
     */
    [key: string]: any;
  };
  
  /**
   * Action execution phases
   */
  phases: {
    /**
     * Validate if the action can be performed
     * Return true to continue, or a string message to block
     */
    validate?: (command: ResolvedIFCommand, context: ActionContext) => boolean | string;
    
    /**
     * Execute the action
     * Returns events describing what happened
     */
    execute: (command: ResolvedIFCommand, context: ActionContext) => SemanticEvent[];
  };
}
