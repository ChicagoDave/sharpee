/**
 * Removing action - remove objects from containers or surfaces
 *
 * This action handles taking objects from containers or supporters.
 * It's essentially a targeted form of taking.
 *
 * Uses four-phase pattern:
 * 1. validate: Check item and source exist and are accessible
 * 2. execute: Remove from source and take to inventory
 * 3. blocked: Generate error events when validation fails
 * 4. report: Generate success events with removed data
 *
 * Supports multi-object commands:
 * - "remove all from box" - removes all items from container
 * - "remove all but X from box" - removes all except specified items
 * - "remove X and Y from box" - removes multiple specified items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import {
  TraitType,
  OpenableBehavior,
  ContainerBehavior,
  SupporterBehavior,
  ActorBehavior,
  IRemoveItemResult,
  IRemoveItemFromSupporterResult,
  ITakeItemResult,
  IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { RemovingEventMap } from './removing-events';
import { RemovingMessages } from './removing-messages';

// Import types
import { getRemovingSharedData, RemovingSharedData, RemovingItemResult } from './removing-types';

// Import multi-object helpers
import { isMultiObjectCommand, getExcludedNames } from '../../../helpers/multi-object-handler';

// ============================================================================
// Helper Functions (standalone to avoid `this` issues in object literal)
// ============================================================================

/**
 * Check if an entity is portable (can be taken)
 */
function isPortable(entity: IFEntity): boolean {
  if (entity.has(TraitType.ROOM)) return false;
  if (entity.has(TraitType.SCENERY)) return false;
  if (entity.has(TraitType.ACTOR)) return false;
  return true;
}

/**
 * Get entities from source container/supporter for "remove all from X"
 */
function getSourceContents(context: ActionContext, source: IFEntity): IFEntity[] {
  const contents = context.world.getContents(source.id);
  return contents.filter(e => isPortable(e));
}

/**
 * Validate removing a single entity from source
 */
function validateSingleEntity(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity
): ValidationResult {
  const actor = context.player;

  // Check if player already has the item
  if (ActorBehavior.isHolding(actor, item.id, context.world)) {
    return {
      valid: false,
      error: RemovingMessages.ALREADY_HAVE,
      params: { item: item.name }
    };
  }

  // Check if the item is actually in/on the source
  const itemLocation = context.world.getLocation(item.id);
  if (!itemLocation || itemLocation !== source.id) {
    if (source.has(TraitType.CONTAINER)) {
      return {
        valid: false,
        error: RemovingMessages.NOT_IN_CONTAINER,
        params: {
          item: item.name,
          container: source.name
        }
      };
    } else if (source.has(TraitType.SUPPORTER)) {
      return {
        valid: false,
        error: RemovingMessages.NOT_ON_SURFACE,
        params: {
          item: item.name,
          surface: source.name
        }
      };
    } else {
      return {
        valid: false,
        error: RemovingMessages.NOT_IN_CONTAINER,
        params: {
          item: item.name,
          container: source.name
        }
      };
    }
  }

  // Container-specific checks using behavior
  if (source.has(TraitType.CONTAINER)) {
    // Check if container is open
    if (source.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(source)) {
      return {
        valid: false,
        error: RemovingMessages.CONTAINER_CLOSED,
        params: { container: source.name }
      };
    }
  }

  // Use ActorBehavior to validate taking capacity
  if (!ActorBehavior.canTakeItem(actor, item, context.world)) {
    return {
      valid: false,
      error: RemovingMessages.CANNOT_TAKE,
      params: { item: item.name }
    };
  }

  return { valid: true };
}

/**
 * Validate a multi-object command (remove all from box, remove X and Y from box)
 */
