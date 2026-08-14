/**
 * Taking action with message key support
 * 
 * This is an example of how to update actions to use message keys
 * instead of raw reason strings.
 */

import { ActionExecutor, ActionContext, createEvent, SemanticEvent, ValidatedCommand } from '../../core';
import { IFActions } from '../../core/constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';
// TODO: This action demonstrates how to use message keys from stdlib
// but we can't import from stdlib due to circular dependencies.
// Consider moving this example to stdlib or creating a separate package for examples.

export const takingActionWithMessages: ActionExecutor = {
  id: IFActions.TAKING,
  aliases: ['take', 'get', 'pick up', 'grab'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = command.directObject?.entity as IFEntity | undefined;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'no_target',
        messageKey: 'CANT_SEE_THAT' // TODO: Use ActionMessages.CANT_SEE_THAT when available
      }, { actor: actor.id })];
    }
    
    // Can't take yourself
    if (noun.id === actor.id) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'cant_take_self',
        messageKey: 'CANT_TAKE_THAT'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Check if already held
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation === actor.id) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'already_have',
        messageKey: 'ALREADY_CARRYING'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Can't take rooms
    if (noun.has(TraitType.ROOM)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'cant_take_room',
        messageKey: 'CANT_TAKE_THAT'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Can't take scenery (fixed in place)
    if (noun.has(TraitType.SCENERY)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'fixed_in_place',
        messageKey: 'CANT_TAKE_THAT'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Check if visible
    if (!context.canSee(noun)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'not_visible',
        messageKey: 'CANT_SEE_THAT'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Check if reachable
    if (!context.canReach(noun)) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.TAKING,
        reason: 'not_reachable',
        messageKey: 'CANT_TAKE_THAT'
      }, { actor: actor.id, target: noun.id })];
    }
    
    // Check container capacity if actor has container trait
    if (actor.has(TraitType.CONTAINER)) {
      const containerTrait = actor.get(TraitType.CONTAINER);
      
      if (containerTrait && (containerTrait as any).capacity) {
        const currentContents = context.world.getContents(actor.id);
        
        // Count items (excluding worn items)
        let itemCount = currentContents.filter(item => {
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
            reason: 'container_full',
            messageKey: 'ALREADY_CARRYING' // TODO: Use INVENTORY_FULL when available
          }, { actor: actor.id, target: noun.id })];
        }
      }
    }
    
    const events: SemanticEvent[] = [];
    
    // If the item is worn, we need to remove it first
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (wearableTrait && (wearableTrait as any).worn) {
        // Add a REMOVED event that will happen before TAKEN
        const removedEvent = createEvent(IFEvents.REMOVED, {
          implicit: true  // This removal is implicit, part of taking
        }, {
          actor: actor.id,
          target: noun.id
        });
        events.push(removedEvent);
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
    
    // Create the main TAKEN event with message key in data
    const takenEvent = createEvent(IFEvents.TAKEN, {
      ...eventData,
      messageKey: 'TAKEN' // TODO: Use ActionMessages.TAKEN when available
    }, {
      actor: actor.id,
      target: noun.id
    });
    
    events.push(takenEvent);
    
    return events;
  }
};
