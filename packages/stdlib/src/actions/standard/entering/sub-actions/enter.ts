/**
 * Enter sub-action - Core logic for entering containers, supporters, or enterable objects
 * 
 * This sub-action focuses purely on the state mutation:
 * moving an actor from their current location to inside/on an enterable object.
 * 
 * Part of the sub-actions pattern (ADR-063) for simplified, reusable logic.
 */

import { IEntity } from '@sharpee/core';
import { IWorldModel, TraitType, EntryTrait, IFEntity } from '@sharpee/world-model';

export interface IEnterContext {
  actor: IEntity;
  target: IEntity;
}

export interface IEnterResult {
  success: boolean;
  preposition: 'in' | 'on';
  posture?: string;
  previousLocation?: string;
}

/**
 * Enter a container, supporter, or enterable object
 * 
 * @param actor The entity entering
 * @param target The object being entered
 * @param world The world interface for mutations
 * @returns Result indicating success and details of the entry
 */
export function enter(actor: IEntity, target: IEntity, world: IWorldModel): IEnterResult {
  // Cast to IFEntity for trait checking
  const targetEntity = target as IFEntity;
  // Get current location before entering
  const previousLocation = world.getLocation(actor.id);
  
  // Check if already in the target
  if (previousLocation === target.id) {
    return {
      success: false,
      preposition: 'in',
      previousLocation
    };
  }
  
  // Determine preposition and posture based on target type
  let preposition: 'in' | 'on' = 'in';
  let posture: string | undefined;
  
  // Handle ENTRY trait
  if (targetEntity.has(TraitType.ENTRY)) {
    const entryTrait = targetEntity.get(TraitType.ENTRY) as EntryTrait;
    preposition = (entryTrait.preposition || 'in') as 'in' | 'on';
    posture = entryTrait.posture;
    
    // Update occupants list
    entryTrait.occupants = entryTrait.occupants || [];
    if (!entryTrait.occupants.includes(actor.id)) {
      entryTrait.occupants.push(actor.id);
    }
    
    // Ensure entity can hold other entities
    // If it doesn't have CONTAINER or SUPPORTER, add appropriate one based on preposition
    if (!targetEntity.has(TraitType.CONTAINER) && !targetEntity.has(TraitType.SUPPORTER)) {
      if (preposition === 'in') {
        targetEntity.add({ type: TraitType.CONTAINER });
      } else {
        targetEntity.add({ type: TraitType.SUPPORTER });
      }
    }
  } else if (targetEntity.has(TraitType.SUPPORTER)) {
    preposition = 'on';
  } else if (targetEntity.has(TraitType.CONTAINER)) {
    preposition = 'in';
  }
  
  // Move the actor to the target
  world.moveEntity(actor.id, target.id);
  
  // Verify the move succeeded
  const newLocation = world.getLocation(actor.id);
  if (newLocation !== target.id) {
    // Move failed - likely because moveEntity returned false
    return {
      success: false,
      preposition,
      posture,
      previousLocation
    };
  }
  
  return {
    success: true,
    preposition,
    posture,
    previousLocation
  };
}