function validateMultiObject(context: ActionContext): ValidationResult {
  const source = context.command.indirectObject?.entity;

  // Must have a source
  if (!source) {
    return { valid: false, error: RemovingMessages.NO_SOURCE };
  }

  // Container must be open if it's openable
  if (source.has(TraitType.CONTAINER) && source.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(source)) {
    return {
      valid: false,
      error: RemovingMessages.CONTAINER_CLOSED,
      params: { container: source.name }
    };
  }

  // Get items from source - for "remove all from X" we need contents of X
  const directObject = context.command.parsed.structure.directObject;
  let items: IFEntity[];

  if (directObject?.isAll) {
    // "remove all from X" - get all contents of source
    items = getSourceContents(context, source);

    // Apply exclusions from "all but X"
    const excludedNames = getExcludedNames(context);
    if (excludedNames.length > 0) {
      items = items.filter(e => {
        const name = e.name.toLowerCase();
        return !excludedNames.includes(name);
      });
    }
  } else if (directObject?.isList && directObject.items) {
    // "remove X and Y from Z" - resolve each item from source contents
    const sourceContents = getSourceContents(context, source);
    items = [];
    for (const np of directObject.items) {
      const searchTerm = (np.head || np.text).toLowerCase();
      const match = sourceContents.find(e => e.name.toLowerCase() === searchTerm);
      if (match) {
        items.push(match);
      }
    }
  } else {
    items = [];
  }

  if (items.length === 0) {
    return { valid: false, error: RemovingMessages.NOTHING_TO_REMOVE };
  }

  // Validate each entity, store results
  const results: RemovingItemResult[] = items.map(item => {
    const validation = validateSingleEntity(context, item, source);
    return {
      entity: item,
      success: validation.valid,
      error: validation.valid ? undefined : validation.error,
      errorParams: validation.valid ? undefined : validation.params
    };
  });

  // Store results for execute/report phases
  const sharedData = getRemovingSharedData(context);
  sharedData.multiObjectResults = results;

  // Valid if at least one can be removed
  const anySuccess = results.some(r => r.success);
  if (!anySuccess) {
    // All failed - return the first error
    return { valid: false, error: results[0].error, params: results[0].errorParams };
  }

  return { valid: true };
}

/**
 * Execute removing a single entity from source
 */
function executeSingleEntity(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  result: RemovingItemResult
): void {
  const actor = context.player;

  // First remove from source using appropriate behavior
  let removeResult: IRemoveItemResult | IRemoveItemFromSupporterResult | null = null;

  if (source.has(TraitType.CONTAINER)) {
    removeResult = ContainerBehavior.removeItem(source, item, context.world);
  } else if (source.has(TraitType.SUPPORTER)) {
    removeResult = SupporterBehavior.removeItem(source, item, context.world);
  }

  result.removeResult = removeResult;

  // Then take the item using ActorBehavior
  const takeResult: ITakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
  result.takeResult = takeResult;
}

/**
 * Generate success events for removing a single entity
 */
function reportSingleSuccess(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  result: RemovingItemResult,
  events: ISemanticEvent[]
): void {
  const actor = context.player;

  // Build message params and determine message
  const params: Record<string, any> = {
    item: item.name
  };

  let messageId: string;
  if (source.has(TraitType.CONTAINER)) {
    params.container = source.name;
    messageId = RemovingMessages.REMOVED_FROM;
  } else {
    params.surface = source.name;
    messageId = RemovingMessages.REMOVED_FROM_SURFACE;
  }

  // Create the TAKEN event (same as taking action) for world model updates with snapshots
  const takenData: RemovingEventMap['if.event.taken'] = {
    item: item.name,
    fromLocation: source.id,
    container: source.name,
    fromContainer: source.has(TraitType.CONTAINER),
    fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER),
    // Add atomic event snapshots
    itemSnapshot: captureEntitySnapshot(item, context.world, true),
    actorSnapshot: captureEntitySnapshot(actor, context.world, false),
    sourceSnapshot: captureEntitySnapshot(source, context.world, source.has(TraitType.ROOM))
  } as RemovingEventMap['if.event.taken'] & { itemSnapshot?: any; actorSnapshot?: any; sourceSnapshot?: any };

  events.push(context.event('if.event.taken', takenData));

  // Create success message
  events.push(context.event('action.success', {
    actionId: context.action.id,
    messageId,
    params: params
  }));
}

/**
 * Generate blocked event for a single entity that couldn't be removed
 */
function reportSingleBlocked(
  context: ActionContext,
  item: IFEntity,
  source: IFEntity,
  error: string,
  errorParams: Record<string, unknown> | undefined,
  events: ISemanticEvent[]
): void {
  events.push(context.event('action.blocked', {
    actionId: context.action.id,
    messageId: error,
    params: { ...errorParams, item: item.name, source: source.name }
  }));
}

