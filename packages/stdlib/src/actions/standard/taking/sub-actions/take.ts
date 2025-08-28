/**
 * Take sub-action - Core logic for picking up an item
 * 
 * This sub-action focuses purely on the state mutation:
 * moving an entity from its current location to the actor's inventory.
 * 
 * Part of the sub-actions pattern (ADR-063) for simplified, reusable logic.
 */

import { IEntity } from '@sharpee/core';
import { IWorldModel } from '@sharpee/world-model';

export interface ITakeResult {
  success: boolean;
  previousLocation?: string;
  wasWorn?: boolean;
}

/**
 * Take an item and move it to actor's inventory
 * 
 * @param actor The entity taking the item
 * @param item The item being taken
 * @param world The world interface for mutations
 * @returns Result indicating success and previous state
 */
export function take(actor: IEntity, item: IEntity, world: IWorldModel): ITakeResult {
  // Get current location before taking
  const previousLocation = world.getLocation(item.id);
  
  // Check if already held
  if (previousLocation === actor.id) {
    return {
      success: false,
      previousLocation
    };
  }
  
  // Move the item to the actor
  world.moveEntity(item.id, actor.id);
  
  // Verify the move succeeded
  const newLocation = world.getLocation(item.id);
  if (newLocation !== actor.id) {
    return {
      success: false,
      previousLocation
    };
  }
  
  return {
    success: true,
    previousLocation
  };
}