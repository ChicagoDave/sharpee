/**
 * Taking action - picks up objects
 * 
 * This action validates all conditions for taking an object and returns
 * appropriate events. It NEVER mutates state directly.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, SceneryBehavior, ActorBehavior, ContainerBehavior, WearableBehavior, ITakeItemResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope/types';

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
  
  execute(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    
    // Delegate to ActorBehavior for taking logic
    const result: ITakeItemResult = ActorBehavior.takeItem(actor, noun, context.world);
    
    // Handle failure cases
    if (!result.success) {
      if (result.alreadyHeld) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_have',
          reason: 'already_have',
          params: { item: noun.name }
        })];
      }
      
      if (result.tooHeavy) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'too_heavy',
          reason: 'too_heavy',
          params: { item: noun.name }
        })];
      }
      
      if (result.inventoryFull) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'container_full',
          reason: 'container_full'
        })];
      }
      
      // Generic failure
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_take',
        reason: 'cant_take',
        params: { item: noun.name }
      })];
    }
    
    // Taking succeeded - build events
    const events: ISemanticEvent[] = [];
    
    // If the item needs removal from a container first
    if (result.needsRemoval) {
      const removedData: RemovedEventData = {
        implicit: true,
        item: noun.name
      };
      events.push(context.event('if.event.removed', removedData));
    }
    
    // Build the taken event data
    const takenData: TakenEventData = {
      item: noun.name
    };
    
    // Add container information if taken from container/supporter (but not rooms)
    if (result.fromContainer) {
      const containerEntity = context.world.getEntity(result.fromContainer);
      
      // Only add container info if it's not a room
      if (containerEntity && !containerEntity.has(TraitType.ROOM)) {
        takenData.fromLocation = result.fromContainer;
        takenData.container = containerEntity.name;
        
        // Check if it's a supporter (has SUPPORTER trait)
        if (containerEntity.has(TraitType.SUPPORTER)) {
          takenData.fromSupporter = true;
        } else {
          takenData.fromContainer = true;
        }
      }
    }
    
    // Add the taken event
    events.push(context.event('if.event.taken', takenData));
    
    // Determine success message
    const messageId = result.fromContainer ? 'taken_from' : 'taken';
    
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
