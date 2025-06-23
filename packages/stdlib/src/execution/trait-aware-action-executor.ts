/**
 * Trait-Aware Action Executor
 * 
 * New action executor that creates and uses ActionContext for trait-based actions.
 * This executor bridges between the old GameContext system and the new trait-based
 * action system during the migration period.
 */

import { ResolvedIFCommand } from '../parser/if-parser-types';
import { SemanticEvent, createEvent } from '../core-imports';
import { ActionDefinition } from '../actions/types';
import { ActionContext } from '../actions/types/action-context';
import { GameContext } from '../world-model/types';
import { IFEvents } from '../constants/if-events';
import { WorldModelService } from '../world-model/services/world-model-service';
import { IFEntity } from '../world-model/traits/if-entity';
import { createActionContext } from '../actions/action-context';
import { ActionExecutor, ActionExecutorOptions } from './action-executor';

/**
 * Extended options for trait-aware executor
 */
export interface TraitAwareActionExecutorOptions extends ActionExecutorOptions {
  /**
   * Force all actions to use ActionContext (for testing)
   */
  forceTraitContext?: boolean;
}

/**
 * Trait-aware action executor that supports both old and new action formats
 */
export class TraitAwareActionExecutor extends ActionExecutor {
  private traitBasedActions = new Set<string>();
  private traitAwareOptions: Required<TraitAwareActionExecutorOptions>;
  
  constructor(options: TraitAwareActionExecutorOptions = {}) {
    super(options);
    this.traitAwareOptions = {
      validateBeforeExecute: options.validateBeforeExecute ?? true,
      maxBatchSize: options.maxBatchSize ?? 50,
      forceTraitContext: options.forceTraitContext ?? false
    };
  }
  
  /**
   * Register an action as trait-based
   */
  registerTraitBasedAction(action: ActionDefinition): void {
    this.traitBasedActions.add(action.id);
    this.registerAction(action);
  }
  
  /**
   * Execute a resolved command with appropriate context
   */
  async execute(
    command: ResolvedIFCommand,
    context: GameContext
  ): Promise<SemanticEvent[]> {
    const action = this.getAction(command.action);
    
    if (!action) {
      return [this.createErrorEvent(
        `Unknown action: ${command.action}`,
        command
      )];
    }
    
    // Check if this action uses the new ActionContext
    const useTraitContext = this.traitAwareOptions.forceTraitContext || 
                           this.traitBasedActions.has(action.id);
    
    if (useTraitContext) {
      // Create ActionContext from GameContext
      const actionContext = this.createActionContext(context);
      
      // Convert ResolvedIFCommand entities if needed
      const traitCommand = this.convertCommand(command, context);
      
      // Execute with ActionContext
      return this.executeWithActionContext(traitCommand, action, actionContext);
    } else {
      // Use old execution path
      return super.execute(command, context);
    }
  }
  
  /**
   * Create ActionContext from GameContext
   */
  private createActionContext(gameContext: GameContext): ActionContext {
    // Check if we have a WorldModelService
    let worldService: WorldModelService;
    
    if (gameContext.world instanceof WorldModelService) {
      worldService = gameContext.world;
    } else if ('getEntity' in gameContext.world && 'moveEntity' in gameContext.world) {
      // Create a wrapper if needed
      throw new Error('Legacy world model not supported. Use WorldModelService.');
    } else {
      throw new Error('Invalid world model in context');
    }
    
    // Get player as IFEntity
    let player: IFEntity;
    if ('traits' in gameContext.player) {
      player = gameContext.player as unknown as IFEntity;
    } else {
      // Try to get from world service
      const playerEntity = worldService.getEntity(gameContext.player.id);
      if (!playerEntity) {
        throw new Error('Player entity not found');
      }
      player = playerEntity;
    }
    
    return createActionContext({
      world: worldService,
      player,
      language: gameContext.languageProvider as any // TODO: Fix type during migration
    });
  }
  
