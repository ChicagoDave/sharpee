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
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const sharedData = getClosingSharedData(context);
    const result = sharedData.closeResult as ICloseResult;

    const events: ISemanticEvent[] = [];

    // Add the domain event (closed)
    events.push(context.event('closed', {
      targetId: noun.id,
      targetName: noun.name,
      customMessage: result.closeMessage,
      sound: result.closeSound
    }));

    // Add the action event (if.event.closed) - using data builder
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

    const fullEventData = {
      ...eventData,
      targetName: noun.name,  // Add targetName explicitly
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      isSupporter,
      hasContents,
      contentsCount,
      contentsIds,
      item: noun.name
    };

    events.push(context.event('if.event.closed', fullEventData));

    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: ClosingMessages.CLOSED,
      params: { item: noun.name }
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: noun?.name
      }
    })];
  }
};
