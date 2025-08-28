/**
 * Drop sub-action - Core logic for dropping a held item
 * 
 * This sub-action focuses purely on the state mutation:
 * moving an entity from the actor's inventory to their current location.
 * 
 * Part of the sub-actions pattern (ADR-063) for simplified, reusable logic.
 */

import { IEntity } from '@sharpee/core';
import { IWorldModel } from '@sharpee/world-model';

export interface IDropResult {
  success: boolean;
  droppedTo?: string;
}

/**
 * Drop an item from actor's inventory to their location
 * 
 * @param actor The entity dropping the item
 * @param item The item being dropped
 * @param world The world interface for mutations
 * @returns Result indicating success and where it was dropped
 */
export function drop(actor: IEntity, item: IEntity, world: IWorldModel): IDropResult {
  // Check if actor is holding the item
  const itemLocation = world.getLocation(item.id);
  if (itemLocation !== actor.id) {
    return {
      success: false
    };
  }
  
  // Get actor's current location (where to drop the item)
  const actorLocation = world.getLocation(actor.id);
  if (!actorLocation) {
    // Actor is nowhere, can't drop
    return {
      success: false
    };
  }
  
  // Move the item to the actor's location
  world.moveEntity(item.id, actorLocation);
  
  // Verify the move succeeded
  const newLocation = world.getLocation(item.id);
  if (newLocation !== actorLocation) {
    return {
      success: false
    };
  }
  
  return {
    success: true,
    droppedTo: actorLocation
  };
}