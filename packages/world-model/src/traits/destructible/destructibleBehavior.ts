/**
 * Behavior for destructible entities
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { TraitType } from '../trait-types';
import { DestructibleTrait } from './destructibleTrait';
import { EntityId } from '@sharpee/core';

/**
 * Result of damaging a destructible entity
 */
export interface IDamageResult {
  success: boolean;
  damage: number;
  destroyed: boolean;
  remainingHitPoints: number;
  requiresWeapon?: boolean;
  wrongWeaponType?: boolean;
  invulnerable?: boolean;
  transformedTo?: EntityId;
  exitRevealed?: string;
  message?: string;
}

/**
 * Behavior for destructible entities.
 * 
 * Handles multi-hit destruction with hit points and armor.
 * This is a world-aware behavior because it may transform entities or reveal exits.
 */
export class DestructibleBehavior extends Behavior {
  static requiredTraits = [TraitType.DESTRUCTIBLE];
  
  /**
   * Check if an entity can be damaged
   */
  static canDamage(entity: IFEntity, weaponType?: string): boolean {
    if (!entity.has(TraitType.DESTRUCTIBLE)) {
      return false;
    }
    const destructible = entity.get<DestructibleTrait>(TraitType.DESTRUCTIBLE)!;
    
    if (destructible.invulnerable) return false;
    if (destructible.hitPoints <= 0) return false; // Already destroyed
    
    // Check weapon requirements
    if (destructible.requiresWeapon && !weaponType) return false;
    if (destructible.requiresType && weaponType !== destructible.requiresType) return false;
    
    return true;
  }
  
  /**
   * Damage the entity
   * @param entity The entity to damage
   * @param damage Base damage amount
   * @param weaponType Type of weapon used (if any)
   * @param world The world model (needed for transformations)
   * @returns Result describing what happened
   */
  static damage(entity: IFEntity, damage: number, weaponType: string | undefined, world: WorldModel): IDamageResult {
    if (!entity.has(TraitType.DESTRUCTIBLE)) {
      return {
        success: false,
        damage: 0,
        destroyed: false,
        remainingHitPoints: 0,
        message: 'Entity is not destructible'
      };
    }
    const destructible = entity.get<DestructibleTrait>(TraitType.DESTRUCTIBLE)!;
    
    // Check if can be damaged
    if (destructible.invulnerable) {
      return {
        success: false,
        damage: 0,
        destroyed: false,
        remainingHitPoints: destructible.hitPoints,
        invulnerable: true
      };
    }
    
    if (destructible.requiresWeapon && !weaponType) {
      return {
        success: false,
        damage: 0,
        destroyed: false,
        remainingHitPoints: destructible.hitPoints,
        requiresWeapon: true
      };
    }
    
    if (destructible.requiresType && weaponType !== destructible.requiresType) {
      return {
        success: false,
        damage: 0,
        destroyed: false,
        remainingHitPoints: destructible.hitPoints,
        wrongWeaponType: true
      };
    }
    
    // Apply armor reduction
    const actualDamage = Math.max(1, damage - destructible.armor);
    
    // Apply damage
    destructible.hitPoints = Math.max(0, destructible.hitPoints - actualDamage);
    
    const result: IDamageResult = {
      success: true,
      damage: actualDamage,
      destroyed: destructible.hitPoints <= 0,
      remainingHitPoints: destructible.hitPoints,
      message: destructible.hitPoints > 0 ? destructible.damageMessage : destructible.destroyMessage
    };
    
    // Handle destruction
    if (destructible.hitPoints <= 0) {
      // Transform entity if specified
      if (destructible.transformTo) {
        const location = world.getLocation(entity.id);
        const newName = `transformed ${entity.id}`;
        const newEntity = world.createEntity(newName, destructible.transformTo);
        
        if (location && newEntity) {
          world.moveEntity(newEntity.id, location);
          result.transformedTo = newEntity.id;
          
          // Remove original entity
          world.removeEntity(entity.id);
        }
      }
      
      // Reveal exit if specified
      if (destructible.revealExit) {
        result.exitRevealed = destructible.revealExit;
        // The action will handle actually revealing the exit in the room
      }
    }
    
    return result;
  }
  
  /**
   * Check if entity is destroyed
   */
  static isDestroyed(entity: IFEntity): boolean {
    if (!entity.has(TraitType.DESTRUCTIBLE)) {
      return false;
    }
    const destructible = entity.get<DestructibleTrait>(TraitType.DESTRUCTIBLE)!;
    return destructible.hitPoints <= 0;
  }
  
  /**
   * Get remaining hit points
   */
  static getHitPoints(entity: IFEntity): number {
    const destructible = DestructibleBehavior.require<DestructibleTrait>(entity, TraitType.DESTRUCTIBLE);
    return destructible.hitPoints;
  }
  
  /**
   * Repair entity (restore hit points)
   */
  static repair(entity: IFEntity): boolean {
    const destructible = DestructibleBehavior.require<DestructibleTrait>(entity, TraitType.DESTRUCTIBLE);
    
    if (destructible.hitPoints >= destructible.maxHitPoints) return false;
    
    destructible.hitPoints = destructible.maxHitPoints;
    return true;
  }
}