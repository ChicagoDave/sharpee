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
  OpenableBehavior,
  EnterableTrait
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

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

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

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
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

    // Check enterability
    if (!target.has(TraitType.ENTERABLE)) {
      return {
        valid: false,
        error: EnteringMessages.NOT_ENTERABLE,
        params: { place: target.name }
      };
    }

    // Check if it needs to be open
    if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
      return {
        valid: false,
        error: EnteringMessages.CONTAINER_CLOSED,
        params: { container: target.name }
      };
    }

    // Capacity checks are author responsibility via event handlers
    return { valid: true };
  },

  /**
   * Execute the enter action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const currentLocation = context.world.getLocation(actor.id);

    // Get preposition from EnterableTrait (required by validate)
    const enterableTrait = target.get(TraitType.ENTERABLE) as EnterableTrait;
    const preposition = enterableTrait.preposition;

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
        context.event('if.event.entered', {
          messageId: `${context.action.id}.${EnteringMessages.ACTION_FAILED}`,
          error: 'Missing state from execute phase'
        })
      ];
    }

    // Determine the message ID based on preposition
    const messageId = state.preposition === 'on' ? EnteringMessages.ENTERED_ON : EnteringMessages.ENTERED;

    // Create the ENTERED event with messageId for text rendering
    return [context.event('if.event.entered', {
      messageId: `${context.action.id}.${messageId}`,
      params: { place: state.targetName },
      targetId: state.targetId,
      targetName: state.targetName,
      fromLocation: state.fromLocation,
      preposition: state.preposition
    } as EnteredEventData & { messageId: string; params: Record<string, any>; targetName: string })];
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;

    return [context.event('if.event.entered', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: { place: target?.name, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
