/**
 * Dropping action executor
 * 
 * Handles the logic for putting down held objects
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, WearableBehavior, SupporterBehavior } from '@sharpee/world-model';

/**
 * Executor for the dropping action
 */
export const droppingAction: ActionExecutor = {
  id: IFActions.DROPPING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.DROPPING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Check if held by actor
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation !== actor.id) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.DROPPING,
          reason: ActionFailureReason.NOT_REACHABLE // You can't drop what you're not holding
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if worn (must remove first)
    if (noun.has(TraitType.WEARABLE)) {
      if (WearableBehavior.isWorn(noun)) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.DROPPING,
            reason: ActionFailureReason.ALREADY_WEARING
          },
          { actor: actor.id, target: noun.id }
        )];
      }
    }
    
    // Get actor's current location (where to drop the item)
    const actorLocation = context.world.getLocation(actor.id);
    if (!actorLocation) {
      // Actor is in void? This shouldn't happen
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.DROPPING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: 'Actor has no location'
        },
        { actor: actor.id }
      )];
    }
    
    // Determine where to drop the item
    let dropLocation = actorLocation;
    let onSupporter = false;
    
    // Look for a suitable supporter in the room (optional behavior)
    const roomContents = context.world.getContents(actorLocation);
    for (const entity of roomContents) {
      if (entity.has(TraitType.SUPPORTER)) {
        if (SupporterBehavior.canAccept(entity, noun)) {
          dropLocation = entity.id;
          onSupporter = true;
          break;
        }
      }
    }
    
    // Move the item
    try {
      context.world.moveEntity(noun.id, dropLocation);
      
      // Create success event with semantic data
      const eventData: Record<string, unknown> = {
        onSupporter
      };
      
      return [createEvent(
        IFEvents.DROPPED,
        eventData,
        { actor: actor.id, target: noun.id, location: dropLocation }
      )];
      
    } catch (error) {
      // If the move fails, report the error
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.DROPPING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: error instanceof Error ? error.message : 'Failed to drop item'
        },
        { actor: actor.id, target: noun.id }
      )];
    }
  }
};