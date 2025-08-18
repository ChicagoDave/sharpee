/**
 * Movement event handlers
 * 
 * These handlers apply movement-related events to the world model
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IFEntity, TraitType, WearableTrait, RoomTrait, EventHandler } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';

/**
 * Handle TAKEN event - move item to actor
 */
export const handleTaken: EventHandler = (event: ISemanticEvent, world: any) => {
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
export const handleDropped: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, target, location } = event.entities;
  const dropLocation = location || (actor ? world.getLocation(actor) : undefined);
  
  if (target && dropLocation) {
    world.moveEntity(target, dropLocation);
  }
};

/**
 * Handle REMOVED event - remove worn status
 */
export const handleRemoved: EventHandler = (event: ISemanticEvent, world: any) => {
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
export const handleActorMoved: EventHandler = (event: ISemanticEvent, world: any) => {
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
export const handlePutIn: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target, location } = event.entities;
  if (target && location) {
    world.moveEntity(target, location);
  }
};

/**
 * Handle PUT_ON event - move item onto supporter
 */
export const handlePutOn: EventHandler = (event: ISemanticEvent, world: any) => {
  const { target, location } = event.entities;
  if (target && location) {
    world.moveEntity(target, location);
  }
};

/**
 * Handle REMOVED_FROM event - move item from container to actor
 */
export const handleRemovedFrom: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, target } = event.entities;
  if (actor && target) {
    world.moveEntity(target, actor);
  }
};

/**
 * Handle ENTERED event - actor enters an object or vehicle
 */
export const handleEntered: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, target, location } = event.entities;
  if (actor && location) {
    // Update the entry trait occupants if present
    const targetEntity = world.getEntity(target || location);
    if (targetEntity && targetEntity.has(TraitType.ENTRY)) {
      world.updateEntity(targetEntity.id, (entity: IFEntity) => {
        const entryTrait = entity.get(TraitType.ENTRY) as any;
        if (entryTrait && entryTrait.occupants) {
          if (!entryTrait.occupants.includes(actor)) {
            entryTrait.occupants.push(actor);
          }
        }
      });
    }
    
    // Move the actor to the new location
    world.moveEntity(actor, location);
  }
};

/**
 * Handle EXITED event - actor exits an object or vehicle
 */
export const handleExited: EventHandler = (event: ISemanticEvent, world: any) => {
  const { actor, location } = event.entities;
  const fromLocation = event.data?.fromLocation as string;
  
  if (actor && location) {
    // Update the entry trait occupants if present
    if (fromLocation) {
      const previousContainer = world.getEntity(fromLocation);
      if (previousContainer && previousContainer.has(TraitType.ENTRY)) {
        world.updateEntity(fromLocation, (entity: IFEntity) => {
          const entryTrait = entity.get(TraitType.ENTRY) as any;
          if (entryTrait && entryTrait.occupants) {
            entryTrait.occupants = entryTrait.occupants.filter((id: string) => id !== actor);
          }
        });
      }
    }
    
    // Move the actor to the new location
    world.moveEntity(actor, location);
  }
};

/**
 * Handle CLIMBED event - record climbing action (movement handled separately)
 */
export const handleClimbed: EventHandler = (event: ISemanticEvent, world: any) => {
  // This event is mainly for tracking/logging purposes
  // The actual movement is handled by ENTERED or ACTOR_MOVED events
  // Could be used for achievements, scoring, or special effects
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
  world.registerEventHandler(IFEvents.ENTERED, handleEntered);
  world.registerEventHandler(IFEvents.EXITED, handleExited);
  world.registerEventHandler(IFEvents.CLIMBED, handleClimbed);
}