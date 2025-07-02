// packages/world-model/src/traits/container/containerBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ContainerTrait } from './containerTrait';
import { IdentityTrait } from '../identity/identityTrait';
import { IdentityBehavior } from '../identity/identityBehavior';
import { OpenableTrait } from '../openable/openableTrait';
import { OpenableBehavior } from '../openable/openableBehavior';

// Interface for world query operations needed by container behavior
export interface IWorldQuery {
  getContents(containerId: string): IFEntity[];
  getLocation(entityId: string): string | null;
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
    const capacity = trait.capacity!;
    
    // Check item count limit
    if (capacity.maxItems !== undefined) {
      const currentCount = world.getContents(container.id).length;
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
}
