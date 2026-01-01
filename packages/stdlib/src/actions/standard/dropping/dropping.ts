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
import { TraitType, ContainerBehavior, WearableBehavior, ActorBehavior, IDropItemResult, IFEntity } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { DroppingMessages } from './dropping-messages';

// Import our data builder
import { droppedDataConfig, determineDroppingMessage } from './dropping-data';

// Import types
import { getDroppingSharedData, DroppingSharedData, DroppingItemResult } from './dropping-types';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler';

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
      params: { item: noun.name }
    };
  }

  // Check if the item is worn
  if (noun.has(TraitType.WEARABLE) && WearableBehavior.isWorn(noun)) {
    return {
      valid: false,
      error: DroppingMessages.STILL_WORN,
      params: { item: noun.name }
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
      const containerTrait = dropLocation.get(TraitType.CONTAINER) as any;
      if (containerTrait.capacity?.maxItems !== undefined) {
        const contents = context.world.getContents(dropLocation.id);
        if (contents.length >= containerTrait.capacity.maxItems) {
          return {
            valid: false,
            error: DroppingMessages.CONTAINER_FULL,
            params: { item: noun.name, container: dropLocation.name }
          };
        }
      }
      return { valid: false, error: DroppingMessages.CANT_DROP_HERE };
    }
  }

  return { valid: true };
}

/**
 * Validate a multi-object command (drop all, drop X and Y)
 */
function validateMultiObject(context: ActionContext): ValidationResult {
  // For dropping, scope is 'carried' - only drop things we're holding
  const items = expandMultiObject(context, { scope: 'carried' });

  if (items.length === 0) {
    return { valid: false, error: DroppingMessages.NOTHING_TO_DROP };
  }

  // Validate each entity, store results
  const results: DroppingItemResult[] = items.map(item => {
    const validation = validateSingleEntity(context, item.entity);
    return {
      entity: item.entity,
      success: validation.valid,
      error: validation.valid ? undefined : validation.error,
      errorParams: validation.valid ? undefined : validation.params
    };
  });

  // Store results for execute/report phases
  const sharedData = getDroppingSharedData(context);
  sharedData.multiObjectResults = results;

  // Valid if at least one can be dropped
  const anySuccess = results.some(r => r.success);
  if (!anySuccess) {
    // All failed - return the first error
    return { valid: false, error: results[0].error, params: results[0].errorParams };
  }

  return { valid: true };
}

/**
 * Execute dropping a single entity
 */
function executeSingleEntity(
  context: ActionContext,
  noun: IFEntity,
  result: DroppingItemResult
): void {
  const actor = context.player;

  // Store the drop location before the move (player's current location)
  const dropLocation = context.world.getLocation(actor.id);
  result.dropLocation = dropLocation;

  // Delegate to ActorBehavior for dropping logic
  ActorBehavior.dropItem(actor, noun, context.world);
}

/**
 * Generate success events for dropping a single entity
 */
function reportSingleSuccess(
  context: ActionContext,
  noun: IFEntity,
  result: DroppingItemResult,
  events: ISemanticEvent[]
): void {
  const actor = context.player;
  const dropLocation = result.dropLocation
    ? context.world.getEntity(result.dropLocation)
    : getDropLocation(context);

  // Build event data for this item
  const droppedData: Record<string, unknown> = {
    item: noun.id,
    itemName: noun.name,
    toLocation: dropLocation?.id,
    toLocationName: dropLocation?.name
  };

  // Add location type flags
  if (dropLocation) {
    if (!dropLocation.has(TraitType.ROOM)) {
      if (dropLocation.has(TraitType.CONTAINER)) {
        droppedData.toContainer = true;
      } else if (dropLocation.has(TraitType.SUPPORTER)) {
        droppedData.toSupporter = true;
      }
    } else {
      droppedData.toRoom = true;
    }
  }

  // Add the dropped event
  events.push(context.event('if.event.dropped', droppedData));

  // Determine success message
  let messageId = 'dropped';
  const params: Record<string, any> = {
    item: noun.name,
    location: dropLocation?.name
  };

  if (droppedData.toContainer) {
    messageId = 'dropped_in';
    params.container = dropLocation?.name;
  } else if (droppedData.toSupporter) {
    messageId = 'dropped_on';
    params.supporter = dropLocation?.name;
  }

  // Add success event
  events.push(context.event('action.success', {
    actionId: context.action.id,
    messageId,
    params
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be dropped
 */
function reportSingleBlocked(
  context: ActionContext,
  noun: IFEntity,
  error: string,
  errorParams: Record<string, unknown> | undefined,
  events: ISemanticEvent[]
): void {
  events.push(context.event('action.blocked', {
    actionId: context.action.id,
    messageId: error,
    params: { ...errorParams, item: noun.name }
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const droppingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DROPPING,
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
    // Check for multi-object command
    if (isMultiObjectCommand(context)) {
      return validateMultiObject(context);
    }

    // Single object validation
    const noun = context.command.directObject?.entity;
    if (!noun) {
      return { valid: false, error: DroppingMessages.NO_TARGET };
    }

    return validateSingleEntity(context, noun);
  },

  execute(context: ActionContext): void {
    const sharedData = getDroppingSharedData(context);

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      // Execute for each successful validation
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          executeSingleEntity(context, result.entity, result);
        }
      }
      return;
    }

    // Single object execution
    const actor = context.player;
    const noun = context.command.directObject!.entity!;

    // Delegate to ActorBehavior for dropping logic
    const result: IDropItemResult = ActorBehavior.dropItem(actor, noun, context.world);

    // Store result for report phase using sharedData
    sharedData.dropResult = result;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getDroppingSharedData(context);

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      const events: ISemanticEvent[] = [];
      // Generate events for each item (success and failure)
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          reportSingleSuccess(context, result.entity, result, events);
        } else {
          reportSingleBlocked(context, result.entity, result.error!, result.errorParams, events);
        }
      }
      return events;
    }

    // Single object report - use the data builder pattern
    const droppedData = buildEventData(droppedDataConfig, context);

    // Determine success message
    const { messageId, params } = determineDroppingMessage(droppedData, context);

    // Return both the domain event and success message
    return [
      context.event('if.event.dropped', droppedData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: { ...result.params, item: noun?.name }
    })];
  },

  group: "object_manipulation"
};
