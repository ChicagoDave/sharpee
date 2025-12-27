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
  ITakeItemResult
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { buildEventData } from '../../data-builder-types';
import { removedDataConfig } from './removing-data';
import { ScopeLevel } from '../../../scope';
import { RemovingEventMap } from './removing-events';
import { RemovingMessages } from './removing-messages';

/**
 * Shared data passed between execute and report phases
 */
interface RemovingSharedData {
  removeResult?: IRemoveItemResult | IRemoveItemFromSupporterResult | null;
  takeResult?: ITakeItemResult;
}

function getRemovingSharedData(context: ActionContext): RemovingSharedData {
  return context.sharedData as RemovingSharedData;
}

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
    'already_have'
  ],
  group: 'object_manipulation',

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
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
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const source = context.command.indirectObject?.entity!;

    // First remove from source using appropriate behavior
    let removeResult: IRemoveItemResult | IRemoveItemFromSupporterResult | null = null;

    if (source.has(TraitType.CONTAINER)) {
      removeResult = ContainerBehavior.removeItem(source, item, context.world);
    } else if (source.has(TraitType.SUPPORTER)) {
      removeResult = SupporterBehavior.removeItem(source, item, context.world);
    }

    // Store results for report phase using sharedData
    const sharedData = getRemovingSharedData(context);
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
    const actor = context.player;
    const item = context.command.directObject?.entity!;
    const source = context.command.indirectObject?.entity!;
    const sharedData = getRemovingSharedData(context);
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
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: true,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
