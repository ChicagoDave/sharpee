/**
 * Exiting action - exit from containers, supporters, or other enterable objects
 * 
 * This action handles exiting objects that the actor is currently inside/on.
 */

import { Action, ActionContext, ValidationResult, EnhancedActionContext } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  OpenableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ExitedEventData } from './exiting-events';
import { MESSAGES } from './exiting-messages';

interface ExitingExecutionState {
  fromLocation: string;
  fromLocationName: string;
  toLocation: string;
  preposition: string;
}

/**
 * Shared data passed between execute and report phases
 */
interface ExitingSharedData {
  exitingState?: ExitingExecutionState;
}

function getExitingSharedData(context: ActionContext): ExitingSharedData {
  return context.sharedData as ExitingSharedData;
}

import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const exitingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXITING,
  requiredMessages: [
    'already_outside',
    'container_closed',
    'cant_exit',
    'exited',
    'exited_from',
    'nowhere_to_go'
  ],
  group: 'movement',
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const currentLocation = context.world.getLocation(actor.id);

    if (!currentLocation) {
      return {
        valid: false,
        error: MESSAGES.NOWHERE_TO_GO
      };
    }

    const currentContainer = context.world.getEntity(currentLocation);
    if (!currentContainer) {
      return {
        valid: false,
        error: MESSAGES.NOWHERE_TO_GO
      };
    }

    // Check if we're in something we can exit from
    // Rooms cannot be exited (use GO to move between rooms)
    const isRoom = currentContainer.has(TraitType.ROOM);

    if (isRoom) {
      return {
        valid: false,
        error: MESSAGES.ALREADY_OUTSIDE
      };
    }

    // Find the parent location (where we'll exit to)
    const parentLocation = context.world.getLocation(currentLocation);
    if (!parentLocation) {
      return {
        valid: false,
        error: MESSAGES.NOWHERE_TO_GO
      };
    }

    // Check if container needs to be open to exit using behavior
    if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(currentContainer)) {
        return {
          valid: false,
          error: MESSAGES.CONTAINER_CLOSED,
          params: { container: currentContainer.name }
        };
      }
    }

    return { valid: true };
  },
  
  /**
   * Execute the exit action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const currentLocation = context.world.getLocation(actor.id)!; // Safe because validate ensures it exists
    const currentContainer = context.world.getEntity(currentLocation)!; // Safe because validate ensures it exists
    const parentLocation = context.world.getLocation(currentLocation)!; // Safe because validate ensures it exists
    
    // Determine preposition based on what we're exiting from
    let preposition = 'from';
    if (currentContainer.has(TraitType.CONTAINER)) {
      preposition = 'out of';
    } else if (currentContainer.has(TraitType.SUPPORTER)) {
      preposition = 'off';
    }
    
    // Simply move the actor to the parent location - that's all!
    context.world.moveEntity(actor.id, parentLocation);
    
    // Store state for report phase using sharedData
    const state: ExitingExecutionState = {
      fromLocation: currentLocation,
      fromLocationName: currentContainer.name,
      toLocation: parentLocation,
      preposition
    };
    const sharedData = getExitingSharedData(context);
    sharedData.exitingState = state;
  },
  
  /**
   * Report phase - generates events after successful execution
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    // Get stored state from execute phase
    const sharedData = getExitingSharedData(context);
    const state = sharedData.exitingState as ExitingExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: 'action_failed',
          params: {
            error: 'Missing state from execute phase'
          }
        })
      ];
    }

    const events: ISemanticEvent[] = [];

    // Create the EXITED event for world model updates
    const exitedData: ExitedEventData = {
      fromLocation: state.fromLocation,
      toLocation: state.toLocation,
      preposition: state.preposition
    };

    events.push(context.event('if.event.exited', exitedData));

    // Create success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: 'exited',
      params: {
        place: state.fromLocationName,
        preposition: state.preposition
      }
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: result.params || {}
    })];
  },
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};