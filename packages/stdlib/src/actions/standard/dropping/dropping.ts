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
  ContainerBehavior,
  WearableBehavior,
  ActorBehavior,
  IDropItemResult,
  IFEntity,
  getInterceptorForAction,
  InterceptorSharedData
} from '@sharpee/world-model';
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
  result: DroppingItemResult,
  events: ISemanticEvent[],
  isMultiObject: boolean = false
): void {
  const actor = context.player;
  const dropLocation = result.dropLocation
    ? context.world.getEntity(result.dropLocation)
    : getDropLocation(context);

  // Determine message key based on context
  let messageKey: string = DroppingMessages.DROPPED;
  const params: Record<string, any> = {
    item: noun.name,
    location: dropLocation?.name
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
    params.container = dropLocation?.name;
  } else if (toSupporter) {
    messageKey = DroppingMessages.DROPPED_ON;
    params.supporter = dropLocation?.name;
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
    // Rendering data
    messageId: `${context.action.id}.${error}`,
    params: { ...errorParams, item: noun.name },
    // Domain data
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
    // Check for multi-object command
    if (isMultiObjectCommand(context)) {
      return validateMultiObject(context);
    }

    // Single object validation
    const noun = context.command.directObject?.entity;
    if (!noun) {
      return { valid: false, error: DroppingMessages.NO_TARGET };
    }

    const sharedData = getDroppingSharedData(context);

    // Check for interceptor on the item being dropped (ADR-118)
    const interceptorResult = getInterceptorForAction(noun, IFActions.DROPPING);
    const interceptor = interceptorResult?.interceptor;
    const interceptorData: InterceptorSharedData = {};

    sharedData.interceptor = interceptor;
    sharedData.interceptorData = interceptorData;

    // === PRE-VALIDATE HOOK ===
    if (interceptor?.preValidate) {
      const result = interceptor.preValidate(noun, context.world, context.player.id, interceptorData);
      if (result !== null) {
        return { valid: result.valid, error: result.error, params: result.params };
      }
    }

    const validation = validateSingleEntity(context, noun);
    if (!validation.valid) return validation;

    // === POST-VALIDATE HOOK ===
    if (interceptor?.postValidate) {
      const result = interceptor.postValidate(noun, context.world, context.player.id, interceptorData);
      if (result !== null) {
        return { valid: result.valid, error: result.error, params: result.params };
      }
    }

    return { valid: true };
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

    // Delegate to ActorBehavior for dropping validation
    const result: IDropItemResult = ActorBehavior.dropItem(actor, noun, context.world);

    // Actually move the item to the drop location
    const dropLocation = context.world.getLocation(actor.id);
    if (dropLocation) {
      context.world.moveEntity(noun.id, dropLocation);
    }

    // Store result for report phase using sharedData
    sharedData.dropResult = result;

    // === POST-EXECUTE HOOK ===
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postExecute) {
      interceptor.postExecute(noun, context.world, actor.id, interceptorData);
    }
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getDroppingSharedData(context);

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      const events: ISemanticEvent[] = [];
      // Generate events for each item (success and failure)
      // Use compact format when multiple items
      const isMultiObject = sharedData.multiObjectResults.length > 1;
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          reportSingleSuccess(context, result.entity, result, events, isMultiObject);
        } else {
          reportSingleBlocked(context, result.entity, result.error!, result.errorParams, events);
        }
      }
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

    // === POST-REPORT HOOK ===
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postReport) {
      const additionalEffects = interceptor.postReport(noun, context.world, actor.id, interceptorData);
      for (const effect of additionalEffects) {
        events.push(context.event(effect.type, effect.payload));
      }
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;
    const sharedData = getDroppingSharedData(context);

    // === ON-BLOCKED HOOK ===
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.onBlocked && noun && result.error) {
      const customEffects = interceptor.onBlocked(noun, context.world, context.player.id, result.error, interceptorData);
      if (customEffects !== null) {
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

    return [context.event('if.event.drop_blocked', {
      // Rendering data
      messageId: `${context.action.id}.${result.error}`,
      params: { ...result.params, item: noun?.name },
      // Domain data
      item: noun?.name,
      itemId: noun?.id,
      reason: result.error
    })];
  },

  group: "object_manipulation"
};
