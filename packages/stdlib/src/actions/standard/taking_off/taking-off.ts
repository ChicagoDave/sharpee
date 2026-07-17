/**
 * Taking off action - remove worn clothing or equipment
 *
 * This action handles removing items that are currently worn.
 * It validates layering rules and provides appropriate feedback.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item is worn and can be removed
 * 2. execute: Call WearableBehavior.remove(), store result in sharedData
 * 3. blocked: Generate events when validation fails
 * 4. report: Generate success events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovedEventData } from './taking-off-events';
import { nounPhraseFor } from '../../../utils';
import {
  analyzeWearableContext,
  checkRemovalBlockers,
  buildWearableEventParams,
  hasRemovalRestrictions
} from '../wearable-shared';
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
 * Interceptor surface (ADR-228): the worn item is the only consultable
 * entity of a TAKE OFF command.
 */
export const takingOffLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TAKING_OFF,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.TAKING_OFF],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface TakingOffSharedData {
  itemId: string;
  itemName: string;
  bodyPart?: string;
  layer?: number;
  params: Record<string, any>;
  messageId: string;
  // In case of failure
  failed?: boolean;
  errorMessageId?: string;
  errorReason?: string;
  errorParams?: Record<string, any>;
}

function getTakingOffSharedData(context: ActionContext): TakingOffSharedData {
  return context.sharedData as TakingOffSharedData;
}

export const takingOffAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TAKING_OFF,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.CARRIED  // Must be wearing the item (which implies possession)
  },

  requiredMessages: [
    'no_target',
    'not_wearing',
    'removed',
    'cant_remove',
    'prevents_removal'
  ],
  group: 'wearable_manipulation',

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;

    if (!item) {
      return { valid: false, error: 'no_target' };
    }

    const state = resolveLifecycle(context, takingOffLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearing', params: { item: nounPhraseFor(item) } };
    }

    if (!WearableBehavior.canRemove(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (!wearable.worn) {
        return { valid: false, error: 'not_wearing', params: { item: nounPhraseFor(item) } };
      }
      if (wearable.wornBy !== actor.id) {
        return { valid: false, error: 'not_wearing', params: { item: nounPhraseFor(item) } };
      }
      return { valid: false, error: 'cant_remove', params: { item: nounPhraseFor(item) } };
    }

    // Folded execute-phase refusals (ADR-229 R1): both are pure reads, so
    // they run as standard validation and their failures flow through
    // blocked() → onBlocked like every other refusal.
    const wearableContext = analyzeWearableContext(context, item, actor);
    const blockingItem = checkRemovalBlockers(wearableContext);
    if (blockingItem) {
      return { valid: false, error: 'prevents_removal', params: { blocking: nounPhraseFor(blockingItem) } };
    }
    if (hasRemovalRestrictions(wearableContext.wearableTrait)) {
      return { valid: false, error: 'cant_remove', params: { item: nounPhraseFor(item) } };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const sharedData = getTakingOffSharedData(context);

    // Store basic info
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;

    // Analyze the wearable context
    const wearableContext = analyzeWearableContext(context, item, actor);
    const { wearableTrait } = wearableContext;

    // Store body part and layer
    sharedData.bodyPart = wearableTrait.bodyPart;
    sharedData.layer = wearableTrait.layer;

    // Layering blockers and removal restrictions are validate-phase
    // refusals now (ADR-229 R1) — execute only keeps the behavior-result
    // defensive branch below as the true safety net.

    // Delegate state change to behavior
    const result = WearableBehavior.remove(item, actor);

    // Handle failure cases (defensive checks)
    if (!result.success) {
      sharedData.failed = true;
      if (result.notWorn) {
        sharedData.errorMessageId = 'not_wearing';
        sharedData.errorReason = 'not_wearing';
        sharedData.errorParams = { item: nounPhraseFor(item) };
      } else if (result.wornByOther) {
        sharedData.errorMessageId = 'not_wearing';
        sharedData.errorReason = 'worn_by_other';
        sharedData.errorParams = { item: nounPhraseFor(item), wornBy: result.wornByOther };
      } else {
        sharedData.errorMessageId = 'cant_remove';
        sharedData.errorReason = 'cant_remove';
        sharedData.errorParams = { item: nounPhraseFor(item) };
      }
      return;
    }

    // Success
    sharedData.failed = false;
    sharedData.params = buildWearableEventParams(item, wearableTrait);
    sharedData.messageId = 'removed';

    // Interceptor lifecycle (ADR-228): postExecute runs after the successful
    // mutation only — the defensive behavior-failure branch above
    // early-returns with sharedData.failed and skips it, matching the
    // switching_on precedent.
    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.take_off_blocked', {
      // Rendering data
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      // Domain data
      itemId: item?.id,
      itemName: item?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.take_off_blocked', result.error);
    }

    return events;
  },

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getTakingOffSharedData(context);

    // Handle behavior failures (safety net - should be rare after validation)
    if (sharedData.failed) {
      return [context.event('if.event.take_off_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: sharedData.errorParams || {},
        itemId: sharedData.itemId,
        itemName: sharedData.itemName,
        reason: sharedData.errorReason
      })];
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    const events: ISemanticEvent[] = [
      context.event('if.event.removed', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${sharedData.messageId}`,
        params: sharedData.params,
        // Domain data (for event sourcing / handlers)
        itemId: sharedData.itemId,
        itemName: sharedData.itemName,
        actorId: context.player.id,
        bodyPart: sharedData.bodyPart,
        layer: sharedData.layer
      })
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.removed');

    return events;
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
