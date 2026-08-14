/**
 * Action registry implementation
 */

import { ActionExecutor, ActionRegistry } from './types';

export class StandardActionRegistry implements ActionRegistry {
  private actions = new Map<string, ActionExecutor>();
  private aliases = new Map<string, string>(); // alias -> actionId
  
  /**
   * Register an action executor
   */
  register(action: ActionExecutor): void {
    this.actions.set(action.id, action);
    
    // Register aliases
    if (action.aliases) {
      for (const alias of action.aliases) {
        this.aliases.set(alias.toLowerCase(), action.id);
      }
    }
  }
  
  /**
   * Get an action executor by ID
   */
  get(actionId: string): ActionExecutor | undefined {
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
