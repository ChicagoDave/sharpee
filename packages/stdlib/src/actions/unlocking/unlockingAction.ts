/**
 * Unlocking action executor
 * 
 * Handles unlocking containers, doors, and other lockable objects
 */

import { ActionExecutor, ParsedCommand } from '../../actions/types/command-types';
import { ActionContext } from '../../actions/types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, LockableBehavior, DoorBehavior } from '@sharpee/world-model';

/**
 * Executor for the unlocking action
 */
export const unlockingAction: ActionExecutor = {
  id: IFActions.UNLOCKING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun, indirectObject } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.UNLOCKING,
          reason: ActionFailureReason.INVALID_TARGET
        },
        { actor: actor.id }
      )];
    }
    
    // Check if lockable
    if (!noun.has(TraitType.LOCKABLE)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.UNLOCKING,
          reason: ActionFailureReason.NOT_LOCKABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Use static methods from LockableBehavior
    
    // Check if already unlocked
    if (!LockableBehavior.isLocked(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.UNLOCKING,
          reason: ActionFailureReason.ALREADY_UNLOCKED
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.UNLOCKING,
          reason: ActionFailureReason.NOT_REACHABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Handle key requirement
    const requiresKey = LockableBehavior.requiresKey(noun);
    let keyUsed = indirectObject;
    
    if (requiresKey) {
      // Key required
      if (!keyUsed) {
        // Don't auto-select key, require explicit specification
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.UNLOCKING,
            reason: ActionFailureReason.NO_KEY_SPECIFIED
          },
          { actor: actor.id, target: noun.id }
        )];
      }
      
      // Verify it's the correct key
      if (!LockableBehavior.canUnlockWith(noun, keyUsed.id)) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.UNLOCKING,
            reason: ActionFailureReason.WRONG_KEY,
            key: keyUsed.id
          },
          { actor: actor.id, target: noun.id, instrument: keyUsed.id }
        )];
      }
      
      // Check if actor has the key
      const keyLocation = context.world.getLocation(keyUsed.id);
      if (keyLocation !== actor.id) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.UNLOCKING,
            reason: ActionFailureReason.NOT_IN_CONTAINER,
            expectedContainer: actor.id
          },
          { actor: actor.id, target: keyUsed.id }
        )];
      }
    }
    
    // Actually unlock it
    const unlockEvents = LockableBehavior.unlock(noun, actor, keyUsed);
    
    // If unlocking failed, return those events
    if (unlockEvents.length > 0 && unlockEvents[0].type === IFEvents.ACTION_FAILED) {
      return unlockEvents;
    }
    
    // Add any additional events based on what was unlocked
    const additionalEvents: SemanticEvent[] = [];
    
    // If it's a door, we might want to notify about new passages
    if (noun.has(TraitType.DOOR)) {
      const currentRoom = context.world.getLocation(actor.id);
      if (currentRoom && DoorBehavior) {
        const otherRoom = DoorBehavior.getOtherRoom(noun, currentRoom);
        if (otherRoom) {
          additionalEvents.push(createEvent(
            IFEvents.NEW_EXIT_REVEALED,
            {
              via: noun.id,
              to: otherRoom,
              wasLocked: true
            },
            { actor: actor.id, location: currentRoom }
          ));
        }
      }
    }
    
    return [...unlockEvents, ...additionalEvents];
  }
};