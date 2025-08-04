/**
 * Taking action - picks up objects
 * 
 * This action validates all conditions for taking an object and returns
 * appropriate events. It NEVER mutates state directly.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, ActionContext } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_target',
        reason: 'no_target'
      })];
    }
    
    // Business logic checks
    // (Scope validation is now handled by CommandValidator)
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_take_self',
        reason: 'cant_take_self'
      })];
    }
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'already_have',
        reason: 'already_have',
        params: { item: noun.name }
      })];
    }
    
    // Can't take rooms (business rule)
    if (noun.has(TraitType.ROOM)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_take_room',
        reason: 'cant_take_room',
        params: { item: noun.name }
      })];
    }
    
    // Can't take scenery (business rule - fixed in place)
    if (noun.has(TraitType.SCENERY)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'fixed_in_place',
        reason: 'fixed_in_place',
        params: { item: noun.name }
      })];
    }
    
    // Check container capacity if actor has container trait
    if (actor.has(TraitType.CONTAINER)) {
      const containerTrait = actor.get(TraitType.CONTAINER);
      
      if (containerTrait && (containerTrait as any).capacity) {
        const currentContents = context.world.getContents(actor.id);
        
        // Count items (excluding worn items)
        let itemCount = currentContents.length;
        // Filter out worn items
        itemCount = currentContents.filter(item => {
          if (item.has(TraitType.WEARABLE)) {
            const wearableTrait = item.get(TraitType.WEARABLE);
            return !wearableTrait || !(wearableTrait as any).worn;
          }
          return true;
        }).length;
        
        const maxItems = (containerTrait as any).capacity.maxItems;
        if (maxItems !== undefined && itemCount >= maxItems) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'container_full',
        reason: 'container_full'
      })];
        }
      }
      
      // Check weight capacity if actor has inventory limits
      if (actor.has(TraitType.ACTOR)) {
        const actorTrait = actor.get(TraitType.ACTOR);
        if (actorTrait && (actorTrait as any).inventoryLimit?.maxWeight !== undefined) {
          const currentWeight = context.world.getTotalWeight(actor.id);
          const itemWeight = context.world.getTotalWeight(noun.id);
          
          if (currentWeight + itemWeight > (actorTrait as any).inventoryLimit.maxWeight) {
            return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'too_heavy',
        reason: 'too_heavy',
        params: { item: noun.name }
      })];
          }
        }
      }
    }
    
    const events: SemanticEvent[] = [];
    
    // If the item is worn, we need to remove it first
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (wearableTrait && (wearableTrait as any).worn) {
        // Add a REMOVED event that will happen before TAKEN
        const removedData: RemovedEventData = {
          implicit: true,  // This removal is implicit, part of taking
          item: noun.name
        };
        events.push(context.event('if.event.removed', removedData));
      }
    }
    
    // Build the typed event data
    const takenData: TakenEventData = {
      item: noun.name
    };
    
    // Add information about where it was taken from
    if (currentLocation) {
      const fromEntity = context.world.getEntity(currentLocation);
      if (fromEntity && fromEntity.id !== context.currentLocation.id) {
        // Item was in a container/supporter, not just lying in the room
        takenData.container = fromEntity.name;
        takenData.fromLocation = currentLocation;
        
        if (fromEntity.has(TraitType.CONTAINER)) {
          takenData.fromContainer = true;
        } else if (fromEntity.has(TraitType.SUPPORTER)) {
          takenData.fromSupporter = true;
        }
      }
    }
    
    // Add the actual TAKEN event for world model updates
    events.push(context.event('if.event.taken', takenData));
    
    // Create the success message event
    const messageId = takenData.container ? 'taken_from' : 'taken';
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: takenData
      }));
    
    return events;
  },
  
  group: "object_manipulation"
};
