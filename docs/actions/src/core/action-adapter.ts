/**
 * Action Adapter
 * 
 * Adapts existing actions to work with ValidatedCommand
 */

import type { ValidatedCommand, SemanticEvent, Action } from '@sharpee/core';
import type { ActionExecutor, ActionContext } from './types';


/**
 * Adapts an ActionExecutor to work as an Action
 */
export class ActionAdapter implements Action {
  private executor: ActionExecutor;

  constructor(executor: ActionExecutor) {
    this.executor = executor;
  }

  get id(): string {
    return this.executor.id;
  }

  /**
   * Execute using ValidatedCommand
   */
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    return this.executor.execute(command, context);
  }

  /**
   * Get action metadata
   */
  get metadata(): any {
    return (this.executor as any).metadata;
  }

  /**
   * Get command verbs this handler can process
   */
  get verbs(): string[] {
    return [this.id, ...(this.executor.aliases || [])];
  }

  /**
   * Check if this handler can handle the given command
   */
  canHandle(command: any, context: any): boolean {
    return command.action === this.id || (this.executor.aliases?.includes(command.action) ?? false);
  }

  /**
   * Validate the command (optional)
   */
  validate?(command: any, context: any): { valid: boolean; error?: string } {
    if (this.executor.canExecute) {
      const valid = this.executor.canExecute(command, context);
      return { valid };
    }
    return { valid: true };
  }


}

/**
 * Create an Action from an ActionExecutor
 */
export function adaptAction(executor: ActionExecutor): Action {
  return new ActionAdapter(executor);
}

/**
 * Updated action interface that works with ValidatedCommand
 */
export interface ValidatedActionExecutor {
  /**
   * Unique identifier for this action
   */
  id: string;
  
  /**
   * Execute the action and return events
   * 
   * @param command The validated command with resolved entities
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
 * Base class for new-style actions that use ValidatedCommand
 */
export abstract class ValidatedAction implements ValidatedActionExecutor, Action {
  abstract id: string;
  aliases?: string[];

  /**
   * Execute the validated command
   */
  abstract execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[];

  /**
   * Optional validation
   */
  canExecute?(command: ValidatedCommand, context: ActionContext): boolean;
}
