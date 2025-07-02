// packages/world-model/src/traits/supporter/supporterBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { SupporterTrait } from './supporterTrait';
import { IdentityBehavior } from '../identity/identityBehavior';
import { IWorldQuery } from '../container/containerBehavior';

/**
 * Behavior for entities that can support other entities on their surface.
 * 
 * Handles capacity checks, type restrictions, and weight calculations.
 */
export class SupporterBehavior extends Behavior {
  static requiredTraits = [TraitType.SUPPORTER];
  
  /**
   * Check if a supporter can accept an item
   * @returns true if the item can be accepted
   */
  static canAccept(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    
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
      const result = this.checkCapacity(supporter, item, world);
      if (!result) return false;
    }
    
    return true;
  }
  
  /**
   * Check capacity constraints
   */
  static checkCapacity(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    const capacity = trait.capacity!;
    
    // Check item count limit
    if (capacity.maxItems !== undefined) {
      const currentCount = world.getContents(supporter.id).length;
      if (currentCount >= capacity.maxItems) {
        return false;
      }
    }
    
    // Check weight limit
    if (capacity.maxWeight !== undefined) {
      const currentWeight = this.getTotalWeight(supporter, world);
      const itemWeight = this.getItemTotalWeight(item, world);
      if (currentWeight + itemWeight > capacity.maxWeight) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get total weight on supporter
   * For supporters, we count the total weight of all items including their contents
   */
  static getTotalWeight(supporter: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(supporter.id);
    return contents.reduce((sum, item) => {
      // For supporters, we count total weight including nested contents
      return sum + this.getItemTotalWeight(item, world);
    }, 0);
  }
  
  /**
   * Get total weight of an item including its contents
   */
  private static getItemTotalWeight(item: IFEntity, world: IWorldQuery): number {
    let weight = IdentityBehavior.getWeight(item);
    
    // Add weight of contents if this is a container or supporter
    if (item.has(TraitType.CONTAINER) || item.has(TraitType.SUPPORTER)) {
      const contents = world.getContents(item.id);
      for (const subItem of contents) {
        weight += this.getItemTotalWeight(subItem, world);
      }
    }
    
    return weight;
  }
  
  /**
   * Get remaining capacity
   */
  static getRemainingCapacity(supporter: IFEntity, world: IWorldQuery): {
    items?: number;
    weight?: number;
  } {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    const result: { items?: number; weight?: number } = {};
    
    if (trait.capacity?.maxItems !== undefined) {
      const current = world.getContents(supporter.id).length;
      result.items = trait.capacity.maxItems - current;
    }
    
    if (trait.capacity?.maxWeight !== undefined) {
      result.weight = trait.capacity.maxWeight - this.getTotalWeight(supporter, world);
    }
    
    return result;
  }
  
  /**
   * Check if the supporter is enterable by actors
   */
  static isEnterable(supporter: IFEntity): boolean {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    return trait.enterable || false;
  }
  
  /**
   * Get allowed types for this supporter
   */
  static getAllowedTypes(supporter: IFEntity): string[] | undefined {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    return trait.allowedTypes;
  }
  
  /**
   * Get excluded types for this supporter
   */
  static getExcludedTypes(supporter: IFEntity): string[] | undefined {
    const trait = SupporterBehavior.require<SupporterTrait>(supporter, TraitType.SUPPORTER);
    return trait.excludedTypes;
  }
}
