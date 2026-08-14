/**
 * Dropping action - puts down held objects
 * 
 * This action validates conditions for dropping an object and returns
 * appropriate events. It NEVER mutates state directly.
 */

import { ActionExecutor, ActionContext, createEvent, SemanticEvent, ValidatedCommand } from '../core';
import { IFActions } from '../core/constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';

export const droppingAction: ActionExecutor = {
  id: IFActions.DROPPING,
  aliases: ['drop', 'put down', 'discard'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    const noun = command.directObject?.entity as IFEntity | undefined;
    
    // Validate we have a target
    if (!noun) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.DROPPING,
        reason: 'no_target'
      }, {
        actor: actor.id
      })];
    }
    
    // Check if held by actor
    const currentLocation = context.world.getLocation(noun.id);
    if (currentLocation !== actor.id) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.DROPPING,
        reason: 'not_held'
      }, {
        actor: actor.id,
        target: noun.id
      })];
    }
    
    // Check if the item is worn
    if (noun.has(TraitType.WEARABLE)) {
      const wearableTrait = noun.get(TraitType.WEARABLE);
      if (wearableTrait && (wearableTrait as any).worn) {
        return [createEvent(IFEvents.ACTION_FAILED, {
          action: IFActions.DROPPING,
          reason: 'still_worn'
        }, {
          actor: actor.id,
          target: noun.id
        })];
      }
    }
    
    // Check if the current location can accept items
    const dropLocation = context.currentLocation;
    
    // Rooms can always accept dropped items
    if (!dropLocation.has(TraitType.ROOM)) {
      // If we're in a container/supporter, check if it can accept items
      if (dropLocation.has(TraitType.CONTAINER)) {
        const containerTrait = dropLocation.get(TraitType.CONTAINER);
        
        // Check if container is open
        if (dropLocation.has(TraitType.OPENABLE)) {
          const openableTrait = dropLocation.get(TraitType.OPENABLE);
          if (openableTrait && !(openableTrait as any).isOpen) {
            return [createEvent(IFEvents.ACTION_FAILED, {
              action: IFActions.DROPPING,
              reason: 'container_not_open',
              container: dropLocation.id
            }, {
              actor: actor.id,
              target: noun.id
            })];
          }
        }
        
        // Check capacity
        if (containerTrait && (containerTrait as any).capacity) {
          const contents = context.world.getContents(dropLocation.id);
          const maxItems = (containerTrait as any).capacity.maxItems;
          if (maxItems !== undefined && contents.length >= maxItems) {
            return [createEvent(IFEvents.ACTION_FAILED, {
              action: IFActions.DROPPING,
              reason: 'container_full',
              container: dropLocation.id
            }, {
              actor: actor.id,
              target: noun.id
            })];
          }
        }
      }
    }
    
    // Build the DROPPED event with contextual information
    const eventData: Record<string, unknown> = {
      toLocation: dropLocation.id
    };
    
    if (dropLocation.has(TraitType.CONTAINER)) {
      eventData.toContainer = true;
    } else if (dropLocation.has(TraitType.SUPPORTER)) {
      eventData.toSupporter = true;
    } else if (dropLocation.has(TraitType.ROOM)) {
      eventData.toRoom = true;
    }
    
    // Create the DROPPED event
    return [createEvent(IFEvents.DROPPED, eventData, {
      actor: actor.id,
      target: noun.id,
      location: dropLocation.id
    })];
  }
};
