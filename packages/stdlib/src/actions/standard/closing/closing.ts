/**
 * Closing action - closes containers and doors
 *
 * This action properly delegates to OpenableBehavior for validation
 * and execution. It follows the validate/execute pattern.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and can be closed
 * 2. execute: Delegate to OpenableBehavior for state changes
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with closed data
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, OpenableBehavior, ICloseResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { closedDataConfig } from './closing-data';
import { ClosingMessages } from './closing-messages';

// Import our payload types
import { ClosedEventData } from './closing-event-data';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

/**
 * Shared data passed between execute and report phases
 */
interface ClosingSharedData {
  closeResult?: ICloseResult;
}

function getClosingSharedData(context: ActionContext): ClosingSharedData {
  return context.sharedData as ClosingSharedData;
}

export const closingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CLOSING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  // ADR-104: Implicit inference requirements
  targetRequirements: {
    trait: TraitType.OPENABLE,
    condition: 'is_open',
    description: 'closable'
  },

  // Closing doesn't require holding the target
  requiresHolding: false,

  requiredMessages: [
    'no_target',
    'not_closable',
    'already_closed',
    'closed',
    'cant_reach',
    'prevents_closing'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',

  /**
   * Validate whether the close action can be executed
   * Uses behavior validation methods to check preconditions
   */
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return {
        valid: false,
        error: ClosingMessages.NO_TARGET
      };
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if it's openable (things that can open can also close)
    if (!noun.has(TraitType.OPENABLE)) {
      return {
        valid: false,
        error: ClosingMessages.NOT_CLOSABLE,
        params: { item: noun.name }
      };
    }

    // Use behavior's canClose method for validation
    if (!OpenableBehavior.canClose(noun)) {
      // Check if it's because it's already closed
      if (!OpenableBehavior.isOpen(noun)) {
        return {
          valid: false,
          error: ClosingMessages.ALREADY_CLOSED,
          params: { item: noun.name }
        };
      }
      // Otherwise it can't be closed for some other reason
      return {
        valid: false,
        error: ClosingMessages.PREVENTS_CLOSING,
        params: { item: noun.name }
      };
    }

    // Check if closable has special requirements
    const openableTrait = noun.get(TraitType.OPENABLE);
    if ((openableTrait as any).closeRequirements) {
      const requirement = (openableTrait as any).closeRequirements;
      if (requirement.preventedBy) {
        return {
          valid: false,
          error: ClosingMessages.PREVENTS_CLOSING,
          params: {
            item: noun.name,
            obstacle: requirement.preventedBy
          }
        };
      }
    }

    return { valid: true };
  },

  /**
   * Execute the close action
   * Assumes validation has already passed - no validation logic here
   * Delegates to OpenableBehavior for actual state changes
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;

    // Delegate to behavior for closing
    const result: ICloseResult = OpenableBehavior.close(noun);

    // Store result for report phase using sharedData
    const sharedData = getClosingSharedData(context);
    sharedData.closeResult = result;
  },

  /**
   * Report events after successful closing
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   * Text-service looks up message from domain event - no separate action.success needed.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const sharedData = getClosingSharedData(context);
    const result = sharedData.closeResult as ICloseResult;

    const events: ISemanticEvent[] = [];

    // Add the backward compat domain event (closed)
    events.push(context.event('closed', {
      targetId: noun.id,
      targetName: noun.name,
      customMessage: result.closeMessage,
      sound: result.closeSound
    }));

    // Build domain data for the primary event
    const eventData = buildEventData(closedDataConfig, context);

    // Add additional fields for backward compatibility
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const isSupporter = noun.has(TraitType.SUPPORTER);

    let hasContents = false;
    let contentsCount = 0;
    let contentsIds: string[] = [];

    if (isContainer) {
      const contents = context.world.getContents(noun.id);
      hasContents = contents.length > 0;
      contentsCount = contents.length;
      contentsIds = contents.map(item => item.id);
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    events.push(context.event('if.event.closed', {
      // Rendering data (messageId + params for text-service)
      messageId: `${context.action.id}.${ClosingMessages.CLOSED}`,
      params: { item: noun.name },
      // Domain data (for event sourcing / handlers)
      ...eventData,
      targetId: noun.id,
      targetName: noun.name,
      actorId: context.player.id,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents,
      contentsCount,
      contentsIds,
      item: noun.name
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    return [context.event('if.event.close_blocked', {
      // Rendering data
      messageId: `${context.action.id}.${result.error}`,
      params: {
        ...result.params,
        item: noun?.name
      },
      // Domain data
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];
  }
};
