/**
 * Taking Action Executor - Service-Based Implementation
 * 
 * Handles the logic for picking up objects using the service layer
 */

import { BaseActionExecutor } from '../types/base-action-executor';
import { ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/enhanced-action-context';
import { SemanticEvent, createEvent } from '@sharpee/core';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { TraitType, SceneryBehavior } from '@sharpee/world-model';

/**
 * Service-based executor for the taking action
 */
export class TakingActionExecutor extends BaseActionExecutor {
  id = IFActions.TAKING;
  requiredTraits = [TraitType.IDENTITY];
  
  /**
   * Validate the taking action
   */
  protected validate(command: ParsedCommand, context: ActionContext): true | ActionFailureReason {
    const { noun } = command;
    
    // Must have a target
    if (!noun) {
      return ActionFailureReason.INVALID_TARGET;
    }
    
    // Can't take yourself
    if (noun.id === context.player.id) {
      return ActionFailureReason.INVALID_TARGET;
    }
    
    // Check visibility and reachability
    const reachable = this.checkReachability(noun, context);
    if (reachable !== true) return reachable;
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === context.player.id) {
      return ActionFailureReason.ALREADY_IN_CONTAINER;
    }
    
    // Can't take rooms
    if (noun.has(TraitType.ROOM)) {
      return ActionFailureReason.INVALID_TARGET;
    }
    
    // Can't take scenery
    if (noun.has(TraitType.SCENERY)) {
      return ActionFailureReason.FIXED_IN_PLACE;
    }
    
    // Check if player can contain the item
    if (context.player.has(TraitType.CONTAINER)) {
      const canContain = context.services.inventory.canContain(context.player, noun);
      if (canContain !== true) {
        return ActionFailureReason.CONTAINER_FULL;
      }
    }
    
    return true;
  }
  
  /**
   * Execute the taking action
   */
  protected doExecute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { noun } = command;
    const events: SemanticEvent[] = [];
    
    // Get current location for context
    const fromLocation = context.world.getLocation(noun!.id);
    const fromEntity = fromLocation ? context.world.getEntity(fromLocation) : null;
    
    // Use inventory service to transfer the item
    const transferred = context.services.inventory.transfer(
      noun!,
      fromEntity,
      context.player
    );
    
    if (!transferred) {
      return [context.fail(ActionFailureReason.CANT_DO_THAT)];
    }
    
    // Create success event with rich semantic data
    const eventData: Record<string, unknown> = {};
    
    // Add information about where it was taken from
    if (fromLocation && fromEntity) {
      eventData.from = fromLocation;
      
      if (fromEntity.has(TraitType.CONTAINER)) {
        eventData.fromContainer = true;
      } else if (fromEntity.has(TraitType.SUPPORTER)) {
        eventData.fromSupporter = true;
      }
    }
    
    events.push(createEvent(
      IFEvents.TAKEN,
      eventData,
      { actor: context.player.id, target: noun!.id }
    ));
    
    return events;
  }
}

/**
 * Export as singleton instance for backward compatibility
 */
export const takingAction = new TakingActionExecutor();
