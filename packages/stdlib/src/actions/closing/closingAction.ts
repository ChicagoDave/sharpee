/**
 * Closing action executor
 * 
 * Handles the logic for closing containers, doors, and other openable objects
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, OpenableBehavior } from '@sharpee/world-model';

/**
 * Executor for the closing action
 */
export const closingAction: ActionExecutor = {
  id: IFActions.CLOSING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, noun } = command;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.CLOSING,
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
          action: IFActions.CLOSING,
          reason: ActionFailureReason.NOT_OPENABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if already closed
    if (!OpenableBehavior.isOpen(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.CLOSING,
          reason: ActionFailureReason.ALREADY_CLOSED
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.CLOSING,
          reason: ActionFailureReason.NOT_REACHABLE
        },
        { actor: actor.id, target: noun.id }
      )];
    }
    
    // Actually close it
    const closeEvents = OpenableBehavior.close(noun, actor);
    
    // Add additional context to the event payload if it succeeded
    if (closeEvents.length > 0 && closeEvents[0].type === IFEvents.CLOSED) {
      const event = closeEvents[0];
      if (!event.payload) {
        event.payload = {};
      }
      
      // Add specific data based on what was closed
      if (noun.has(TraitType.DOOR)) {
        event.payload.isDoor = true;
      } else if (noun.has(TraitType.CONTAINER)) {
        event.payload.isContainer = true;
      }
    }
    
    return closeEvents;
  }
};