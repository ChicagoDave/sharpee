/**
 * Exit sub-action - Core logic for exiting containers, supporters, or enterable objects
 * 
 * This sub-action focuses purely on the state mutation:
 * moving an actor from inside/on an object to its parent location.
 * 
 * Part of the sub-actions pattern (ADR-063) for simplified, reusable logic.
 */

import { IEntity } from '@sharpee/core';
import { IWorldModel, TraitType, EntryTrait, IFEntity } from '@sharpee/world-model';

export interface IExitContext {
  actor: IEntity;
}

export interface IExitResult {
  success: boolean;
  fromLocation?: string;
  toLocation?: string;
  preposition: string;
}

/**
 * Exit from a container, supporter, or enterable object
 * 
 * @param actor The entity exiting
 * @param world The world interface for mutations
 * @returns Result indicating success and details of the exit
 */
export function exit(actor: IEntity, world: IWorldModel): IExitResult {
  // Get current location
  const currentLocation = world.getLocation(actor.id);
  
  if (!currentLocation) {
    return {
      success: false,
      preposition: 'from'
    };
  }
  
  const currentContainer = world.getEntity(currentLocation) as IFEntity;
  if (!currentContainer) {
    return {
      success: false,
      fromLocation: currentLocation,
      preposition: 'from'
    };
  }
  
  // Get parent location (where we'll exit to)
  const parentLocation = world.getLocation(currentLocation);
  if (!parentLocation) {
    return {
      success: false,
      fromLocation: currentLocation,
      preposition: 'from'
    };
  }
  
  // Determine preposition based on container type
  let preposition = 'from';
  if (currentContainer.has(TraitType.CONTAINER)) {
    preposition = 'out of';
  } else if (currentContainer.has(TraitType.SUPPORTER)) {
    preposition = 'off';
  }
  
  // Handle ENTRY trait occupants list
  if (currentContainer.has(TraitType.ENTRY)) {
    const entryTrait = currentContainer.get(TraitType.ENTRY) as EntryTrait;
    if (entryTrait.occupants) {
      const index = entryTrait.occupants.indexOf(actor.id);
      if (index !== -1) {
        entryTrait.occupants.splice(index, 1);
      }
    }
  }
  
  // Move the actor to the parent location
  world.moveEntity(actor.id, parentLocation);
  
  // Verify the move succeeded
  const newLocation = world.getLocation(actor.id);
  if (newLocation !== parentLocation) {
    return {
      success: false,
      fromLocation: currentLocation,
      preposition
    };
  }
  
  return {
    success: true,
    fromLocation: currentLocation,
    toLocation: parentLocation,
    preposition
  };
}