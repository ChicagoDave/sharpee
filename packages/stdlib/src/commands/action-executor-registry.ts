/**
 * Action Registry Integration
 * 
 * Integrates command definitions and action executors
 */

import { ActionExecutor } from '../actions/types/command-types';

/**
 * Registry for action executors
 */
export class ActionExecutorRegistry {
  private executors = new Map<string, ActionExecutor>();

  /**
   * Register an action executor
   */
  register(executor: ActionExecutor): void {
    this.executors.set(executor.id, executor);
  }

  /**
   * Get executor by action ID
   */
  getExecutor(actionId: string): ActionExecutor | undefined {
    return this.executors.get(actionId);
  }

  /**
   * Get all registered executors
   */
  getAllExecutors(): ActionExecutor[] {
    return Array.from(this.executors.values());
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.executors.clear();
  }
}

/**
 * Global executor registry instance
 */
export const executorRegistry = new ActionExecutorRegistry();

// Import all action executors
import { takingAction } from '../actions/taking';
import { droppingAction } from '../actions/dropping';
import { examiningAction } from '../actions/examining';
import { lookingAction } from '../actions/looking';
import { goingAction } from '../actions/going';
import { inventoryAction } from '../actions/inventory';
import { openingAction } from '../actions/opening';
import { closingAction } from '../actions/closing';
import { unlockingAction } from '../actions/unlocking';
import { wearingAction } from '../actions/wearing';
import { removingAction } from '../actions/removing';

/**
 * Register all standard action executors
 */
export function registerStandardExecutors(): void {

  // Register each executor
  executorRegistry.register(takingAction);
  executorRegistry.register(droppingAction);
  executorRegistry.register(examiningAction);
  executorRegistry.register(lookingAction);
  executorRegistry.register(goingAction);
  executorRegistry.register(inventoryAction);
  executorRegistry.register(openingAction);
  executorRegistry.register(closingAction);
  executorRegistry.register(unlockingAction);
  executorRegistry.register(wearingAction);
  executorRegistry.register(removingAction);
}