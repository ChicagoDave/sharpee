/**
 * Exiting action - exit from containers, supporters, or other enterable objects
 * 
 * This action handles exiting objects that the actor is currently inside/on.
 */

import { Action, ActionContext, ValidationResult, EnhancedActionContext } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  OpenableBehavior,
  IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ExitedEventData } from './exiting-events';
import { ExitingMessages } from './exiting-messages';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle';

/**
 * The enterable the actor is currently inside/on — exiting's affected
 * entity is never a parsed object (EXIT takes no noun), so it resolves
 * implicitly from the actor's location (ADR-228 D3 implicit-entity slot).
 * Resolves undefined when the actor is directly in a room.
 */
function resolveCurrentContainer(context: ActionContext): IFEntity | undefined {
  const currentLocation = context.world.getLocation(context.player.id);
  if (!currentLocation) return undefined;
  const container = context.world.getEntity(currentLocation);
  if (!container || container.has(TraitType.ROOM)) return undefined;
  return container;
}

/**
 * Interceptor surface (ADR-228): the container/supporter being exited —
 * `on exiting it` on a boat, cage, or bed fires here.
 */
export const exitingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.EXITING,
  slots: [
    {
      id: 'container',
      actionIds: [IFActions.EXITING],
      resolve: resolveCurrentContainer
    }
  ]
};

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

    const state = resolveLifecycle(context, exitingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    if (!currentLocation) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    const currentContainer = context.world.getEntity(currentLocation);
    if (!currentContainer) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    // Check if we're in something we can exit from
    // Rooms cannot be exited (use GO to move between rooms)
    const isRoom = currentContainer.has(TraitType.ROOM);

    if (isRoom) {
      return {
        valid: false,
        error: ExitingMessages.ALREADY_OUTSIDE
      };
    }

    // Find the parent location (where we'll exit to)
    const parentLocation = context.world.getLocation(currentLocation);
    if (!parentLocation) {
      return {
        valid: false,
        error: ExitingMessages.NOWHERE_TO_GO
      };
    }

    // Check if container needs to be open to exit using behavior
    if (currentContainer.has(TraitType.CONTAINER) && currentContainer.has(TraitType.OPENABLE)) {
      if (!OpenableBehavior.isOpen(currentContainer)) {
        return {
          valid: false,
          error: ExitingMessages.CONTAINER_CLOSED,
          params: { container: nounPhraseFor(currentContainer) }
        };
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    const lifecycleState = getLifecycleState(context);
    if (lifecycleState) runPostExecute(context, lifecycleState);
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
        context.event('if.event.exited', {
          messageId: `${context.action.id}.action_failed`,
          error: 'Missing state from execute phase'
        })
      ];
    }

    // Create the EXITED event with messageId for text rendering.
    // params carry EntityInfo for the formatter chain (ADR-158);
    // re-derive from the entity since it's available via context.world.
    const fromEntity = context.world.getEntity(state.fromLocation);
    const events: ISemanticEvent[] = [context.event('if.event.exited', {
      messageId: `${context.action.id}.exited`,
      params: { place: fromEntity ? nounPhraseFor(fromEntity) : { name: state.fromLocationName } },
      fromLocation: state.fromLocation,
      fromLocationName: state.fromLocationName,
      toLocation: state.toLocation,
      preposition: state.preposition
    } as ExitedEventData & { messageId: string; params: Record<string, any>; fromLocationName: string })];

    const lifecycleState = getLifecycleState(context);
    if (lifecycleState) runPostReport(context, lifecycleState, events, 'if.event.exited');

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const events: ISemanticEvent[] = [context.event('if.event.exited', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.exited', result.error);
    }

    return events;
  },
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};