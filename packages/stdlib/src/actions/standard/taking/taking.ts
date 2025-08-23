/**
 * Taking action - picks up objects
 * 
 * Uses three-phase pattern:
 * 1. validate: Check object can be taken (not scenery, not self, etc.)
 * 2. execute: Transfer the item to actor's inventory
 * 3. report: Generate events with item and container snapshots
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SceneryBehavior, ActorBehavior, ContainerBehavior, WearableBehavior, ITakeItemResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot } from '../../base/snapshot-utils';

// Import our typed event data
import { TakenEventData, TakingErrorData, RemovedEventData } from './taking-events';

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
      return {
        valid: false,
        error: 'no_target'
      };
    }
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return {
        valid: false,
        error: 'cant_take_self'
      };
    }
    
    // Can't take rooms (business rule)
    if (noun.has(TraitType.ROOM)) {
      return {
        valid: false,
        error: 'cant_take_room',
        params: { item: noun.name }
      };
    }
    
    // Can't take scenery (fixed in place)
    if (noun.has(TraitType.SCENERY)) {
      const customMessage = SceneryBehavior.getCantTakeMessage(noun);
      return {
        valid: false,
        error: customMessage || 'fixed_in_place',
        params: { item: noun.name }
      };
    }
    
    // Use ActorBehavior to validate capacity constraints
    if (!ActorBehavior.canTakeItem(actor, noun, context.world)) {
      // Check if it's a container capacity issue
      if (actor.has(TraitType.CONTAINER)) {
        const containerTrait = actor.get(TraitType.CONTAINER) as any;
        if (containerTrait?.capacity?.maxItems !== undefined) {
          const contents = context.world.getContents(actor.id);
          const currentCount = contents.filter((item: any) => {
            return !item.has || !item.has(TraitType.WEARABLE) || 
                   !(item.get(TraitType.WEARABLE) as any)?.worn;
          }).length;
          if (currentCount >= containerTrait.capacity.maxItems) {
            return {
              valid: false,
              error: 'container_full'
            };
          }
        }
      }
      
      // Otherwise generic failure
      return {
        valid: false,
        error: 'cannot_take',
        params: { item: noun.name }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    const actor = context.player;
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Just perform the transfer - ActorBehavior.takeItem handles the mutation
    ActorBehavior.takeItem(actor, noun, context.world);
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: validationResult.params || {}
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
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Capture snapshots after the mutation
    const itemSnapshot = captureEntitySnapshot(noun, context.world, true);
    const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
    
    // Check current state after mutation
    const currentLocation = context.world.getLocation(noun.id);
    const isNowHeld = currentLocation === actor.id;
    
    // If not held after execute, something went wrong (shouldn't happen since validate passed)
    if (!isNowHeld) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_take',
        reason: 'cant_take',
        params: { item: noun.name }
      })];
    }
    
    // Taking succeeded - build events
    const events: ISemanticEvent[] = [];
    
    // Build the taken event data with both new and backward-compatible fields
    const takenData: TakenEventData = {
      // New atomic structure
      itemSnapshot: itemSnapshot,
      actorSnapshot: actorSnapshot,
      // Backward compatibility
      item: noun.name
    };
    
    // Try to determine where item was taken from
    // Look through all entities to find previous container
    const allEntities = context.world.getAllEntities();
    let fromContainer: string | undefined;
    
    // Check if item was in a container/supporter before
    for (const entity of allEntities) {
      if (entity.id === actor.id) continue; // Skip the actor
      if (entity.has(TraitType.CONTAINER) || entity.has(TraitType.SUPPORTER)) {
        // This is a potential previous container
        // We can't know for sure since the item has already moved
        // In a real implementation, we'd track this in execute()
      }
    }
    
    // Add the taken event
    events.push(context.event('if.event.taken', takenData));
    
    // Determine success message
    const messageId = 'taken';
    
    // Add success event
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params: takenData
    }));
    
    return events;
  },
  
  group: "object_manipulation"
};
