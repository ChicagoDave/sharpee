/**
 * Action Executor - Executes resolved commands using registered actions
 * 
 * This component:
 * - Manages action registration
 * - Routes commands to appropriate actions
 * - Handles validation and execution phases
 * - Manages "ALL" command expansion
 */

import { ResolvedIFCommand } from '../parser/if-parser-types';
import { GameContext } from '../world-model/types';
import { SemanticEvent, createEvent } from '../core-imports';
import { ActionDefinition } from '../actions/types';
import { IFEvents } from '../constants/if-events';

export interface ActionExecutorOptions {
  /**
   * Whether to validate commands before execution
   */
  validateBeforeExecute?: boolean;
  
  /**
   * Maximum number of actions for "ALL" commands
   */
  maxBatchSize?: number;
}

export class ActionExecutor {
  private actions = new Map<string, ActionDefinition>();
  private verbToAction = new Map<string, string>();
  private options: Required<ActionExecutorOptions>;
  
  constructor(options: ActionExecutorOptions = {}) {
    this.options = {
      validateBeforeExecute: options.validateBeforeExecute ?? true,
      maxBatchSize: options.maxBatchSize ?? 50
    };
  }
  
  /**
   * Register an action definition
   */
  registerAction(action: ActionDefinition): void {
    this.actions.set(action.id, action);
    
    // Register verbs if provided
    if (action.verbs) {
      for (const verb of action.verbs) {
        this.verbToAction.set(verb.toLowerCase(), action.id);
      }
    }
  }
  
  /**
   * Register multiple actions
   */
  registerActions(actions: ActionDefinition[]): void {
    for (const action of actions) {
      this.registerAction(action);
    }
  }
  
  /**
   * Get a registered action by ID
   */
  getAction(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId);
  }
  
  /**
   * Get action by verb
   */
  getActionByVerb(verb: string): ActionDefinition | undefined {
    const actionId = this.verbToAction.get(verb.toLowerCase());
    return actionId ? this.actions.get(actionId) : undefined;
  }
  
  /**
   * Execute a resolved command
   */
  async execute(
    command: ResolvedIFCommand,
    context: GameContext
  ): Promise<SemanticEvent[]> {
    const action = this.actions.get(command.action);
    
    if (!action) {
      return [this.createErrorEvent(
        `Unknown action: ${command.action}`,
        command
      )];
    }
    
    // Handle "ALL" commands by expanding into individual commands
    if (command.allTargets && command.allTargets.length > 0) {
      return this.executeAllCommand(command, action, context);
    }
    
    // During migration, we can't execute actions directly from base executor
    // Actions expect ActionContext, not GameContext
    // Use TraitAwareActionExecutor instead
    return [this.createErrorEvent(
      'Base ActionExecutor cannot execute trait-based actions. Use TraitAwareActionExecutor.',
      command
    )];
  }
  
  /**
   * Execute a command on multiple targets
   */
  private async executeAllCommand(
    command: ResolvedIFCommand,
    action: ActionDefinition,
    context: GameContext
  ): Promise<SemanticEvent[]> {
    const events: SemanticEvent[] = [];
    const targets = command.allTargets!.slice(0, this.options.maxBatchSize);
    
    // Track successes and failures
    const succeeded: string[] = [];
    const failed: Array<{ target: string; reason: string }> = [];
    
    // Execute for each target
    for (const target of targets) {
      const singleCommand: ResolvedIFCommand = {
        ...command,
        noun: target,
        allTargets: undefined // Clear to prevent recursion
      };
      
      // During migration, we can't execute actions directly
      failed.push({
        target: target.id,
        reason: 'Base ActionExecutor cannot execute trait-based actions'
      });
    }
    
    // Add summary event
    if (succeeded.length > 0 || failed.length > 0) {
      events.push(createEvent(
        IFEvents.BATCH_ACTION_COMPLETE,
        {
          action: command.action,
          succeeded,
          failed,
          totalTargets: targets.length
        },
        {
          narrate: true,
          location: context.currentLocation.id
        }
      ));
    }
    
    return events;
  }
  
  /**
   * Create an error event
   */
  private createErrorEvent(message: string, command: ResolvedIFCommand): SemanticEvent {
    return createEvent(
      IFEvents.ACTION_FAILED,
      {
        action: command.action,
        message,
        originalInput: command.originalInput
      },
      {
        narrate: true
      }
    );
  }
  
  /**
   * Get all registered actions
   */
  getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * Clear all registered actions
   */
  clearActions(): void {
    this.actions.clear();
    this.verbToAction.clear();
  }
}

/**
 * Create an action executor with options
 */
export function createActionExecutor(options?: ActionExecutorOptions): ActionExecutor {
  return new ActionExecutor(options);
}
