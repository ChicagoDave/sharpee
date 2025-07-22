// packages/world-model/src/traits/actor/actorBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { ActorTrait } from './actorTrait';
import { ContainerBehavior, IWorldQuery } from '../container/containerBehavior';
import { IdentityBehavior } from '../identity/identityBehavior';
import { EntityId } from '@sharpee/core';

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
    return actor.getCustomProperty(key);
  }
  
  /**
   * Set custom property value
   */
  static setCustomProperty(entity: IFEntity, key: string, value: any): void {
    const actor = ActorBehavior.require<ActorTrait>(entity, TraitType.ACTOR);
    actor.setCustomProperty(key, value);
  }
  
  /**
   * Find the player actor in a collection of entities
   */
  static findPlayer(entities: IFEntity[]): IFEntity | undefined {
    return entities.find(e => e.has(TraitType.ACTOR) && ActorBehavior.isPlayer(e));
  }
}