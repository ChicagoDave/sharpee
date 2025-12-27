/**
 * Taking action - picks up objects
 *
 * Uses four-phase pattern:
 * 1. validate: Check object can be taken (not scenery, not self, etc.)
 * 2. execute: Transfer the item to actor's inventory
 * 3. report: Generate success events with item and container snapshots
 * 4. blocked: Generate error events when validation fails
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SceneryBehavior, ActorBehavior, WearableBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';
import { TakingMessages } from './taking-messages';

// Import type guards and typed interfaces
import { 
  isWearableTrait, 
  isContainerTrait, 
  hasCapacityLimit,
  getTakingSharedData, 
  setTakingSharedData,
  TakingSharedData 
} from './taking-types';

// Import our data builder
import { takenDataConfig } from './taking-data';

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
    'taken_from'
  ],
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const noun = context.command.directObject?.entity;

    // Validate we have a target
    if (!noun) {
      return { valid: false, error: TakingMessages.NO_TARGET };
    }

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
  },
  
  execute(context: ActionContext): void {
    const actor = context.player;
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Get typed shared data
    const sharedData = getTakingSharedData(context);
    
    // Capture context BEFORE any mutations
    const previousLocation = context.world.getLocation(noun.id);
    setTakingSharedData(context, { previousLocation });
    
    // Check if item is worn and needs to be removed first
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (isWearableTrait(wearableTrait) && (wearableTrait.isWorn || (wearableTrait as any).worn)) {
        // Mark that we implicitly removed a worn item
        setTakingSharedData(context, {
          implicitlyRemoved: true,
          wasWorn: true
        });
        
        // Get the wearer (the one who has the item currently)
        const wearer = previousLocation ? context.world.getEntity(previousLocation) : null;
        // Remove the worn status
        if (wearer) {
          WearableBehavior.remove(noun, wearer);
          // The witness system will track this implicit removal
        }
      }
    }
    
    // Perform the actual move
    // The witness system will track where it moved from
    context.world.moveEntity(noun.id, actor.id);
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - validation passed, execute succeeded
    const actor = context.player;
    const noun = context.command.directObject!.entity!;
    const events: ISemanticEvent[] = [];

    // Get typed shared data
    const sharedData = getTakingSharedData(context);

    // Check if we implicitly removed a worn item
    if (sharedData.implicitlyRemoved) {
      const previousLocation = sharedData.previousLocation;
      const container = previousLocation ? context.world.getEntity(previousLocation) : null;

      events.push(context.event('if.event.removed', {
        implicit: true,
        item: noun.name,
        container: container?.name
      }));
    }

    // Build the taken event data using data builder
    const takenData = buildEventData(takenDataConfig, context);

    // Add the taken event
    events.push(context.event('if.event.taken', takenData));

    // Determine success message based on where it was taken from
    const previousLocation = sharedData.previousLocation;
    const isFromContainerOrSupporter = previousLocation &&
      previousLocation !== context.world.getLocation(actor.id);
    const messageId = isFromContainerOrSupporter ? TakingMessages.TAKEN_FROM : TakingMessages.TAKEN;

    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: takenData
    }));

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
