/**
 * Looking action executor
 * 
 * Describes the current room and its contents
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType } from '@sharpee/world-model';

/**
 * Executor for the looking action
 */
export const lookingAction: ActionExecutor = {
  id: IFActions.LOOKING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor } = command;
    
    // Get actor's current location
    const currentLocation = context.world.getLocation(actor.id);
    if (!currentLocation) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.LOOKING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: 'Actor has no location'
        },
        { actor: actor.id }
      )];
    }
    
    const currentRoom = context.world.getEntity(currentLocation);
    if (!currentRoom || !currentRoom.has(TraitType.ROOM)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.LOOKING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: 'Not in a valid room'
        },
        { actor: actor.id }
      )];
    }
    
    // Create room description event
    // Looking always gives a full description, not brief
    return [createEvent(
      IFEvents.ROOM_DESCRIBED,
      {
        brief: false, // Always full description when explicitly looking
        showExits: true,
        showContents: true,
        triggeredBy: IFActions.LOOKING
      },
      { actor: actor.id, location: currentRoom.id }
    )];
  }
};