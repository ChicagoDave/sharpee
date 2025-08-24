/**
 * Dropping action - puts down held objects
 * 
 * This action validates conditions for dropping an object and returns
 * appropriate events. It delegates validation to ContainerBehavior.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 * MIGRATED: To three-phase pattern (validate/execute/report) for atomic events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, IEntity } from '@sharpee/core';
import { TraitType, ContainerBehavior, SupporterBehavior, WearableBehavior, ActorBehavior, IDropItemResult } from '@sharpee/world-model';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

// Import our typed event data
import { DroppedEventData, DroppingErrorData } from './dropping-events';

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
      return { valid: false, error: 'no_target' };
    }

    // Use ActorBehavior to validate dropping
    if (!ActorBehavior.isHolding(actor, noun.id, context.world)) {
      return { valid: false, error: 'not_held' };
    }

    // Check if the item is worn
    if (noun.has(TraitType.WEARABLE) && WearableBehavior.isWorn(noun)) {
      return { valid: false, error: 'still_worn' };
    }

    // Get drop location
    const playerLocation = context.world.getLocation(actor.id);
    const dropLocation = playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;
    
    if (!dropLocation) {
      return { valid: false, error: 'cant_drop_here' };
    }

    // Check if location can accept the item (for containers)
    if (dropLocation.has(TraitType.CONTAINER) && !dropLocation.has(TraitType.ROOM)) {
      if (!ContainerBehavior.canAccept(dropLocation, noun, context.world)) {
        const containerTrait = dropLocation.get(TraitType.CONTAINER) as any;
        if (containerTrait.capacity?.maxItems !== undefined) {
          const contents = context.world.getContents(dropLocation.id);
          if (contents.length >= containerTrait.capacity.maxItems) {
            return { valid: false, error: 'container_full' };
          }
        }
        return { valid: false, error: 'cant_drop_here' };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const actor = context.player;
    const noun = context.command.directObject?.entity!;

    // Delegate to ActorBehavior for dropping logic
    const result: IDropItemResult = ActorBehavior.dropItem(actor, noun, context.world);
    
    // Store result for report phase
    (context as any)._dropResult = result;
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      // Capture entity data for validation errors
      const errorParams = { ...(validationResult.params || {}) };
      
      // Add entity snapshots if entities are available
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      if (context.command.indirectObject?.entity) {
        errorParams.indirectTargetSnapshot = captureEntitySnapshot(
          context.command.indirectObject.entity,
          context.world,
          false
        );
      }

      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    const actor = context.player;
    const noun = context.command.directObject?.entity!;
    const result = (context as any)._dropResult as IDropItemResult;
    
    // Handle failure cases
    if (!result.success) {
      if (result.notHeld) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'not_held',
          reason: 'not_held',
          params: { item: noun.name }
        })];
      }
      
      if (result.stillWorn) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'still_worn',
          reason: 'still_worn',
          params: { item: noun.name }
        })];
      }
      
      // Generic failure
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_drop',
        reason: 'cant_drop',
        params: { item: noun.name }
      })];
    }

    // Determine drop location for event data
    const playerLocation = context.world.getLocation(actor.id);
    const dropLocation = playerLocation ? context.world.getEntity(playerLocation) : context.currentLocation;
    
    if (!dropLocation) {
      throw new Error('No valid drop location found');
    }

    // Build typed event data with atomic snapshots
    const droppedData: DroppedEventData = {
      item: noun.id,
      itemName: noun.name,
      toLocation: dropLocation.id,
      toLocationName: dropLocation.name,
      // Add atomic event snapshots
      itemSnapshot: captureEntitySnapshot(noun, context.world, true),
      actorSnapshot: captureEntitySnapshot(actor, context.world, false),
      locationSnapshot: captureEntitySnapshot(dropLocation, context.world, dropLocation.has(TraitType.ROOM))
    };

    const params: Record<string, any> = {
      item: noun.name,
      location: dropLocation.name
    };

    let messageId = 'dropped';

    // Determine message based on drop location
    if (!dropLocation.has(TraitType.ROOM)) {
      // Dropping into a container or supporter
      if (dropLocation.has(TraitType.CONTAINER)) {
        droppedData.toContainer = true;
        messageId = 'dropped_in';
        params.container = dropLocation.name;
      } else if (dropLocation.has(TraitType.SUPPORTER)) {
        droppedData.toSupporter = true;
        messageId = 'dropped_on';
        params.supporter = dropLocation.name;
      }
    } else {
      droppedData.toRoom = true;

      // Vary the message based on how the item is dropped
      const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drop';
      if (verb === 'discard') {
        messageId = 'dropped_carelessly';
      } else if (noun.has(TraitType.IDENTITY)) {
        // Check if item name suggests it's fragile
        const identity = noun.get(TraitType.IDENTITY);
        if (identity && (identity as any).name?.toLowerCase().includes('glass')) {
          messageId = 'dropped_quietly';
        }
      }
    }

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

  group: "object_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
