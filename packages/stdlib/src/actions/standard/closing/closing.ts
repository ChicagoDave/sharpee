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
import { TraitType, OpenableTrait, OpenableBehavior, ICloseResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { closedDataConfig } from './closing-data';
import { ClosingMessages } from './closing-messages';

// Import our payload types
import { ClosedEventData } from './closing-event-data';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228): the closed target is the only
 * consultable entity of a CLOSE command.
 */
export const closingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.CLOSING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.CLOSING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

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

    const state = resolveLifecycle(context, closingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

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
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Use behavior's canClose method for validation
    if (!OpenableBehavior.canClose(noun)) {
      // Check if it's because it's already closed
      if (!OpenableBehavior.isOpen(noun)) {
        return {
          valid: false,
          error: ClosingMessages.ALREADY_CLOSED,
          params: { item: nounPhraseFor(noun) }
        };
      }
      // Otherwise it can't be closed for some other reason
      return {
        valid: false,
        error: ClosingMessages.PREVENTS_CLOSING,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Check if closable has special requirements
    const openableTrait = noun.getTrait(OpenableTrait);
    const openableRecord = openableTrait as Record<string, unknown> | undefined;
    if (openableRecord?.closeRequirements) {
      const requirement = openableRecord.closeRequirements as Record<string, unknown>;
      if (requirement.preventedBy) {
        return {
          valid: false,
          error: ClosingMessages.PREVENTS_CLOSING,
          params: {
            item: nounPhraseFor(noun),
            obstacle: requirement.preventedBy
          }
        };
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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

    // Emit domain event with messageId (simplified pattern - ADR-097).
    // params carries EntityInfo for the formatter chain (ADR-158);
    // top-level fields stay strings for handlers.
    events.push(context.event('if.event.closed', {
      messageId: `${context.action.id}.${ClosingMessages.CLOSED}`,
      params: { item: nounPhraseFor(noun) },
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

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.closed');

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const error = result.error || '';
    // If error already contains dots (e.g., story interceptor ID), use as-is; otherwise prefix with action ID
    const messageId = error.includes('.') ? error : `${context.action.id}.${error}`;

    const events: ISemanticEvent[] = [context.event('if.event.close_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId,
      params: {
        ...result.params,
        item: noun ? nounPhraseFor(noun) : undefined
      },
      // Domain data — strings for handlers
      targetId: noun?.id,
      targetName: noun?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.close_blocked', result.error);
    }

    return events;
  }
};
