/**
 * Wearing action executor
 * 
 * Handles putting on wearable items
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, WearableBehavior } from '@sharpee/world-model';

/**
 * Executor for the wearing action
 */
export const wearingAction: ActionExecutor = {
  id: IFActions.WEARING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.WEARING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Check if wearable
    if (!noun.has(TraitType.WEARABLE)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.WEARING,
          reason: ActionFailureReason.NOT_WEARABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if already worn
    if (WearableBehavior.isWorn(noun)) {
      // Check who's wearing it
      const wearer = WearableBehavior.getWearer(noun);
      if (wearer === actor.id) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.WEARING,
            reason: ActionFailureReason.ALREADY_WEARING
          },
          { actor: actor.id, target: noun.id }
        )];
      } else {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.WEARING,
            reason: ActionFailureReason.WORN_BY_OTHER,
            wearer: wearer
          },
          { actor: actor.id, target: noun.id }
        )];
      }
    }
    
    // Check if actor is holding the item
    const itemLocation = context.world.getLocation(noun.id);
    if (itemLocation !== actor.id) {
      // Try to take it first if it's reachable
      if (context.canReach(noun)) {
        // Move item to actor
        try {
          context.world.moveEntity(noun.id, actor.id);
        } catch (error) {
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.WEARING,
              reason: ActionFailureReason.NOT_IN_CONTAINER,
              expectedContainer: actor.id
            },
            { actor: actor.id, target: noun.id }
          )];
        }
      } else {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.WEARING,
            reason: ActionFailureReason.NOT_REACHABLE
          },
          { actor: actor.id, target: noun.id }
        )];
      }
    }
    
    // TODO: Check for slot conflicts using WearableService
    // This requires checking all worn items on the actor to see if any
    // occupy the same slot or are blocked by this item's blockedSlots
    // const conflictingItem = WearableService.getConflictingWornItem(context.world, actor, noun);
    // if (conflictingItem) {
    //   return [createEvent(
    //     IFEvents.ACTION_FAILED,
    //     {
    //       action: IFActions.WEARING,
    //       reason: ActionFailureReason.ALREADY_WEARING,
    //       conflictingItem: conflictingItem.id,
    //       slot: WearableBehavior.getSlot(noun)
    //     },
    //     { actor: actor.id, target: noun.id }
    //   )];
    // }
    
    // Actually wear it
    const wearEvents = WearableBehavior.wear(noun, actor);
    
    // If wearing failed, return those events
    if (wearEvents.length > 0 && wearEvents[0].type === IFEvents.ACTION_FAILED) {
      return wearEvents;
    }
    
    // Add additional context to the success event if needed
    if (wearEvents.length > 0 && wearEvents[0].type === IFEvents.ITEM_WORN) {
      const event = wearEvents[0];
      if (!event.payload) {
        event.payload = {};
      }
      event.payload.slot = WearableBehavior.getSlot(noun);
    }
    
    return wearEvents;
  }
};