/**
 * Dropping action - puts down held objects
 *
 * Uses four-phase pattern:
 * 1. validate: Check object can be dropped
 * 2. execute: Transfer the item from inventory to location
 * 3. report: Generate success events
 * 4. blocked: Generate error events when validation fails
 *
 * Supports multi-object commands:
 * - "drop all" - drops all carried items
 * - "drop all but X" - drops all except specified items
 * - "drop X and Y" - drops multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  ContainerTrait,
  ContainerBehavior,
  WearableBehavior,
  ActorBehavior,
  IDropItemResult,
  IFEntity
} from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { nounPhraseFor } from '../../../utils';
import { DroppingMessages } from './dropping-messages';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport
} from '../../lifecycle';

// Import our data builder
import { droppedDataConfig, determineDroppingMessage } from './dropping-data';

// Import types
import { getDroppingSharedData, DroppingItemScratch } from './dropping-types';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler';

/**
 * Interceptor surface (ADR-228): the dropped item is the only consultable
 * entity of a DROP command.
 */
export const droppingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.DROPPING,
  slots: [
    {
      id: 'item',
      actionIds: [IFActions.DROPPING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Get the drop location for the player
 */
function getDropLocation(context: ActionContext): IFEntity | undefined {
  const actor = context.player;
  const playerLocation = context.world.getLocation(actor.id);
  return playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;
}

/**
 * Validate dropping a single entity
 */
function validateSingleEntity(context: ActionContext, noun: IFEntity): ValidationResult {
  const actor = context.player;

  // Use ActorBehavior to validate dropping
  if (!ActorBehavior.isHolding(actor, noun.id, context.world)) {
    return {
      valid: false,
      error: DroppingMessages.NOT_HELD,
      params: { item: nounPhraseFor(noun) }
    };
  }

  // Check if the item is worn
  if (noun.has(TraitType.WEARABLE) && WearableBehavior.isWorn(noun)) {
    return {
      valid: false,
      error: DroppingMessages.STILL_WORN,
      params: { item: nounPhraseFor(noun) }
    };
  }

  // Get drop location
  const dropLocation = getDropLocation(context);

  if (!dropLocation) {
    return { valid: false, error: DroppingMessages.CANT_DROP_HERE };
  }

  // Check if location can accept the item (for containers)
  if (dropLocation.has(TraitType.CONTAINER) && !dropLocation.has(TraitType.ROOM)) {
    if (!ContainerBehavior.canAccept(dropLocation, noun, context.world)) {
      const containerTrait = dropLocation.getTrait(ContainerTrait);
      if (containerTrait?.capacity?.maxItems !== undefined) {
        const contents = context.world.getContents(dropLocation.id);
        if (containerTrait.capacity.maxItems !== undefined && contents.length >= containerTrait.capacity.maxItems) {
          return {
            valid: false,
            error: DroppingMessages.CONTAINER_FULL,
            params: { item: nounPhraseFor(noun), container: nounPhraseFor(dropLocation) }
          };
        }
      }
      return { valid: false, error: DroppingMessages.CANT_DROP_HERE };
    }
  }

  return { valid: true };
}

/**
 * Execute dropping a single entity. Mutation results are written into
 * `scratch` — the single-object sharedData or the item's multi-object
 * itemData (ADR-228 D4).
 */
function executeSingleEntity(
  context: ActionContext,
  noun: IFEntity,
  scratch: DroppingItemScratch
): void {
  const actor = context.player;

  // Store the drop location before the move (player's current location)
  const dropLocation = context.world.getLocation(actor.id);
  scratch.dropLocation = dropLocation;

  // Delegate to ActorBehavior for dropping validation
  ActorBehavior.dropItem(actor, noun, context.world);

  // Actually move the item to the drop location
  if (dropLocation) {
    context.world.moveEntity(noun.id, dropLocation);
  }
}

/**
 * Generate success events for dropping a single entity
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 * Text-service looks up message from domain event - no separate action.success needed.
 */
function reportSingleSuccess(
  context: ActionContext,
  noun: IFEntity,
  scratch: DroppingItemScratch,
  events: ISemanticEvent[],
  isMultiObject: boolean = false
): void {
  const actor = context.player;
  const dropLocation = scratch.dropLocation
    ? context.world.getEntity(scratch.dropLocation)
    : getDropLocation(context);

  // Determine message key based on context.
  // params carry EntityInfo for the formatter chain (ADR-158).
  let messageKey: string = DroppingMessages.DROPPED;
  const params: Record<string, any> = {
    item: nounPhraseFor(noun),
    location: dropLocation ? nounPhraseFor(dropLocation) : undefined
  };

  // Determine location type flags and message
  let toContainer = false;
  let toSupporter = false;
  let toRoom = false;

  if (dropLocation) {
    if (!dropLocation.has(TraitType.ROOM)) {
      if (dropLocation.has(TraitType.CONTAINER)) {
        toContainer = true;
      } else if (dropLocation.has(TraitType.SUPPORTER)) {
        toSupporter = true;
      }
    } else {
      toRoom = true;
    }
  }

  // Use compact format for multi-object commands
  if (isMultiObject) {
    messageKey = DroppingMessages.DROPPED_MULTI;
  } else if (toContainer) {
    messageKey = DroppingMessages.DROPPED_IN;
    params.container = dropLocation ? nounPhraseFor(dropLocation) : undefined;
  } else if (toSupporter) {
    messageKey = DroppingMessages.DROPPED_ON;
    params.supporter = dropLocation ? nounPhraseFor(dropLocation) : undefined;
  }

  // Emit domain event with messageId (simplified pattern - ADR-097)
  // Text-service will look up message directly from this event
  events.push(context.event('if.event.dropped', {
    // Rendering data (messageId + params for text-service)
    messageId: `${context.action.id}.${messageKey}`,
    params,
    // Domain data (for event sourcing / handlers)
    item: noun.name,
    itemId: noun.id,
    actorId: actor.id,
    toLocation: dropLocation?.id,
    toLocationName: dropLocation?.name,
    toContainer,
    toSupporter,
    toRoom
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be dropped
 *
 * Uses simplified event pattern (ADR-097): domain event carries messageId directly.
 */
function reportSingleBlocked(
  context: ActionContext,
  noun: IFEntity,
  error: string,
  errorParams: Record<string, unknown> | undefined,
  events: ISemanticEvent[]
): void {
  events.push(context.event('if.event.drop_blocked', {
    // Rendering data — EntityInfo for the formatter chain (ADR-158)
    messageId: `${context.action.id}.${error}`,
    params: { ...errorParams, item: nounPhraseFor(noun) },
    // Domain data — strings for handlers
    item: noun.name,
    itemId: noun.id,
    reason: error
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const droppingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DROPPING,

  // Default scope requirements for this action's slots
  defaultScope: {
    item: ScopeLevel.CARRIED
  },

  requiredMessages: [
    'no_target',
    'not_held',
    'still_worn',
    'container_not_open',
    'container_full',
    'dropped',
    'dropped_in',
    'dropped_on',
    'cant_drop_here',
    'dropped_quietly',
    'dropped_carelessly',
    'nothing_to_drop'
  ],

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  },

  validate(context: ActionContext): ValidationResult {
    // Check for multi-object command — full per-item lifecycle (ADR-228 D4)
    if (isMultiObjectCommand(context)) {
      // For dropping, scope is 'carried' - only drop things we're holding
      const items = expandMultiObject(context, { scope: 'carried' }).map(i => i.entity);

      if (items.length === 0) {
        return { valid: false, error: DroppingMessages.NOTHING_TO_DROP };
      }

      const results = runMultiObjectValidate(
        context, droppingLifecycle, 'item', items,
        (ctx, item) => validateSingleEntity(ctx, item)
      );

      // Valid if at least one can be dropped; all-fail returns the first error
      if (!results.some(r => r.success)) {
        return { valid: false, error: results[0].error, params: results[0].errorParams };
      }
      return { valid: true };
    }

    // Single object validation
    const noun = context.command.directObject?.entity;
    if (!noun) {
      return { valid: false, error: DroppingMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, droppingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const validation = validateSingleEntity(context, noun);
    if (!validation.valid) return validation;

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Multi-object command: per-item execute + postExecute hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      runMultiObjectExecute(context, multi, (ctx, item, itemData) => {
        executeSingleEntity(ctx, item, itemData as DroppingItemScratch);
      });
      return;
    }

    // Single object execution
    const sharedData = getDroppingSharedData(context);
    const actor = context.player;
    const noun = context.command.directObject!.entity!;

    // Delegate to ActorBehavior for dropping validation
    const result: IDropItemResult = ActorBehavior.dropItem(actor, noun, context.world);

    // Actually move the item to the drop location
    const dropLocation = context.world.getLocation(actor.id);
    if (dropLocation) {
      context.world.moveEntity(noun.id, dropLocation);
    }

    // Store result for report phase using sharedData
    sharedData.dropResult = result;

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Multi-object command: per-item success/blocked events + hooks (D4)
    const multi = getMultiObjectLifecycle(context);
    if (multi) {
      const events: ISemanticEvent[] = [];
      // Use compact format when multiple items
      const isMultiObject = multi.length > 1;
      runMultiObjectReport(
        context, multi, events, 'if.event.dropped', 'if.event.drop_blocked',
        (ctx, item, itemData, evts) => {
          reportSingleSuccess(ctx, item, itemData as DroppingItemScratch, evts, isMultiObject);
        },
        (ctx, item, error, errorParams, evts) => {
          reportSingleBlocked(ctx, item, error, errorParams, evts);
        }
      );
      return events;
    }

    // Single object report - use the data builder pattern for domain data
    const droppedData = buildEventData(droppedDataConfig, context);
    const actor = context.player;
    const noun = context.command.directObject!.entity!;

    // Determine success message
    const { messageId, params } = determineDroppingMessage(droppedData, context);

    // Build events array
    const events: ISemanticEvent[] = [
      context.event('if.event.dropped', {
        // Rendering data (messageId + params for text-service)
        messageId: `${context.action.id}.${messageId}`,
        params,
        // Domain data (for event sourcing / handlers)
        ...droppedData,
        item: noun.name,
        itemId: noun.id,
        actorId: actor.id
      })
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.dropped');

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.drop_blocked', {
      // Rendering data — EntityInfo for the formatter chain (ADR-158)
      messageId: `${context.action.id}.${result.error}`,
      params: { ...result.params, item: noun ? nounPhraseFor(noun) : undefined },
      // Domain data — strings for handlers
      item: noun?.name,
      itemId: noun?.id,
      reason: result.error
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) {
        // Single-object path: notify all consultations (ADR-228 D2/D3)
        runOnBlocked(context, state, events, 'if.event.drop_blocked', result.error);
      } else {
        // Multi-object all-fail path: the blocked event carries the FIRST
        // failed item's error, so only that item's consultations are
        // notified here — the other items produced no events for hooks to
        // decorate. (Partial failures are handled per item in report().)
        const multi = getMultiObjectLifecycle(context);
        const first = multi?.[0];
        if (first && !first.success) {
          runOnBlocked(context, first.state, events, 'if.event.drop_blocked', first.error ?? result.error);
        }
      }
    }

    return events;
  },

  group: "object_manipulation"
};
