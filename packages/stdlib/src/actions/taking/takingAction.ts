/**
 * Taking action executor
 * 
 * Handles the logic for picking up objects
 */

import { ActionExecutor, ParsedCommand } from '../../actions/types/command-types';
import { ActionContext } from '../../actions/types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, ContainerBehavior, SceneryBehavior, WearableBehavior } from '@sharpee/world-model';

/**
 * Executor for the taking action
 */
export const takingAction: ActionExecutor = {
  id: IFActions.TAKING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.ALREADY_IN_CONTAINER,
          container: actor.id
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if it's a room
    if (noun.has(TraitType.ROOM)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if it's scenery (untakeable)
    if (noun.has(TraitType.SCENERY)) {
      const reason = SceneryBehavior.getUntakeableReason(noun);
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: reason || ActionFailureReason.FIXED_IN_PLACE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.NOT_REACHABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check container capacity if actor has container trait
    if (actor.has(TraitType.CONTAINER)) {
      if (!ContainerBehavior.canAccept(actor, noun)) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.TAKING,
            reason: ActionFailureReason.CONTAINER_FULL,
            container: actor.id
          },
          { actor: actor.id, target: noun.id }
        )];
      }
    }
    
    // If worn, remove it first
    if (noun.has(TraitType.WEARABLE)) {
      if (WearableBehavior.isWorn(noun)) {
        const removeEvents = WearableBehavior.remove(noun, actor);
        // Continue with taking even if removal generates events
        if (removeEvents.length > 0) {
          // We'll add these events but not narrate them since taking covers it
          removeEvents.forEach(event => {
            if (event.metadata) {
              event.metadata.narrate = false;
            }
          });
          // Don't return here, continue with taking
        }
      }
    }
    
    // Actually move the item
    try {
      const fromLocation = context.world.getLocation(noun.id);
      context.world.moveEntity(noun.id, actor.id);
      
      // Create success event with semantic data
      const eventData: Record<string, unknown> = {};
      
      // Add information about where it was taken from
      if (fromLocation) {
        eventData.from = fromLocation;
        const fromEntity = context.world.getEntity(fromLocation);
        
        if (fromEntity) {
          if (fromEntity.has(TraitType.CONTAINER)) {
            eventData.fromContainer = true;
          } else if (fromEntity.has(TraitType.SUPPORTER)) {
            eventData.fromSupporter = true;
          }
        }
      }
      
      return [createEvent(
        IFEvents.TAKEN,
        eventData,
        { actor: actor.id, target: noun.id }
      )];
      
    } catch (error) {
      // If the move fails, report the error
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: error instanceof Error ? error.message : 'Failed to take item'
        },
        { actor: actor.id, target: noun.id }
      )];
    }
  }
};