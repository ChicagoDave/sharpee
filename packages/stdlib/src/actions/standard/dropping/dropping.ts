/**
 * Dropping action - puts down held objects
 *
 * Uses four-phase pattern:
 * 1. validate: Check object can be dropped
 * 2. execute: Transfer the item from inventory to location
 * 3. report: Generate success events
 * 4. blocked: Generate error events when validation fails
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, ContainerBehavior, WearableBehavior, ActorBehavior, IDropItemResult } from '@sharpee/world-model';
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { DroppingMessages } from './dropping-messages';

// Import our data builder
import { droppedDataConfig, determineDroppingMessage } from './dropping-data';

/**
 * Shared data passed between execute and report phases
 */
interface DroppingSharedData {
  dropResult?: IDropItemResult;
}

function getDroppingSharedData(context: ActionContext): DroppingSharedData {
  return context.sharedData as DroppingSharedData;
}

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
    'dropped_carelessly'
  ],

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const noun = context.command.directObject?.entity;

    if (!noun) {
      return { valid: false, error: DroppingMessages.NO_TARGET };
    }

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
    const playerLocation = context.world.getLocation(actor.id);
    const dropLocation = playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;

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
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const noun = context.command.directObject?.entity!;

    // Delegate to ActorBehavior for dropping logic
    const result: IDropItemResult = ActorBehavior.dropItem(actor, noun, context.world);

    // Store result for report phase using sharedData
    const sharedData = getDroppingSharedData(context);
    sharedData.dropResult = result;
  },

  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success
    // Build event data using data builder
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

  group: "object_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
