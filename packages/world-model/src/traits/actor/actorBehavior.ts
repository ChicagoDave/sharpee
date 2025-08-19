// packages/world-model/src/traits/actor/actorBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ActorTrait } from './actorTrait';
import { ContainerBehavior, IWorldQuery } from '../container/containerBehavior';
import { IdentityBehavior } from '../identity/identityBehavior';
import { EntityId } from '@sharpee/core';
import { WearableBehavior } from '../wearable/wearableBehavior';

/**
 * Result of a take item operation
 */
export interface ITakeItemResult {
  success: boolean;
  alreadyHeld?: boolean;
  tooHeavy?: boolean;
  inventoryFull?: boolean;
  cantTake?: boolean;
  needsRemoval?: boolean;
  fromContainer?: string;
  stateChanged?: boolean;
}

/**
 * Result of a drop item operation
 */
export interface IDropItemResult {
  success: boolean;
  notHeld?: boolean;
  stillWorn?: boolean;
  containerFull?: boolean;
  stateChanged?: boolean;
}

/**
 * Behavior for actors in the world.
 * 
 * Handles inventory management, movement validation, and actor-specific logic.
 */
export class ActorBehavior extends Behavior {
  static requiredTraits = [TraitType.ACTOR];
  
  /**
   * Check if this is the player character
   */
  static isPlayer(entity: IFEntity): boolean {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    return actor.isPlayer || false;
  }
  
  /**
   * Check if this actor can be controlled by the player
   */
  static isPlayable(entity: IFEntity): boolean {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    return actor.isPlayable || false;
  }
  
  /**
   * Get actor's pronouns
   */
  static getPronouns(entity: IFEntity): ActorTrait['pronouns'] {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    return actor.pronouns;
  }
  
  /**
   * Get a specific pronoun
   */
  static getPronoun(entity: IFEntity, type: keyof ActorTrait['pronouns']): string {
    const pronouns = ActorBehavior.getPronouns(entity);
    return pronouns[type];
  }
  
