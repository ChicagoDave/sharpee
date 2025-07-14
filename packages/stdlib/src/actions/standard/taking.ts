/**
 * Taking action - picks up objects
 * 
 * This action validates all conditions for taking an object and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { Action, EnhancedActionContext } from '../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../constants';

export const takingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return context.emitError('no_target');
    }
    
    // Business logic checks only - visibility/reachability already validated
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return context.emitError('cant_take_self');
    }
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return context.emitError('already_have', { item: noun.name });
    }
    
    // Can't take rooms (business rule)
    if (noun.has(TraitType.ROOM)) {
      return context.emitError('cant_take_room', { item: noun.name });
    }
    
    // Can't take scenery (business rule - fixed in place)
    if (noun.has(TraitType.SCENERY)) {
      return context.emitError('fixed_in_place', { item: noun.name });
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
          return context.emitError('container_full');
        }
      }
      
      // Check weight capacity if actor has inventory limits
      if (actor.has(TraitType.ACTOR)) {
        const actorTrait = actor.get(TraitType.ACTOR);
        if (actorTrait && (actorTrait as any).inventoryLimit?.maxWeight !== undefined) {
          const currentWeight = context.world.getTotalWeight(actor.id);
          const itemWeight = context.world.getTotalWeight(noun.id);
          
          if (currentWeight + itemWeight > (actorTrait as any).inventoryLimit.maxWeight) {
            return context.emitError('too_heavy', { item: noun.name });
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
        events.push(context.emit('if.event.removed', {
          implicit: true  // This removal is implicit, part of taking
        }));
      }
    }
    
    // Build the success data with contextual information
    const successData: Record<string, any> = {
      item: noun.name
    };
    
    // Add information about where it was taken from
    if (currentLocation) {
      const fromEntity = context.world.getEntity(currentLocation);
      if (fromEntity && fromEntity.id !== context.currentLocation.id) {
        // Item was in a container/supporter, not just lying in the room
        successData.container = fromEntity.name;
        successData.fromLocation = currentLocation;
        
        if (fromEntity.has(TraitType.CONTAINER)) {
          successData.fromContainer = true;
        } else if (fromEntity.has(TraitType.SUPPORTER)) {
          successData.fromSupporter = true;
        }
      }
    }
    
    // Create the main success event
    const messageId = successData.container ? 'taken_from' : 'taken';
    const successEvents = context.emitSuccess(messageId, successData);
    
    // Add the actual TAKEN event for world model updates
    events.push(context.emit('if.event.taken', {
      fromLocation: currentLocation,
      ...successData
    }));
    
    // Add the success message event
    events.push(...successEvents);
    
    return events;
  },
  
  group: "object_manipulation"
};
