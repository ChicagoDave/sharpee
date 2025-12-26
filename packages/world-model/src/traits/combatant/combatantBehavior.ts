/**
 * Behavior for combatant entities
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { TraitType } from '../trait-types';
import { CombatantTrait } from './combatantTrait';
import { EntityId } from '@sharpee/core';

/**
 * Result of a combat attack
 */
export interface ICombatResult {
  success: boolean;
  damage: number;
  killed: boolean;
  remainingHealth: number;
  droppedItems?: EntityId[];
  retaliated?: boolean;
  message?: string;
  deathMessage?: string;
}

/**
 * Behavior for combatant entities.
 * 
 * Handles combat with health, armor, and death.
 * This is a world-aware behavior because it handles inventory dropping on death.
 */
export class CombatBehavior extends Behavior {
  static requiredTraits = [TraitType.COMBATANT];
  
  /**
   * Check if a combatant can be attacked
   */
  static canAttack(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return false;
    }
    const combatant = entity.get<CombatantTrait>(TraitType.COMBATANT)!;
    return combatant.isAlive && combatant.health > 0;
  }
  
  /**
   * Attack a combatant
   * @param entity The combatant to attack
   * @param damage Base damage amount
   * @param world The world model (needed for dropping inventory)
   * @returns Result describing what happened
   */
  static attack(entity: IFEntity, damage: number, world: WorldModel): ICombatResult {
    if (!entity.has(TraitType.COMBATANT)) {
      return {
        success: false,
        damage: 0,
        killed: false,
        remainingHealth: 0,
        message: 'Entity is not a combatant'
      };
    }
    const combatant = entity.get<CombatantTrait>(TraitType.COMBATANT)!;
    
    if (!combatant.isAlive || combatant.health <= 0) {
      return {
        success: false,
        damage: 0,
        killed: false,
        remainingHealth: 0
      };
    }
    
    // Apply armor reduction
    const actualDamage = Math.max(1, damage - combatant.armor);
    
    // Apply damage
    combatant.health = Math.max(0, combatant.health - actualDamage);
    
    const result: ICombatResult = {
      success: true,
      damage: actualDamage,
      killed: combatant.health <= 0,
      remainingHealth: combatant.health,
      message: combatant.hitMessage,
      retaliated: combatant.canRetaliate && combatant.health > 0
    };
    
    // Handle death
    if (combatant.health <= 0) {
      combatant.isAlive = false;
      result.deathMessage = combatant.deathMessage;
      
      // Drop inventory if specified
      if (combatant.dropsInventory) {
        const location = world.getLocation(entity.id);
        const inventory = world.getContents(entity.id);
        const droppedItems: EntityId[] = [];
        
        if (location) {
          for (const item of inventory) {
            world.moveEntity(item.id, location);
            droppedItems.push(item.id);
          }
        }
        
        if (droppedItems.length > 0) {
          result.droppedItems = droppedItems;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Heal a combatant
   */
  static heal(entity: IFEntity, amount: number): number {
    if (!entity.has(TraitType.COMBATANT)) {
      return 0;
    }
    const combatant = entity.get<CombatantTrait>(TraitType.COMBATANT)!;
    
    if (!combatant.isAlive) return 0;
    
    const oldHealth = combatant.health;
    combatant.health = Math.min(combatant.maxHealth, combatant.health + amount);
    
    return combatant.health - oldHealth;
  }
  
  /**
   * Resurrect a dead combatant
   */
  static resurrect(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return false;
    }
    const combatant = entity.get<CombatantTrait>(TraitType.COMBATANT)!;
    
    if (combatant.isAlive) return false;
    
    combatant.isAlive = true;
    combatant.health = combatant.maxHealth;
    return true;
  }
  
  /**
   * Check if combatant is alive
   */
  static isAlive(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return true; // Non-combatants are considered 'alive' by default
    }
    const combatant = entity.get<CombatantTrait>(TraitType.COMBATANT)!;
    return combatant.isAlive && combatant.health > 0;
  }
  
  /**
   * Get current health
   */
  static getHealth(entity: IFEntity): number {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    return combatant.health;
  }
  
  /**
   * Get health percentage
   */
  static getHealthPercentage(entity: IFEntity): number {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    return (combatant.health / combatant.maxHealth) * 100;
  }
  
  /**
   * Check if combatant is hostile
   */
  static isHostile(entity: IFEntity): boolean {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    return combatant.hostile;
  }
  
  /**
   * Set hostility
   */
  static setHostile(entity: IFEntity, hostile: boolean): void {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    combatant.hostile = hostile;
  }
}