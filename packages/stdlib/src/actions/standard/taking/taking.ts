/**
 * Taking action - picks up objects
 *
 * Uses four-phase pattern:
 * 1. validate: Check object can be taken (not scenery, not self, etc.)
 * 2. execute: Transfer the item to actor's inventory
 * 3. report: Generate success events with item and container snapshots
 * 4. blocked: Generate error events when validation fails
 *
 * Supports multi-object commands:
 * - "take all" - takes all portable reachable items
 * - "take all but X" - takes all except specified items
 * - "take X and Y" - takes multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SceneryBehavior, ActorBehavior, WearableBehavior, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { TakingMessages } from './taking-messages';

// Import type guards and typed interfaces
import {
  isWearableTrait,
  hasCapacityLimit,
  getTakingSharedData,
  TakingSharedData,
  TakingItemResult
} from './taking-types';

// Import multi-object helpers
import { isMultiObjectCommand, expandMultiObject } from '../../../helpers/multi-object-handler';

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Validate taking a single entity
 */
function validateSingleEntity(context: ActionContext, noun: IFEntity): ValidationResult {
  const actor = context.player;

  // Can't take yourself
  if (noun.id === actor.id) {
    return { valid: false, error: TakingMessages.CANT_TAKE_SELF };
  }

  // Check if already holding the item
  const currentLocation = context.world.getLocation(noun.id);
  if (currentLocation === actor.id) {
    return {
      valid: false,
      error: TakingMessages.ALREADY_HAVE,
      params: { item: noun.name }
    };
  }

  // Can't take rooms (business rule)
  if (noun.has(TraitType.ROOM)) {
    return {
      valid: false,
      error: TakingMessages.CANT_TAKE_ROOM,
      params: { item: noun.name }
    };
  }

  // Can't take scenery (fixed in place)
  if (noun.has(TraitType.SCENERY)) {
    const customMessage = SceneryBehavior.getCantTakeMessage(noun);
    return {
      valid: false,
      error: customMessage || TakingMessages.FIXED_IN_PLACE,
      params: { item: noun.name }
    };
  }

  // Use ActorBehavior to validate capacity constraints
  if (!ActorBehavior.canTakeItem(actor, noun, context.world)) {
    // Check if it's a container capacity issue
    if (actor.has(TraitType.CONTAINER)) {
      const containerTrait = actor.get(TraitType.CONTAINER);
      if (hasCapacityLimit(containerTrait) && containerTrait.capacity.maxItems !== undefined) {
        const contents = context.world.getContents(actor.id);
        const currentCount = contents.filter((item: any) => {
          if (!item.has || !item.has(TraitType.WEARABLE)) {
            return true;
          }
          const wearableTrait = item.get(TraitType.WEARABLE);
          return !isWearableTrait(wearableTrait) || (!wearableTrait.isWorn && !(wearableTrait as any).worn);
        }).length;
        if (currentCount >= containerTrait.capacity.maxItems) {
          return { valid: false, error: TakingMessages.CONTAINER_FULL };
        }
      }
    }

    // Otherwise generic failure
    return {
      valid: false,
      error: TakingMessages.CANNOT_TAKE,
      params: { item: noun.name }
    };
  }

  return { valid: true };
}

/**
 * Validate a multi-object command (take all, take X and Y)
 */
function validateMultiObject(context: ActionContext): ValidationResult {
  const items = expandMultiObject(context, { scope: 'reachable' });

  if (items.length === 0) {
    return { valid: false, error: TakingMessages.NOTHING_TO_TAKE };
  }

  // Validate each entity, store results
  const results: TakingItemResult[] = items.map(item => {
    const validation = validateSingleEntity(context, item.entity);
    return {
      entity: item.entity,
      success: validation.valid,
      error: validation.valid ? undefined : validation.error
    };
  });

  // Store results for execute/report phases
  const sharedData = getTakingSharedData(context);
  sharedData.multiObjectResults = results;

  // Valid if at least one can be taken
  const anySuccess = results.some(r => r.success);
  if (!anySuccess) {
    // All failed - return the first error
    return { valid: false, error: results[0].error };
  }

  return { valid: true };
}

