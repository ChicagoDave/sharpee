/**
 * Movement event handlers
 * 
 * These handlers apply movement-related events to the world model
 */

import { SemanticEvent } from '@sharpee/core';
import { EventHandler } from '../types';
import { WorldModel, IFEntity, IFEvents, TraitType, WearableTrait, RoomTrait } from '@sharpee/world-model';

/**
 * Handle TAKEN event - move item to actor
 */
export const handleTaken: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { actor, target } = event.entities;
  if (actor && target) {
    // Remove worn status if applicable
    const targetEntity = world.getEntity(target);
    if (targetEntity && targetEntity.has(TraitType.WEARABLE)) {
      // Remove worn status if wearable
      world.updateEntity(target, (entity: IFEntity) => {
        const wearableTrait = entity.get(TraitType.WEARABLE) as WearableTrait;
        if (wearableTrait?.worn) {
          wearableTrait.worn = false;
        }
      });
    }
    
    // Move the item to the actor
    world.moveEntity(target, actor);
  }
};

/**
 * Handle DROPPED event - move item to location
 */
export const handleDropped: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { actor, target, location } = event.entities;
  const dropLocation = location || (actor ? world.getLocation(actor) : undefined);
  
  if (target && dropLocation) {
    world.moveEntity(target, dropLocation);
  }
};

/**
 * Handle REMOVED event - remove worn status
 */
export const handleRemoved: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target } = event.entities;
  if (target) {
    const entity = world.getEntity(target);
    if (entity && entity.has(TraitType.WEARABLE)) {
      // Remove worn status
      world.updateEntity(target, (entity: IFEntity) => {
        const wearableTrait = entity.get(TraitType.WEARABLE) as WearableTrait;
        if (wearableTrait?.worn) {
          wearableTrait.worn = false;
        }
      });
    }
  }
};

/**
 * Handle ACTOR_MOVED event - move actor to new location
 */
export const handleActorMoved: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { actor, location } = event.entities;
  if (actor && location) {
    // Mark previous location as visited if it's a room
    const currentLocation = world.getLocation(actor);
    if (currentLocation) {
      const currentRoom = world.getEntity(currentLocation);
      if (currentRoom && currentRoom.has(TraitType.ROOM)) {
        // Mark as visited
        world.updateEntity(currentLocation, (room: IFEntity) => {
          const roomTrait = room.get(TraitType.ROOM) as RoomTrait;
          if (roomTrait && !roomTrait.visited) {
            roomTrait.visited = true;
          }
        });
      }
    }
    
    // Move the actor
    world.moveEntity(actor, location);
    
    // Mark new location as visited if it's a room
    const newRoom = world.getEntity(location);
    if (newRoom && newRoom.has(TraitType.ROOM)) {
      // Mark new location as visited
      world.updateEntity(location, (room: IFEntity) => {
        const roomTrait = room.get(TraitType.ROOM) as RoomTrait;
        if (roomTrait && !roomTrait.visited) {
          roomTrait.visited = true;
        }
      });
    }
  }
};

/**
 * Handle PUT_IN event - move item into container
 */
export const handlePutIn: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target, location } = event.entities;
  if (target && location) {
    world.moveEntity(target, location);
  }
};

/**
 * Handle PUT_ON event - move item onto supporter
 */
export const handlePutOn: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { target, location } = event.entities;
  if (target && location) {
    world.moveEntity(target, location);
  }
};

/**
 * Handle REMOVED_FROM event - move item from container to actor
 */
export const handleRemovedFrom: EventHandler = (event: SemanticEvent, world: WorldModel) => {
  const { actor, target } = event.entities;
  if (actor && target) {
    world.moveEntity(target, actor);
  }
};

/**
 * Register all movement handlers
 */
export function registerMovementHandlers(world: WorldModel): void {
  world.registerEventHandler(IFEvents.TAKEN, handleTaken);
  world.registerEventHandler(IFEvents.DROPPED, handleDropped);
  world.registerEventHandler(IFEvents.REMOVED, handleRemoved);
  world.registerEventHandler(IFEvents.ACTOR_MOVED, handleActorMoved);
  world.registerEventHandler(IFEvents.PUT_IN, handlePutIn);
  world.registerEventHandler(IFEvents.PUT_ON, handlePutOn);
  world.registerEventHandler(IFEvents.REMOVED_FROM, handleRemovedFrom);
}