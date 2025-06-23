/**
 * Base Action Executor
 * 
 * Abstract base class for action executors that provides
 * standard validation, execution, and post-processing flow
 */

import { ActionExecutor, ParsedCommand } from './command-types';
import { ActionContext } from './enhanced-action-context';
import { SemanticEvent } from '@sharpee/core';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { TraitType } from '@sharpee/world-model';

/**
 * Base class for action executors
 * 
 * Provides a standard execution flow:
 * 1. Validation
 * 2. Execution
 * 3. Post-processing
 */
export abstract class BaseActionExecutor implements ActionExecutor {
  abstract id: string;
  abstract requiredTraits?: TraitType[];
  
  /**
   * Main execution method
   */
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    
    // Validation phase
    const validation = this.validate(command, context);
    if (validation !== true) {
      return [context.fail(validation)];
    }
    
    // Execution phase
    try {
      const executionEvents = this.doExecute(command, context);
      events.push(...executionEvents);
    } catch (error) {
      return [context.fail(
        ActionFailureReason.CANT_DO_THAT,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      )];
    }
    
    // Post-processing phase
    const processedEvents = this.postProcess(events, command, context);
    
    return processedEvents;
  }
  
  /**
   * Validate the command can be executed
   * Returns true if valid, or a failure reason
   */
  protected abstract validate(
    command: ParsedCommand, 
    context: ActionContext
  ): true | ActionFailureReason;
  
  /**
   * Execute the action
   * This is where the main logic goes
   */
  protected abstract doExecute(
    command: ParsedCommand,
    context: ActionContext
  ): SemanticEvent[];
  
  /**
   * Post-process events before returning
   * Default implementation returns events as-is
   */
  protected postProcess(
    events: SemanticEvent[],
    command: ParsedCommand,
    context: ActionContext
  ): SemanticEvent[] {
    return events;
  }
  
  /**
   * Helper to check if entity has required traits
   */
  protected hasRequiredTraits(entity: any, traits: TraitType[]): boolean {
    if (!entity || !entity.has) return false;
    return traits.every(trait => entity.has(trait));
  }
  
  /**
   * Helper to check basic visibility
   */
  protected checkVisibility(
    target: any,
    context: ActionContext
  ): true | ActionFailureReason {
    if (!target) {
      return ActionFailureReason.INVALID_TARGET;
    }
    
    if (!context.services.visibility.canSee(context.player, target)) {
      return ActionFailureReason.NOT_VISIBLE;
    }
    
    return true;
  }
  
  /**
   * Helper to check reachability
   */
  protected checkReachability(
    target: any,
    context: ActionContext
  ): true | ActionFailureReason {
    const visible = this.checkVisibility(target, context);
    if (visible !== true) return visible;
    
    if (!context.services.visibility.canReach(context.player, target)) {
      return ActionFailureReason.NOT_REACHABLE;
    }
    
    return true;
  }
}