/**
 * Execute taking a single entity
 */
function executeSingleEntity(
  context: ActionContext,
  noun: IFEntity,
  result: TakingItemResult | TakingSharedData
): void {
  const actor = context.player;

  // Capture context BEFORE any mutations
  const previousLocation = context.world.getLocation(noun.id);
  result.previousLocation = previousLocation;

  // Check if item is worn and needs to be removed first
  if (noun.has(TraitType.WEARABLE)) {
    const wearableTrait = noun.get(TraitType.WEARABLE);
    if (isWearableTrait(wearableTrait) && (wearableTrait.isWorn || (wearableTrait as any).worn)) {
      // Mark that we implicitly removed a worn item
      result.implicitlyRemoved = true;
      result.wasWorn = true;

      // Get the wearer (the one who has the item currently)
      const wearer = previousLocation ? context.world.getEntity(previousLocation) : null;
      // Remove the worn status
      if (wearer) {
        WearableBehavior.remove(noun, wearer);
      }
    }
  }

  // Perform the actual move
  context.world.moveEntity(noun.id, actor.id);
}

/**
 * Generate success events for taking a single entity
 */
function reportSingleSuccess(
  context: ActionContext,
  noun: IFEntity,
  result: TakingItemResult | TakingSharedData,
  events: ISemanticEvent[]
): void {
  const actor = context.player;

  // Check if we implicitly removed a worn item
  if (result.implicitlyRemoved) {
    const previousLocation = result.previousLocation;
    const container = previousLocation ? context.world.getEntity(previousLocation) : null;

    events.push(context.event('if.event.removed', {
      implicit: true,
      item: noun.name,
      container: container?.name
    }));
  }

  // Build event data for this item
  const takenData = {
    item: noun.name,
    itemId: noun.id,
    actor: actor.name,
    actorId: actor.id,
    previousLocation: result.previousLocation
  };

  // Add the taken event
  events.push(context.event('if.event.taken', takenData));

  // Determine success message based on where it was taken from
  const previousLocation = result.previousLocation;
  const isFromContainerOrSupporter = previousLocation &&
    previousLocation !== context.world.getLocation(actor.id);
  const messageId = isFromContainerOrSupporter ? TakingMessages.TAKEN_FROM : TakingMessages.TAKEN;

  // Add success event
  events.push(context.event('action.success', {
    actionId: context.action.id,
    messageId,
    params: takenData
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be taken
 */
function reportSingleBlocked(
  context: ActionContext,
  noun: IFEntity,
  error: string,
  events: ISemanticEvent[]
): void {
  events.push(context.event('action.blocked', {
    actionId: context.action.id,
    messageId: error,
    params: { item: noun.name }
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const takingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TAKING,
  requiredMessages: [
    'no_target',
    'cant_take_self',
    'already_have',
    'cant_take_room',
    'fixed_in_place',
    'container_full',
    'too_heavy',
    'taken',
    'taken_from',
    'nothing_to_take'
  ],

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    // Check for multi-object command
    if (isMultiObjectCommand(context)) {
      return validateMultiObject(context);
    }

    // Single object validation
    const noun = context.command.directObject?.entity;
    if (!noun) {
      return { valid: false, error: TakingMessages.NO_TARGET };
    }

    return validateSingleEntity(context, noun);
  },

  execute(context: ActionContext): void {
    const sharedData = getTakingSharedData(context);

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
    const noun = context.command.directObject!.entity!;
    executeSingleEntity(context, noun, sharedData);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getTakingSharedData(context);
    const events: ISemanticEvent[] = [];

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      // Generate events for each item (success and failure)
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          reportSingleSuccess(context, result.entity, result, events);
        } else {
          reportSingleBlocked(context, result.entity, result.error!, events);
        }
      }
      return events;
    }

    // Single object report
    const noun = context.command.directObject!.entity!;
    reportSingleSuccess(context, noun, sharedData, events);
    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    const noun = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: noun?.name
      }
    })];
  },

  group: "object_manipulation"
};