  /**
   * Convert ResolvedIFCommand to use IFEntity references
   */
  private convertCommand(
    command: ResolvedIFCommand,
    context: GameContext
  ): ResolvedIFCommand {
    const converted = { ...command };
    
    // Convert noun if present
    if (command.noun && !('traits' in command.noun)) {
      const entity = this.getWorldService(context).getEntity(command.noun.id);
      if (entity) {
        converted.noun = entity as any;
      }
    }
    
    // Convert second if present
    if (command.second && !('traits' in command.second)) {
      const entity = this.getWorldService(context).getEntity(command.second.id);
      if (entity) {
        converted.second = entity as any;
      }
    }
    
    // Convert allTargets if present
    if (command.allTargets) {
      converted.allTargets = command.allTargets.map(target => {
        if (!('traits' in target)) {
          const entity = this.getWorldService(context).getEntity(target.id);
          return entity || target;
        }
        return target;
      }) as any;
    }
    
    return converted;
  }
  
  /**
   * Get WorldModelService from context
   */
  private getWorldService(context: GameContext): WorldModelService {
    if (context.world instanceof WorldModelService) {
      return context.world;
    }
    throw new Error('WorldModelService required for trait-based actions');
  }
  
  /**
   * Execute action with ActionContext
   */
  private async executeWithActionContext(
    command: ResolvedIFCommand,
    action: ActionDefinition,
    context: ActionContext
  ): Promise<SemanticEvent[]> {
    // Handle "ALL" commands
    if (command.allTargets && command.allTargets.length > 0) {
      return this.executeAllWithActionContext(command, action, context);
    }
    
    // Validate if requested
    if (this.traitAwareOptions.validateBeforeExecute && action.phases.validate) {
      const validation = action.phases.validate(command, context);
      
      if (validation !== true) {
        const message = typeof validation === 'string' 
          ? validation 
          : 'Action cannot be performed';
          
        return [this.createErrorEvent(message, command)];
      }
    }
    
    // Execute the action
    try {
      const events = action.phases.execute(command, context);
      
      // Add command metadata to events
      return events.map(event => ({
        ...event,
        metadata: {
          ...event.metadata,
          command: {
            action: command.action,
            originalInput: command.originalInput
          }
        }
      }));
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Action execution failed';
      return [this.createErrorEvent(message, command)];
    }
  }
  
  /**
   * Execute ALL command with ActionContext
   */
  private async executeAllWithActionContext(
    command: ResolvedIFCommand,
    action: ActionDefinition,
    context: ActionContext
  ): Promise<SemanticEvent[]> {
    const events: SemanticEvent[] = [];
    const targets = command.allTargets!.slice(0, this.traitAwareOptions.maxBatchSize);
    
    // Track successes and failures
    const succeeded: string[] = [];
    const failed: Array<{ target: string; reason: string }> = [];
    
    // Execute for each target
    for (const target of targets) {
      const singleCommand: ResolvedIFCommand = {
        ...command,
        noun: target,
        allTargets: undefined
      };
      
      // Validate if needed
      if (this.traitAwareOptions.validateBeforeExecute && action.phases.validate) {
        const validation = action.phases.validate(singleCommand, context);
        
        if (validation !== true) {
          const targetName = context.getName(target as unknown as IFEntity);
          failed.push({
            target: targetName,
            reason: typeof validation === 'string' ? validation : 'Cannot perform action'
          });
          continue;
        }
      }
      
      // Execute
      try {
        const targetEvents = action.phases.execute(singleCommand, context);
        events.push(...targetEvents);
        const targetName = context.getName(target as unknown as IFEntity);
        succeeded.push(targetName);
      } catch (error) {
        const targetName = context.getName(target as unknown as IFEntity);
        failed.push({
          target: targetName,
          reason: error instanceof Error ? error.message : 'Failed'
        });
      }
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
}

/**
 * Create a trait-aware action executor
 */
export function createTraitAwareActionExecutor(
  options?: TraitAwareActionExecutorOptions
): TraitAwareActionExecutor {
  return new TraitAwareActionExecutor(options);
}
