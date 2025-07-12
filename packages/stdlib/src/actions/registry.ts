/**
 * Action registry implementation
 */

import { ActionExecutor, ActionRegistry } from './types';
import { Action, ActionResult } from '../commands/types';
import { SemanticEvent } from '@sharpee/core';

export { ActionRegistry } from './types';

export class StandardActionRegistry implements ActionRegistry {
  private actions = new Map<string, ActionExecutor>();
  private actionAdapters = new Map<string, Action>(); // For Action interface support
  private aliases = new Map<string, string>(); // alias -> actionId
  
  /**
   * Register an action executor or action
   */
  register(action: ActionExecutor | Action): void {
    // Check if it's an Action (has patterns property)
    if ('patterns' in action) {
      // Store the Action for later use
      this.actionAdapters.set(action.id, action);
      
      // Create an ActionExecutor adapter
      const executor: ActionExecutor = {
        id: action.id,
        aliases: action.patterns,
        execute: (command, context) => {
          // Call the Action's execute method which expects only context
          const resultOrPromise = action.execute(context);
          
          // Handle both sync and async results
          if (resultOrPromise instanceof Promise) {
            throw new Error('Async actions not supported in ActionExecutor adapter');
          }
          
          const result = resultOrPromise as ActionResult;
          
          // Convert ActionResult to SemanticEvent[]
          const events: SemanticEvent[] = [];
          
          // Convert events from ActionResult
          if (result.events) {
            result.events.forEach((event, index) => {
              events.push({
                id: `${action.id}_${Date.now()}_${index}`,
                type: event.type,
                data: event.data,
                timestamp: Date.now(),
                entities: {}
              });
            });
          }
          
          // Add success/failure event
          if (result.success && result.message) {
            events.push({
              id: `${action.id}_${Date.now()}_msg`,
              type: 'action.message',
              data: { message: result.message },
              timestamp: Date.now(),
              entities: {}
            });
          } else if (!result.success && result.error) {
            events.push({
              id: `${action.id}_${Date.now()}_err`,
              type: 'action.error',
              data: { error: result.error },
              timestamp: Date.now(),
              entities: {}
            });
          }
          
          return events;
        },
        canExecute: (command, context) => true
      };
      
      this.actions.set(action.id, executor);
      
      // Register patterns as aliases
      for (const pattern of action.patterns) {
        this.aliases.set(pattern.toLowerCase(), action.id);
      }
    } else {
      // It's already an ActionExecutor
      this.actions.set(action.id, action);
      
      // Register aliases
      if (action.aliases) {
        for (const alias of action.aliases) {
          this.aliases.set(alias.toLowerCase(), action.id);
        }
      }
    }
  }
  
  /**
   * Get an action executor by ID
   */
  get(actionId: string): ActionExecutor | Action | undefined {
    // Check if we have an Action adapter first
    const action = this.actionAdapters.get(actionId);
    if (action) {
      return action;
    }
    
    return this.actions.get(actionId);
  }
  
  /**
   * Get all registered actions
   */
  getAll(): ActionExecutor[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean {
    return this.actions.has(actionId);
  }
  
  /**
   * Find an action by ID or alias
   */
  find(actionIdOrAlias: string): ActionExecutor | undefined {
    // Try direct ID lookup first
    const direct = this.actions.get(actionIdOrAlias);
    if (direct) {
      return direct;
    }
    
    // Try alias lookup
    const actionId = this.aliases.get(actionIdOrAlias.toLowerCase());
    if (actionId) {
      return this.actions.get(actionId);
    }
    
    return undefined;
  }
}
