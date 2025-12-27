/**
 * Entering action - enter containers, supporters, or other enterable objects
 *
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and is enterable
 * 2. execute: Move actor into/onto the target
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with entered data
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  ContainerTrait,
  SupporterTrait,
  ContainerBehavior,
  SupporterBehavior,
  OpenableBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EnteredEventData } from './entering-events';
import { EnteringMessages } from './entering-messages';

interface EnteringExecutionState {
  targetId: string;
  targetName: string;
  fromLocation?: string;
  preposition: 'in' | 'on';
}

/**
 * Shared data passed between execute and report phases
 */
interface EnteringSharedData {
  enteringState?: EnteringExecutionState;
}

function getEnteringSharedData(context: ActionContext): EnteringSharedData {
  return context.sharedData as EnteringSharedData;
}

import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const enteringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ENTERING,
  requiredMessages: [
    'no_target',
    'not_enterable',
    'already_inside',
    'container_closed',
    'too_full',
    'entered',
    'entered_on',
    'cant_enter'
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;

    // Validate target
    if (!target) {
      return {
        valid: false,
        error: EnteringMessages.NO_TARGET
      };
    }

    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return {
        valid: false,
        error: EnteringMessages.ALREADY_INSIDE,
        params: { place: target.name }
      };
    }

    // Check if it's an enterable container
    if (target.has(TraitType.CONTAINER)) {
      const containerTrait = target.get(TraitType.CONTAINER) as ContainerTrait;
      if (!containerTrait.enterable) {
        return {
          valid: false,
          error: EnteringMessages.NOT_ENTERABLE,
          params: { place: target.name }
        };
      }

      // Check if container needs to be open
      if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
        return {
          valid: false,
          error: EnteringMessages.CONTAINER_CLOSED,
          params: { container: target.name }
        };
      }

      // Check capacity for containers
      if (!ContainerBehavior.canAccept(target, actor, context.world)) {
        return {
          valid: false,
          error: EnteringMessages.TOO_FULL,
          params: {
            place: target.name
          }
        };
      }

      return { valid: true };
    }

    // Check if it's an enterable supporter
    if (target.has(TraitType.SUPPORTER)) {
      const supporterTrait = target.get(TraitType.SUPPORTER) as SupporterTrait;
      if (!supporterTrait.enterable) {
        return {
          valid: false,
          error: EnteringMessages.NOT_ENTERABLE,
          params: { place: target.name }
        };
      }

      // Check capacity for supporters
      if (!SupporterBehavior.canAccept(target, actor, context.world)) {
        return {
          valid: false,
          error: EnteringMessages.TOO_FULL,
          params: {
            place: target.name
          }
        };
      }

      return { valid: true };
    }

    // Not enterable (not a container or supporter)
    return {
      valid: false,
      error: EnteringMessages.NOT_ENTERABLE,
      params: { place: target.name }
    };
  },

  /**
   * Execute the enter action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const currentLocation = context.world.getLocation(actor.id);

    // Determine preposition based on target type
    let preposition: 'in' | 'on' = 'in';

    if (target.has(TraitType.SUPPORTER)) {
      preposition = 'on';
    }

    // Simply move the actor to the target - that's all!
    context.world.moveEntity(actor.id, target.id);

    // Store state for report phase using sharedData
    const state: EnteringExecutionState = {
      targetId: target.id,
      targetName: target.name,
      fromLocation: currentLocation,
      preposition
    };
    const sharedData = getEnteringSharedData(context);
    sharedData.enteringState = state;
  },

  /**
   * Report events after successful entering
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    // Get stored state from execute phase
    const sharedData = getEnteringSharedData(context);
    const state = sharedData.enteringState as EnteringExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('action.error', {
          actionId: context.action.id,
          messageId: EnteringMessages.ACTION_FAILED,
          params: {
            error: 'Missing state from execute phase'
          }
        })
      ];
    }

    const events: ISemanticEvent[] = [];

    // Create the ENTERED event for world model updates
    const enteredData: EnteredEventData = {
      targetId: state.targetId,
      fromLocation: state.fromLocation,
      preposition: state.preposition
    };

    events.push(context.event('if.event.entered', enteredData));

    // Build params for success message
    const params: Record<string, any> = {
      place: state.targetName,
      preposition: state.preposition
    };

    // Create success message
    const messageId = state.preposition === 'on' ? EnteringMessages.ENTERED_ON : EnteringMessages.ENTERED;
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: messageId,
      params: params
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        place: target?.name
      }
    })];
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
