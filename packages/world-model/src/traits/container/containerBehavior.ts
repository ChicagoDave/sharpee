// packages/world-model/src/traits/container/containerBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ContainerTrait } from './containerTrait';
import { IdentityTrait } from '../identity/identityTrait';
import { IdentityBehavior } from '../identity/identityBehavior';
import { OpenableTrait } from '../openable/openableTrait';
import { OpenableBehavior } from '../openable/openableBehavior';
import { WearableBehavior } from '../wearable/wearableBehavior';

/**
 * Result of an add item operation
 */
export interface AddItemResult {
  success: boolean;
  alreadyContains?: boolean;
  containerFull?: boolean;
  wrongType?: boolean;
  containerClosed?: boolean;
  itemTooLarge?: boolean;
  itemTooHeavy?: boolean;
  stateChanged?: boolean;
}

/**
 * Result of a remove item operation
 */
export interface RemoveItemResult {
  success: boolean;
  notContained?: boolean;
  containerClosed?: boolean;
  stateChanged?: boolean;
}

// Interface for world query operations needed by container behavior
export interface IWorldQuery {
  getContents(containerId: string): IFEntity[];
  getLocation(entityId: string): string | undefined;
}

/**
 * Behavior for entities that can contain other entities.
 * 
 * Handles capacity checks, type restrictions, and container state.
 */
export class ContainerBehavior extends Behavior {
  static requiredTraits = [TraitType.CONTAINER];
  
  /**
   * Check if a container can accept an item
   * @returns true if the item can be accepted
   */
  static canAccept(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    
    // Check if container is accessible (must be open if openable)
    if (container.has(TraitType.OPENABLE)) {
      const openable = container.get<OpenableTrait>(TraitType.OPENABLE);
      if (openable && !openable.isOpen) {
        return false;
      }
    }
    
    // Check type restrictions
    if (trait.allowedTypes && trait.allowedTypes.length > 0) {
      const itemType = item.type || 'object';
      if (!trait.allowedTypes.includes(itemType)) {
        return false;
      }
    }
    
    if (trait.excludedTypes && trait.excludedTypes.length > 0) {
      const itemType = item.type || 'object';
      if (trait.excludedTypes.includes(itemType)) {
        return false;
      }
    }
    
    // Check enterable restrictions for actors
    if (item.has(TraitType.ACTOR) && !trait.enterable) {
      return false;
    }
    
    // Check capacity constraints
    if (trait.capacity) {
      const result = this.checkCapacity(container, item, world);
      if (!result) return false;
    }
    
    return true;
  }
  
