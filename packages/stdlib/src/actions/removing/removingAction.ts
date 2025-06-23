/**
 * Removing action executor
 * 
 * Handles taking off worn items
 */

import { ActionExecutor, ParsedCommand } from '../../actions/types/command-types';
import { ActionContext } from '../../actions/types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, WearableBehavior } from '@sharpee/world-model';

/**
 * Executor for the removing (taking off) action
 */
export const removingAction: ActionExecutor = {
  id: IFActions.TAKING_OFF,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING_OFF,
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
          action: IFActions.TAKING_OFF,
          reason: ActionFailureReason.NOT_WEARABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Use static methods from WearableBehavior
    
    // Check if worn
    if (!WearableBehavior.isWorn(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING_OFF,
          reason: ActionFailureReason.NOT_WEARING
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if worn by the actor
    const wearer = WearableBehavior.getWearer(noun);
    if (wearer !== actor.id) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.TAKING_OFF,
          reason: ActionFailureReason.WORN_BY_OTHER,
          wearer: wearer
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Actually remove it
    const removeEvents = WearableBehavior.removeClothing(noun, actor);
    
    // If removal failed, return those events
    if (removeEvents.length > 0 && removeEvents[0].type === IFEvents.ACTION_FAILED) {
      return removeEvents;
    }
    
    // Add additional context to the success event if needed
    if (removeEvents.length > 0 && removeEvents[0].type === IFEvents.ITEM_REMOVED) {
      const event = removeEvents[0];
      if (!event.payload) {
        event.payload = {};
      }
      event.payload.slot = WearableBehavior.getSlot(noun);
    }
    
    return removeEvents;
  }
};