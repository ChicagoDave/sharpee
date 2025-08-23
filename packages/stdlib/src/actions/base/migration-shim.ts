/**
 * Migration shim for transitioning actions to the three-phase pattern
 * 
 * This provides utilities to help migrate existing actions from the
 * two-phase pattern (validate + execute) to the three-phase pattern
 * (validate + execute + report).
 */

import { ISemanticEvent } from '@sharpee/core';
import { Action, ActionContext, ValidationResult } from '../enhanced-types';

/**
 * Base class for migrating actions to three-phase pattern
 * 
 * Subclasses can override executeWithMutation() and generateReport()
 * to implement the new pattern while maintaining compatibility.
 */
export abstract class ThreePhaseAction implements Action {
  abstract id: string;
  requiredMessages?: string[];
  descriptionMessageId?: string;
  examplesMessageId?: string;
  group?: string;
  priority?: number;
  
  /**
   * Validate phase - check if action can proceed
   */
  abstract validate(context: ActionContext): ValidationResult;
  
  /**
   * Execute phase - handles both old and new patterns
   * 
   * This method checks if the subclass has implemented the new pattern.
   * If so, it calls executeWithMutation() and returns void.
   * Otherwise, it falls back to the old pattern.
   */
  execute(context: ActionContext): ISemanticEvent[] | void {
    // Check if subclass implements the new pattern
    if (this.executeWithMutation && this.generateReport) {
      // New pattern: perform mutations and return void
      this.executeWithMutation(context);
      return;
    }
    
    // Old pattern: must be overridden in subclass
    throw new Error(
      `Action ${this.id} must implement either executeWithMutation/generateReport ` +
      `or override execute() to return events`
    );
  }
  
  /**
   * Report phase - generate events after mutations
   * 
   * This is automatically used when executeWithMutation is implemented.
   */
  report(context: ActionContext): ISemanticEvent[] {
    if (this.generateReport) {
      return this.generateReport(context);
    }
    
    // Should never reach here if execute() is properly implemented
    throw new Error(`Action ${this.id} must implement generateReport()`);
  }
  
  /**
   * New pattern: perform mutations only (optional override)
   * 
   * Subclasses implementing the three-phase pattern should override this.
   */
  protected executeWithMutation?(context: ActionContext): void;
  
  /**
   * New pattern: generate events with captured state (optional override)
   * 
   * Subclasses implementing the three-phase pattern should override this.
   */
  protected generateReport?(context: ActionContext): ISemanticEvent[];
}

/**
 * Helper to create a three-phase action from functions
 * 
 * This is useful for quickly converting existing actions without
 * creating a full class.
 */
export function createThreePhaseAction(config: {
  id: string;
  validate: (context: ActionContext) => ValidationResult;
  execute: (context: ActionContext) => void;
  report: (context: ActionContext) => ISemanticEvent[];
  requiredMessages?: string[];
  descriptionMessageId?: string;
  examplesMessageId?: string;
  group?: string;
  priority?: number;
}): Action {
  return {
    id: config.id,
    requiredMessages: config.requiredMessages,
    descriptionMessageId: config.descriptionMessageId,
    examplesMessageId: config.examplesMessageId,
    group: config.group,
    priority: config.priority,
    
    validate: config.validate,
    
    execute: (context: ActionContext) => {
      config.execute(context);
      return; // Return void for new pattern
    },
    
    report: config.report
  };
}

/**
 * Adapter to wrap old-style actions in the new interface
 * 
 * This allows old actions to work with the new CommandExecutor
 * without modification.
 */
export function adaptOldAction(oldAction: {
  id: string;
  validate: (context: ActionContext) => ValidationResult;
  execute: (context: ActionContext) => ISemanticEvent[];
  requiredMessages?: string[];
  descriptionMessageId?: string;
  examplesMessageId?: string;
  group?: string;
  priority?: number;
}): Action {
  return {
    ...oldAction,
    // Old pattern: execute returns events directly
    execute: (context: ActionContext) => oldAction.execute(context)
    // No report method needed for old pattern
  };
}

/**
 * Helper to split an old execute method into execute + report
 * 
 * This helps when migrating actions that mix mutations and event generation.
 * 
 * @param executeOld The old execute method that does both
 * @returns Object with separate execute and report methods
 */
export function splitExecuteMethod(
  executeOld: (context: ActionContext) => ISemanticEvent[]
): {
  execute: (context: ActionContext) => void;
  report: (context: ActionContext) => ISemanticEvent[];
} {
  // Store events generated during execute
  let capturedEvents: ISemanticEvent[] | null = null;
  
  return {
    execute: (context: ActionContext) => {
      // Run the old method but capture its events
      capturedEvents = executeOld(context);
      // Don't return anything (void)
    },
    
    report: (context: ActionContext) => {
      // Return the captured events
      if (!capturedEvents) {
        throw new Error('Report called before execute');
      }
      const events = capturedEvents;
      capturedEvents = null; // Reset for next execution
      return events;
    }
  };
}

/**
 * Create a migration wrapper that logs when old patterns are used
 * 
 * This helps identify which actions still need migration.
 */
export function createMigrationLogger(
  action: Action,
  logger: (message: string) => void = console.warn
): Action {
  const wrapped: Action = {
    ...action,
    
    execute: (context: ActionContext) => {
      const result = action.execute(context);
      
      // Check if this is the old pattern
      if (result !== undefined && result !== null) {
        logger(`Action ${action.id} is using old execute pattern (returns events)`);
      }
      
      return result;
    }
  };
  
  // Add report if the original has it
  if (action.report) {
    wrapped.report = action.report;
  }
  
  return wrapped;
}