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
import { buildEventData } from '../../data-builder-types';

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
    
    // Check if already holding the item
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return {
        valid: false,
        error: 'already_have',
        params: { item: noun.name }
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
    
    // Store the previous location before moving
    const previousLocation = context.world.getLocation(noun.id);
    (context as any)._previousLocation = previousLocation;
    
    // Check if item is worn and needs to be removed first
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE) as any;
      if (wearableTrait?.worn) {
        // Mark that we implicitly removed it
        (context as any)._implicitlyRemoved = true;
        // Get the wearer (the one who has the item currently)
        const wearer = previousLocation ? context.world.getEntity(previousLocation) : null;
        // Remove the worn status
        if (wearer) {
          WearableBehavior.remove(noun, wearer);
        }
      }
    }
    
    // ActorBehavior.takeItem only validates, doesn't actually move
    // We need to perform the actual move
    context.world.moveEntity(noun.id, actor.id);
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
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
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
    
    // Check if we implicitly removed a worn item
    if ((context as any)._implicitlyRemoved) {
      const previousLocation = (context as any)._previousLocation;
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
    const previousLocation = (context as any)._previousLocation;
    const isFromContainerOrSupporter = previousLocation && 
      previousLocation !== context.world.getLocation(actor.id);
    const messageId = isFromContainerOrSupporter ? 'taken_from' : 'taken';
    
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