  /**
   * Check capacity constraints
   */
  static checkCapacity(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    const capacity = trait.capacity;
    
    // If no capacity defined, allow any items
    if (!capacity) {
      return true;
    }
    
    // Check item count limit (excluding worn items for actors)
    if (capacity.maxItems !== undefined) {
      const contents = world.getContents(container.id);
      const currentCount = contents.filter(item => !WearableBehavior.isWorn(item)).length;
      if (currentCount >= capacity.maxItems) {
        return false;
      }
    }
    
    // Check weight limit
    if (capacity.maxWeight !== undefined) {
      const currentWeight = this.getTotalWeight(container, world);
      const itemWeight = IdentityBehavior.getWeight(item);
      if (currentWeight + itemWeight > capacity.maxWeight) {
        return false;
      }
    }
    
    // Check volume limit
    if (capacity.maxVolume !== undefined) {
      const currentVolume = this.getTotalVolume(container, world);
      const itemVolume = IdentityBehavior.getVolume(item);
      if (currentVolume + itemVolume > capacity.maxVolume) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get total weight of contents (not recursive - container bears the weight)
   */
  static getTotalWeight(container: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(container.id);
    return contents.reduce((sum, item) => {
      return sum + IdentityBehavior.getWeight(item);
    }, 0);
  }
  
  /**
   * Get total volume of contents
   */
  static getTotalVolume(container: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(container.id);
    return contents.reduce((sum, item) => {
      return sum + IdentityBehavior.getVolume(item);
    }, 0);
  }
  
  /**
   * Get remaining capacity
   */
  static getRemainingCapacity(container: IFEntity, world: IWorldQuery): {
    items?: number;
    weight?: number;
    volume?: number;
  } {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    const result: { items?: number; weight?: number; volume?: number } = {};
    
    if (trait.capacity?.maxItems !== undefined) {
      const current = world.getContents(container.id).length;
      result.items = trait.capacity.maxItems - current;
    }
    
    if (trait.capacity?.maxWeight !== undefined) {
      result.weight = trait.capacity.maxWeight - this.getTotalWeight(container, world);
    }
    
    if (trait.capacity?.maxVolume !== undefined) {
      result.volume = trait.capacity.maxVolume - this.getTotalVolume(container, world);
    }
    
    return result;
  }
  
  /**
   * Check if the container is transparent (can see contents when closed)
   */
  static isTransparent(container: IFEntity): boolean {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    return trait.isTransparent || false;
  }
  
  /**
   * Check if the container is enterable by actors
   */
  static isEnterable(container: IFEntity): boolean {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    return trait.enterable || false;
  }
  
  /**
   * Get allowed types for this container
   */
  static getAllowedTypes(container: IFEntity): string[] | undefined {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    return trait.allowedTypes;
  }
  
  /**
   * Get excluded types for this container
   */
  static getExcludedTypes(container: IFEntity): string[] | undefined {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    return trait.excludedTypes;
  }
  
  /**
   * Add an item to a container
   * @param container The container to add to
   * @param item The item to add
   * @param world World query interface for getting current state
   * @returns Result describing what happened
   */
  static addItem(container: IFEntity, item: IFEntity, world: IWorldQuery): AddItemResult {
    const trait = ContainerBehavior.require<ContainerTrait>(container, TraitType.CONTAINER);
    
    // Check if container is accessible (must be open if openable)
    if (container.has(TraitType.OPENABLE)) {
      const openable = container.get<OpenableTrait>(TraitType.OPENABLE);
      if (openable && !openable.isOpen) {
        return {
          success: false,
          containerClosed: true,
          stateChanged: false
        };
      }
    }
    
    // Check if item is already in this container
    const currentLocation = world.getLocation(item.id);
    if (currentLocation === container.id) {
      return {
        success: false,
        alreadyContains: true,
        stateChanged: false
      };
    }
    
    // Check type restrictions
    if (trait.allowedTypes && trait.allowedTypes.length > 0) {
      const itemType = item.type || 'object';
      if (!trait.allowedTypes.includes(itemType)) {
        return {
          success: false,
          wrongType: true,
          stateChanged: false
        };
      }
    }
    
    if (trait.excludedTypes && trait.excludedTypes.length > 0) {
      const itemType = item.type || 'object';
      if (trait.excludedTypes.includes(itemType)) {
        return {
          success: false,
          wrongType: true,
          stateChanged: false
        };
      }
    }
    
    // Check capacity constraints
    if (!ContainerBehavior.checkCapacity(container, item, world)) {
      return {
        success: false,
        containerFull: true,
        stateChanged: false
      };
    }
    
    // All checks passed - this would be where state mutation happens
    // In our event-driven system, the actual mutation happens via events
    // The behavior just validates and returns success
    return {
      success: true,
      stateChanged: true
    };
  }
  
  /**
   * Remove an item from a container
   * @param container The container to remove from
   * @param item The item to remove
   * @param world World query interface for getting current state
   * @returns Result describing what happened
   */
  static removeItem(container: IFEntity, item: IFEntity, world: IWorldQuery): RemoveItemResult {
    // Check if container is accessible (must be open if openable)
    if (container.has(TraitType.OPENABLE)) {
      const openable = container.get<OpenableTrait>(TraitType.OPENABLE);
      if (openable && !openable.isOpen) {
        return {
          success: false,
          containerClosed: true,
          stateChanged: false
        };
      }
    }
    
    // Check if item is actually in this container
    const currentLocation = world.getLocation(item.id);
    if (currentLocation !== container.id) {
      return {
        success: false,
        notContained: true,
        stateChanged: false
      };
    }
    
    // All checks passed - removal is valid
    return {
      success: true,
      stateChanged: true
    };
  }
}
