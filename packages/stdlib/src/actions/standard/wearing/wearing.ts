/**
 * Wearing action - put on clothing or wearable items
 *
 * This action handles wearing items that have the WEARABLE trait.
 * It validates that the item can be worn and isn't already worn.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if item is wearable and can be worn
 * 2. execute: Call WearableBehavior.wear(), store result in sharedData
 * 3. report: Generate events from sharedData
 * 4. blocked: Generate error events when validation fails
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `wearingLifecycle` — no hand-rolled hook plumbing.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, WearableTrait, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ScopeLevel } from '../../../scope/index.js';
import { WornEventData } from './wearing-events.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  analyzeWearableContext,
  checkWearingConflicts,
  buildWearableEventParams
} from '../wearable-shared.js';
import { MESSAGES } from './wearing-messages.js';
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
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the worn item is the only consultable
 * entity of a WEAR command.
 */
export const wearingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.WEARING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.WEARING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/**
 * Shared data passed between execute and report phases
 */
interface WearingSharedData {
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

function getWearingSharedData(context: ActionContext): WearingSharedData {
  return context.sharedData as WearingSharedData;
}

export const wearingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.WEARING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.REACHABLE
  },

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

    const state = resolveLifecycle(context, wearingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    if (!item.has(TraitType.WEARABLE)) {
      return { valid: false, error: 'not_wearable', params: { item: nounPhraseFor(item) } };
    }

    // Item must be carried (or implicitly takeable)
    // This enables "wear hat" when hat is on the ground
    const carryCheck = context.requireCarriedOrImplicitTake(item);
    if (!carryCheck.ok) {
      return carryCheck.error!;
    }

    if (!WearableBehavior.canWear(item, actor)) {
      const wearable = item.get(TraitType.WEARABLE) as WearableTrait;
      if (wearable.worn) {
        return { valid: false, error: 'already_wearing', params: { item: nounPhraseFor(item) } };
      }
      return { valid: false, error: 'cant_wear_that', params: { item: nounPhraseFor(item) } };
    }

    // Folded execute-phase refusal (ADR-229 R1): a pure read, so it runs
    // as standard validation and its failure flows through blocked() →
    // onBlocked like every other refusal.
    const wearableContext = analyzeWearableContext(context, item, actor);
    const conflictingItem = checkWearingConflicts(wearableContext);
    if (conflictingItem) {
      return {
        valid: false,
        error: wearableContext.wearableTrait.layer !== undefined ? 'hands_full' : 'already_wearing',
        params: { item: nounPhraseFor(conflictingItem) }
      };
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    // Wearing conflicts are a validate-phase refusal now (ADR-229 R1) —
    // execute only keeps the behavior-result defensive branch below as
    // the true safety net.

    // Delegate state change to behavior
    const result = WearableBehavior.wear(item, actor);

    // Handle failure cases (defensive checks).
    // params carry EntityInfo for the formatter chain (ADR-158).
    if (!result.success) {
      sharedData.failed = true;
      if (result.alreadyWorn) {
        sharedData.errorMessageId = 'already_wearing';
        sharedData.errorReason = 'already_wearing';
        sharedData.errorParams = { item: nounPhraseFor(item) };
      } else if (result.wornByOther) {
        sharedData.errorMessageId = 'already_wearing';
        sharedData.errorReason = 'worn_by_other';
        sharedData.errorParams = { item: nounPhraseFor(item), wornBy: result.wornByOther };
      } else {
        sharedData.errorMessageId = 'cant_wear_that';
        sharedData.errorReason = 'cant_wear_that';
        sharedData.errorParams = { item: nounPhraseFor(item) };
      }
      return;
    }

    // Success
    sharedData.failed = false;
    sharedData.params = buildWearableEventParams(item, wearableTrait);
    sharedData.messageId = 'worn';

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  /**
   * Report phase - generates events after successful execution
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getWearingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Check if behavior failed (safety net for edge cases)
    if (sharedData.failed) {
      return [context.event('if.event.wear_blocked', {
        messageId: `${context.action.id}.${sharedData.errorMessageId}`,
        params: sharedData.errorParams,
        itemId: sharedData.itemId,
        itemName: sharedData.itemName,
        reason: sharedData.errorReason
      })];
    }

    // Prepend any implicit take events (from requireCarriedOrImplicitTake)
    if (context.sharedData.implicitTakeEvents) {
      events.push(...context.sharedData.implicitTakeEvents);
    }

    // Emit domain event with messageId (simplified pattern - ADR-097)
    events.push(context.event('if.event.worn', {
      // Rendering data (messageId + params for text-service)
      messageId: `${context.action.id}.${sharedData.messageId}`,
      params: sharedData.params,
      // Domain data (for event sourcing / handlers)
      itemId: sharedData.itemId,
      itemName: sharedData.itemName,
      actorId: context.player.id,
      bodyPart: sharedData.bodyPart,
      layer: sharedData.layer
    }));

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.worn');

    return events;
  },

  /**
   * Generate events when validation fails
   *
   * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.wear_blocked', {
      // Rendering data
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      // Domain data
      itemId: item?.id,
      itemName: item?.name,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.wear_blocked', result.error);
    }

    return events;
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