  /**
   * Check if actor can carry an item
   */
  static canCarry(actor: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const actorTrait = ActorBehavior.require<ActorTrait>(actor, TraitType.ACTOR);
    
    // Check inventory limits
    if (actorTrait.capacity) {
      const limit = actorTrait.capacity;
      
      // Check item count
      if (limit.maxItems !== undefined) {
        const currentCount = world.getContents(actor.id).length;
        if (currentCount >= limit.maxItems) {
          return false;
        }
      }
      
      // Check weight limit
      if (limit.maxWeight !== undefined) {
        const currentWeight = ActorBehavior.getCarriedWeight(actor, world);
        const itemWeight = IdentityBehavior.getWeight(item);
        if (currentWeight + itemWeight > limit.maxWeight) {
          return false;
        }
      }
      
      // Check volume limit
      if (limit.maxVolume !== undefined) {
        const currentVolume = ActorBehavior.getCarriedVolume(actor, world);
        const itemVolume = IdentityBehavior.getVolume(item);
        if (currentVolume + itemVolume > limit.maxVolume) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get total weight of carried items
   */
  static getCarriedWeight(actor: IFEntity, world: IWorldQuery): number {
    const items = world.getContents(actor.id);
    return items.reduce((total, item) => {
      return total + IdentityBehavior.getWeight(item);
    }, 0);
  }
  
  /**
   * Get total volume of carried items
   */
  static getCarriedVolume(actor: IFEntity, world: IWorldQuery): number {
    const items = world.getContents(actor.id);
    return items.reduce((total, item) => {
      return total + IdentityBehavior.getVolume(item);
    }, 0);
  }
  
  /**
   * Get remaining carrying capacity
   */
  static getRemainingCapacity(actor: IFEntity, world: IWorldQuery): {
    items?: number;
    weight?: number;
    volume?: number;
  } {
    const actorTrait = ActorBehavior.require<ActorTrait>(actor, TraitType.ACTOR);
    const result: { items?: number; weight?: number; volume?: number } = {};
    
    if (actorTrait.capacity) {
      const limit = actorTrait.capacity;
      
      if (limit.maxItems !== undefined) {
        const current = world.getContents(actor.id).length;
        result.items = limit.maxItems - current;
      }
      
      if (limit.maxWeight !== undefined) {
        result.weight = limit.maxWeight - ActorBehavior.getCarriedWeight(actor, world);
      }
      
      if (limit.maxVolume !== undefined) {
        result.volume = limit.maxVolume - ActorBehavior.getCarriedVolume(actor, world);
      }
    }
    
    return result;
  }
  
  /**
   * Check if actor is holding a specific item
   */
  static isHolding(actor: IFEntity, itemId: EntityId, world: IWorldQuery): boolean {
    const itemLocation = world.getLocation(itemId);
    return itemLocation === actor.id;
  }
  
  /**
   * Get actor's current state
   */
  static getState(entity: IFEntity): string | undefined {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    return actor.state;
  }
  
  /**
   * Set actor's state
   */
  static setState(entity: IFEntity, state: string | undefined): void {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    actor.state = state;
  }
  
  /**
   * Get custom property value
   */
  static getCustomProperty(entity: IFEntity, key: string): any {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    return actor.customProperties?.[key];
  }
  
  /**
   * Set custom property value
   */
  static setCustomProperty(entity: IFEntity, key: string, value: any): void {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    if (!actor.customProperties) {
      actor.customProperties = {};
    }
    actor.customProperties[key] = value;
  }
  
  /**
   * Find the player actor in a collection of entities
   */
  static findPlayer(entities: IFEntity[]): IFEntity | undefined {
    return entities.find(e => e.has(TraitType.ACTOR) && ActorBehavior.isPlayer(e));
  }
  
  /**
   * Check if an actor can take an item (capacity validation)
   * @param actor The actor trying to take the item
   * @param item The item being taken
   * @param world World query interface
   * @returns True if the actor can take the item
   */
  static canTakeItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const actorTrait = actor.get(TraitType.ACTOR) as ActorTrait;
    if (!actorTrait) return false;
    
    // If actor has CONTAINER trait, delegate to ContainerBehavior
    if (actor.has(TraitType.CONTAINER)) {
      return ContainerBehavior.canAccept(actor, item, world);
    }
    
    // Check weight capacity
    if (actorTrait?.capacity?.maxWeight !== undefined) {
      const maxWeight = actorTrait.capacity.maxWeight;
      const currentWeight = ActorBehavior.getCarriedWeight(actor, world);
      // Note: ItemWeight calculation would need world interface extension
      // For now, assume weight checking is done at higher level
      const itemWeight = 0; // TODO: Add weight support to IWorldQuery
      
      if (currentWeight + itemWeight > maxWeight) {
        return false;
      }
    }
    
    // Check item count if defined on ACTOR trait (and not already checked via CONTAINER)
    if (!actor.has(TraitType.CONTAINER) && actorTrait?.capacity?.maxItems !== undefined) {
      const currentCount = world.getContents(actor.id)
        .filter(item => !WearableBehavior.isWorn(item)).length;
      
      if (currentCount >= actorTrait.capacity.maxItems) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Have an actor take an item
   * @param actor The actor taking the item
   * @param item The item being taken
   * @param world World query interface
   * @returns Result describing what happened
   */
  static takeItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): ITakeItemResult {
    // Check if actor already has the item
    const currentLocation = world.getLocation(item.id);
    if (currentLocation === actor.id) {
      return {
        success: false,
        alreadyHeld: true,
        stateChanged: false
      };
    }
    
    // Check capacity constraints
    if (!ActorBehavior.canTakeItem(actor, item, world)) {
      const actorTrait = actor.get(TraitType.ACTOR) as ActorTrait;
      
      // Determine specific failure reason
      if (actorTrait?.capacity?.maxWeight !== undefined) {
        const maxWeight = actorTrait.capacity.maxWeight;
        const currentWeight = ActorBehavior.getCarriedWeight(actor, world);
        // Note: ItemWeight calculation would need world interface extension
        const itemWeight = 0; // TODO: Add weight support to IWorldQuery
        
        if (currentWeight + itemWeight > maxWeight) {
          return {
            success: false,
            tooHeavy: true,
            stateChanged: false
          };
        }
      }
      
      return {
        success: false,
        inventoryFull: true,
        stateChanged: false
      };
    }
    
    // Check if item needs removal from container/supporter
    let needsRemoval = false;
    let fromContainer: string | undefined;
    
    if (currentLocation) {
      // Note: getEntity would need to be added to IWorldQuery interface
      // For now, assume container detection is done at higher level
      needsRemoval = true; // TODO: Add entity lookup support to IWorldQuery
      fromContainer = currentLocation;
    }
    
    // All checks passed - taking is valid
    return {
      success: true,
      stateChanged: true,
      needsRemoval,
      fromContainer
    };
  }
  
  /**
   * Have an actor drop an item
   * @param actor The actor dropping the item
   * @param item The item being dropped
   * @param world World query interface
   * @returns Result describing what happened
   */
  static dropItem(actor: IFEntity, item: IFEntity, world: IWorldQuery): IDropItemResult {
    // Check if actor actually has the item
    const currentLocation = world.getLocation(item.id);
    if (currentLocation !== actor.id) {
      return {
        success: false,
        notHeld: true,
        stateChanged: false
      };
    }
    
    // Check if item is still worn (can't drop worn items)
    if (WearableBehavior.isWorn(item)) {
      return {
        success: false,
        stillWorn: true,
        stateChanged: false
      };
    }
    
    // All checks passed - dropping is valid
    return {
      success: true,
      stateChanged: true
    };
  }
}