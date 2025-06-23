/**
 * Opening action executor
 * 
 * Handles the logic for opening containers, doors, and other openable objects
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, OpenableBehavior, LockableBehavior, DoorBehavior } from '@sharpee/world-model';

/**
 * Executor for the opening action
 */
export const openingAction: ActionExecutor = {
  id: IFActions.OPENING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.OPENING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Check if openable
    if (!noun.has(TraitType.OPENABLE)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.OPENING,
          reason: ActionFailureReason.NOT_OPENABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if already open
    if (OpenableBehavior.isOpen(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.OPENING,
          reason: ActionFailureReason.ALREADY_OPEN
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if locked
    if (noun.has(TraitType.LOCKABLE)) {
      if (LockableBehavior.isLocked(noun)) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.OPENING,
            reason: ActionFailureReason.LOCKED
          },
          { actor: actor.id, target: noun.id }
        )];
      }
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.OPENING,
          reason: ActionFailureReason.NOT_REACHABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Actually open it
    const openEvents = OpenableBehavior.open(noun, actor);
    
    // If opening failed, return those events
    if (openEvents.length > 0 && openEvents[0].type === IFEvents.ACTION_FAILED) {
      return openEvents;
    }
    
    // Add additional context to the event payload if it succeeded
    if (openEvents.length > 0 && openEvents[0].type === IFEvents.OPENED) {
      const event = openEvents[0];
      if (!event.payload) {
        event.payload = {};
      }
      
      // Add specific data based on what was opened
      if (noun.has(TraitType.DOOR)) {
        event.payload.isDoor = true;
        
        // Add door connection info
        const actorLocation = context.world.getLocation(actor.id);
        if (actorLocation) {
          const otherRoom = DoorBehavior.getOtherRoom(noun, actorLocation);
          if (otherRoom) {
            event.payload.connectsTo = otherRoom;
          }
        }
      } else if (noun.has(TraitType.CONTAINER)) {
        event.payload.isContainer = true;
        
        // Add contents information
        const contents = context.world.getContents(noun.id);
        event.payload.contents = contents.map(item => item.id);
        event.payload.isEmpty = contents.length === 0;
      }
    }
    
    return openEvents;
  }
};