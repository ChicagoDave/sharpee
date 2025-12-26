/**
 * Taking off action - remove worn clothing or equipment
 *
 * This action handles removing items that are currently worn.
 * It validates layering rules and provides appropriate feedback.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if item is worn and can be removed
 * 2. execute: Call WearableBehavior.remove(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovedEventData } from './taking-off-events';
import {
  analyzeWearableContext,
  checkRemovalBlockers,
  buildWearableEventParams,
  hasRemovalRestrictions
} from '../wearable-shared';

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

    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearing' };
    }

    if (!WearableBehavior.canRemove(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (!wearable.worn) {
        return { valid: false, error: 'not_wearing' };
      }
      if (wearable.wornBy !== actor.id) {
        return { valid: false, error: 'not_wearing' };
      }
      return { valid: false, error: 'cant_remove' };
    }

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

    // Check for layering conflicts using shared helper
    const blockingItem = checkRemovalBlockers(wearableContext);
    if (blockingItem) {
      sharedData.failed = true;
      sharedData.errorMessageId = 'prevents_removal';
      sharedData.errorReason = 'prevents_removal';
      sharedData.errorParams = { blocking: blockingItem.name };
      return;
    }

    // Check if removing this would cause problems (e.g., cursed items)
    if (hasRemovalRestrictions(wearableTrait)) {
      sharedData.failed = true;
      sharedData.errorMessageId = 'cant_remove';
      sharedData.errorReason = 'cant_remove';
      sharedData.errorParams = { item: item.name };
      return;
    }

    // Delegate state change to behavior
    const result = WearableBehavior.remove(item, actor);

    // Handle failure cases (defensive checks)
    if (!result.success) {
      sharedData.failed = true;
      if (result.notWorn) {
        sharedData.errorMessageId = 'not_wearing';
        sharedData.errorReason = 'not_wearing';
        sharedData.errorParams = { item: item.name };
      } else if (result.wornByOther) {
        sharedData.errorMessageId = 'not_wearing';
        sharedData.errorReason = 'worn_by_other';
        sharedData.errorParams = { item: item.name, wornBy: result.wornByOther };
      } else {
        sharedData.errorMessageId = 'cant_remove';
        sharedData.errorReason = 'cant_remove';
        sharedData.errorParams = { item: item.name };
      }
      return;
    }

    // Success
    sharedData.failed = false;
    sharedData.params = buildWearableEventParams(item, wearableTrait);
    sharedData.messageId = 'removed';
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getTakingOffSharedData(context);

    // Handle failure
    if (sharedData.failed) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: sharedData.errorMessageId,
        reason: sharedData.errorReason,
        params: sharedData.errorParams
      })];
    }

    const events: ISemanticEvent[] = [];

    // Create REMOVED event for world model updates
    const removedData: RemovedEventData = {
      itemId: sharedData.itemId,
      bodyPart: sharedData.bodyPart,
      layer: sharedData.layer
    };
    events.push(context.event('if.event.removed', removedData));

    // Create success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: sharedData.messageId,
      params: sharedData.params
    }));

    return events;
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
