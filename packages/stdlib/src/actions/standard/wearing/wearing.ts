/**
 * Wearing action - put on clothing or wearable items
 *
 * This action handles wearing items that have the WEARABLE trait.
 * It validates that the item can be worn and isn't already worn.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if item is wearable and can be worn
 * 2. execute: Call WearableBehavior.wear(), store result in sharedData
 * 3. report: Generate events from sharedData
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { WornEventData, ImplicitTakenEventData } from './wearing-events';
import {
  analyzeWearableContext,
  checkWearingConflicts,
  buildWearableEventParams
} from '../wearable-shared';
import { MESSAGES } from './wearing-messages';

/**
 * Shared data passed between execute and report phases
 */
interface WearingSharedData {
  itemId: string;
  itemName: string;
  bodyPart?: string;
  layer?: number;
  implicitTake?: boolean;
  params: Record<string, any>;
  messageId: string;
  // In case of failure
  failed?: boolean;
  errorMessageId?: string;
  errorReason?: string;
  errorParams?: Record<string, any>;
}

function getWearingSharedData(context: ActionContext): WearingSharedData {
  return context.sharedData as WearingSharedData;
}

export const wearingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WEARING,
  requiredMessages: [
    'no_target',
    'not_wearable',
    'not_held',
    'already_wearing',
    'worn',
    'cant_wear_that',
    'hands_full'
  ],
  group: 'wearable_manipulation',

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const item = context.command.directObject?.entity;

    if (!item) {
      return { valid: false, error: 'no_target' };
    }

    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearable' };
    }

    if (!WearableBehavior.canWear(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (wearable.worn) {
        return { valid: false, error: 'already_wearing' };
      }
      return { valid: false, error: 'cant_wear_that' };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const sharedData = getWearingSharedData(context);

    // Store basic info
    sharedData.itemId = item.id;
    sharedData.itemName = item.name;

    // Analyze the wearable context
    const wearableContext = analyzeWearableContext(context, item, actor);
    const { wearableTrait } = wearableContext;

    // Store body part and layer
    sharedData.bodyPart = wearableTrait.bodyPart;
    sharedData.layer = wearableTrait.layer;

    // Check if actor is holding the item
    const itemLocation = context.world.getLocation?.(item.id);
    if (itemLocation !== actor.id) {
      sharedData.implicitTake = true;
    }

    // Check for wearing conflicts using shared helper
    const conflictingItem = checkWearingConflicts(wearableContext);
    if (conflictingItem) {
      sharedData.failed = true;
      sharedData.errorMessageId = wearableTrait.layer !== undefined ? 'hands_full' : 'already_wearing';
      sharedData.errorReason = sharedData.errorMessageId;
      sharedData.errorParams = { item: conflictingItem.name };
      return;
    }

    // Delegate state change to behavior
    const result = WearableBehavior.wear(item, actor);

    // Handle failure cases (defensive checks)
    if (!result.success) {
      sharedData.failed = true;
      if (result.alreadyWorn) {
        sharedData.errorMessageId = 'already_wearing';
        sharedData.errorReason = 'already_wearing';
        sharedData.errorParams = { item: item.name };
      } else if (result.wornByOther) {
        sharedData.errorMessageId = 'already_wearing';
        sharedData.errorReason = 'worn_by_other';
        sharedData.errorParams = { item: item.name, wornBy: result.wornByOther };
      } else {
        sharedData.errorMessageId = 'cant_wear_that';
        sharedData.errorReason = 'cant_wear_that';
        sharedData.errorParams = { item: item.name };
      }
      return;
    }

    // Success
    sharedData.failed = false;
    sharedData.params = buildWearableEventParams(item, wearableTrait);
    sharedData.messageId = 'worn';
  },

  /**
   * Report phase - generates events after successful execution
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getWearingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: sharedData.errorMessageId,
        reason: sharedData.errorReason,
        params: sharedData.errorParams
      })];
    }

    // Add implicit TAKEN event if needed
    if (sharedData.implicitTake) {
      const implicitTakenData: ImplicitTakenEventData = {
        implicit: true,
        item: sharedData.itemName
      };
      events.push(context.event('if.event.taken', implicitTakenData));
    }

    // Create WORN event for world model updates
    const wornData: WornEventData = {
      itemId: sharedData.itemId,
      bodyPart: sharedData.bodyPart,
      layer: sharedData.layer
    };
    events.push(context.event('if.event.worn', wornData));

    // Create success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: sharedData.messageId,
      params: sharedData.params
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