// ============================================================================
// Action Definition
// ============================================================================

export const removingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.REMOVING,
  requiredMessages: [
    'no_target',
    'no_source',
    'not_in_container',
    'not_on_surface',
    'container_closed',
    'removed_from',
    'removed_from_surface',
    'cant_reach',
    'already_have',
    'nothing_to_remove'
  ],
  group: 'object_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    // Check for multi-object command
    if (isMultiObjectCommand(context)) {
      return validateMultiObject(context);
    }

    // Single object validation
    const item = context.command.directObject?.entity;
    const source = context.command.indirectObject?.entity;

    // Validate we have an item
    if (!item) {
      return {
        valid: false,
        error: RemovingMessages.NO_TARGET,
        params: {}
      };
    }

    // Validate we have a source
    if (!source) {
      return {
        valid: false,
        error: RemovingMessages.NO_SOURCE,
        params: { item: item.name }
      };
    }

    return validateSingleEntity(context, item, source);
  },

  execute(context: ActionContext): void {
    const sharedData = getRemovingSharedData(context);
    const source = context.command.indirectObject!.entity!;

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      // Execute for each successful validation
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          executeSingleEntity(context, result.entity, source, result);
        }
      }
      return;
    }

    // Single object execution
    const actor = context.player;
    const item = context.command.directObject!.entity!;

    // First remove from source using appropriate behavior
    let removeResult: IRemoveItemResult | IRemoveItemFromSupporterResult | null = null;

    if (source.has(TraitType.CONTAINER)) {
      removeResult = ContainerBehavior.removeItem(source, item, context.world);
    } else if (source.has(TraitType.SUPPORTER)) {
      removeResult = SupporterBehavior.removeItem(source, item, context.world);
    }

    // Store results for report phase using sharedData
    sharedData.removeResult = removeResult;

    // Then take the item using ActorBehavior
    const takeResult: ITakeItemResult = ActorBehavior.takeItem(actor, item, context.world);
    sharedData.takeResult = takeResult;
  },

  /**
   * Report events after successful removing
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getRemovingSharedData(context);
    const source = context.command.indirectObject!.entity!;

    // Check for multi-object command
    if (sharedData.multiObjectResults) {
      const events: ISemanticEvent[] = [];
      // Generate events for each item (success and failure)
      for (const result of sharedData.multiObjectResults) {
        if (result.success) {
          reportSingleSuccess(context, result.entity, source, result, events);
        } else {
          reportSingleBlocked(context, result.entity, source, result.error!, result.errorParams, events);
        }
      }
      return events;
    }

    // Single object report
    const actor = context.player;
    const item = context.command.directObject!.entity!;
    const removeResult = sharedData.removeResult as IRemoveItemResult | IRemoveItemFromSupporterResult | null;
    const takeResult = sharedData.takeResult as ITakeItemResult;

    const events: ISemanticEvent[] = [];

    // Build message params and determine message
    const params: Record<string, any> = {
      item: item.name
    };

    let messageId: string;
    if (source.has(TraitType.CONTAINER)) {
      params.container = source.name;
      messageId = RemovingMessages.REMOVED_FROM;
    } else {
      params.surface = source.name;
      messageId = RemovingMessages.REMOVED_FROM_SURFACE;
    }

    // Create the TAKEN event (same as taking action) for world model updates with snapshots
    const takenData: RemovingEventMap['if.event.taken'] = {
      item: item.name,
      fromLocation: source.id,
      container: source.name,
      fromContainer: source.has(TraitType.CONTAINER),
      fromSupporter: source.has(TraitType.SUPPORTER) && !source.has(TraitType.CONTAINER),
      // Add atomic event snapshots
      itemSnapshot: captureEntitySnapshot(item, context.world, true),
      actorSnapshot: captureEntitySnapshot(actor, context.world, false),
      sourceSnapshot: captureEntitySnapshot(source, context.world, source.has(TraitType.ROOM))
    } as RemovingEventMap['if.event.taken'] & { itemSnapshot?: any; actorSnapshot?: any; sourceSnapshot?: any };

    events.push(context.event('if.event.taken', takenData));

    // Create success message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: params
    }));

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const item = context.command.directObject?.entity;
    const source = context.command.indirectObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        item: item?.name,
        source: source?.name
      }
    })];
  }
};
