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
import { buildEventData } from '../../data-builder-types';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

// Import our data builder
import { droppedDataConfig, determineDroppingMessage } from './dropping-data';
// Import sub-action
import { drop } from './sub-actions/drop';

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
      return { 
        valid: false, 
        error: 'not_held',
        params: { item: (noun.get(TraitType.IDENTITY) as any)?.name || noun.attributes?.name || noun.id }
      };
    }

    // Check if the item is worn
    if (noun.has(TraitType.WEARABLE) && WearableBehavior.isWorn(noun)) {
      return { 
        valid: false, 
        error: 'still_worn',
        params: { item: (noun.get(TraitType.IDENTITY) as any)?.name || noun.attributes?.name || noun.id }
      };
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
            return { 
              valid: false, 
              error: 'container_full',
              params: { 
                item: (noun.get(TraitType.IDENTITY) as any)?.name || noun.attributes?.name || noun.id,
                container: (dropLocation.get(TraitType.IDENTITY) as any)?.name || dropLocation.attributes?.name || dropLocation.id
              }
            };
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

    // Use the drop sub-action for the core logic
    const result = drop(actor, noun, context.world);
    
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
          reason: validationResult.error || 'validation_failed',
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
    const result = (context as any)._dropResult;
    
    // Handle failure cases
    if (!result || !result.success) {
      // Generic failure (shouldn't happen since validation passed)
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_drop',
        reason: 'cant_drop',
        params: { item: noun.name }
      })];
    }

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

  group: "object_manipulation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.CARRIED
  }
};
