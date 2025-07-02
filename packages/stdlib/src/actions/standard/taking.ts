/**
 * Taking action - picks up objects
 * 
 * This action validates all conditions for taking an object and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { ActionExecutor, ActionContext } from '../types';
import { createEvent, SemanticEvent } from '@sharpee/core';
import { ValidatedCommand } from '@sharpee/world-model';
import { IFActions } from '../constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';

export const takingAction: ActionExecutor = {
  id: IFActions.TAKING,
  aliases: ['take', 'get', 'pick up', 'grab'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = command.directObject?.entity as IFEntity | undefined;
    
    // Validate we have a target
    if (!noun) {
      // This should not happen with ValidatedCommand
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'no_target'
      }, {
        actor: actor.id
      })];
    }
    
    // Business logic checks only - visibility/reachability already validated
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'cant_take_self'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'already_have'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Can't take rooms (business rule)
    if (noun.has(TraitType.ROOM)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'cant_take_room'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Can't take scenery (business rule - fixed in place)
    if (noun.has(TraitType.SCENERY)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'fixed_in_place'
      }, {
        actor: actor.id,
        target: noun.id
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
          return [createEvent(IFEvents.ACTION_FAILED, {
            action: IFActions.TAKING,
            reason: 'container_full'
          }, {
            actor: actor.id,
            target: noun.id
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
            return [createEvent(IFEvents.ACTION_FAILED, {
              action: IFActions.TAKING,
              reason: 'too_heavy'
            }, {
              actor: actor.id,
              target: noun.id
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
        events.push(createEvent(IFEvents.REMOVED, {
          implicit: true  // This removal is implicit, part of taking
        }, {
          actor: actor.id,
          target: noun.id
        }));
      }
    }
    
    // Build the TAKEN event with contextual information
    const eventData: Record<string, unknown> = {};
    
    // Add information about where it was taken from
    if (currentLocation) {
      eventData.fromLocation = currentLocation;
      
      const fromEntity = context.world.getEntity(currentLocation);
      if (fromEntity) {
        if (fromEntity.has(TraitType.CONTAINER)) {
          eventData.fromContainer = true;
        } else if (fromEntity.has(TraitType.SUPPORTER)) {
          eventData.fromSupporter = true;
        } else if (fromEntity.has(TraitType.ROOM)) {
          eventData.fromRoom = true;
        }
      }
    }
    
    // Create the main TAKEN event
    events.push(createEvent(IFEvents.TAKEN, eventData, {
      actor: actor.id,
      target: noun.id
    }));
    
    return events;
  }
};
