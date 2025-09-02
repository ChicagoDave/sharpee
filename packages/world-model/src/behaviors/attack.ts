/**
 * Attack behavior coordinator
 * 
 * Coordinates the various combat behaviors to handle attacks
 */

import { IFEntity } from '../entities/if-entity';
import { WorldModel } from '../world/WorldModel';
import { TraitType } from '../traits/trait-types';
import { EntityId } from '@sharpee/core';
import { WeaponBehavior, IWeaponDamageResult } from '../traits/weapon/weaponBehavior';
import { BreakableBehavior, IBreakResult } from '../traits/breakable/breakableBehavior';
import { DestructibleBehavior, IDamageResult } from '../traits/destructible/destructibleBehavior';
import { CombatBehavior, ICombatResult } from '../traits/combatant/combatantBehavior';

/**
 * Combined result of an attack
 */
export interface IAttackResult {
  success: boolean;
  type: 'broke' | 'damaged' | 'destroyed' | 'killed' | 'hit' | 'ineffective';
  damage?: number;
  remainingHitPoints?: number;
  targetDestroyed?: boolean;
  targetKilled?: boolean;
  itemsDropped?: EntityId[];
  debrisCreated?: EntityId[];
  exitRevealed?: string;
  transformedTo?: EntityId;
  weaponBroke?: boolean;
  message?: string;
}

/**
 * Attack behavior coordinator.
 * 
 * This behavior coordinates attacks using weapon, breakable, destructible, and combat behaviors.
 * It determines which behavior to use based on the target's traits.
 */
export class AttackBehavior {
  /**
   * Perform an attack
   * @param target The entity being attacked
   * @param weapon Optional weapon being used
   * @param world The world model
   * @returns Combined attack result
   */
  static attack(target: IFEntity, weapon: IFEntity | undefined, world: WorldModel): IAttackResult {
    // Calculate weapon damage if using a weapon
    let weaponDamage = 1; // Default unarmed damage
    let weaponType: string | undefined;
    let weaponResult: IWeaponDamageResult | undefined;
    
    if (weapon && weapon.has(TraitType.WEAPON)) {
      weaponResult = WeaponBehavior.calculateDamage(weapon);
      weaponDamage = weaponResult.damage;
      weaponType = weaponResult.weaponType;
    }
    
    // Try behaviors in order: Breakable, Destructible, Combatant
    
    // 1. Check if target is breakable (one-hit destruction)
    if (target.has(TraitType.BREAKABLE)) {
      const breakResult = BreakableBehavior.break(target, world);
      
      if (breakResult.success) {
        return {
          success: true,
          type: 'broke',
          damage: weaponDamage,
          targetDestroyed: true,
          debrisCreated: breakResult.debrisCreated,
          weaponBroke: weaponResult?.weaponBroke,
          message: breakResult.message
        };
      }
    }
    
    // 2. Check if target is destructible (multi-hit with HP)
    if (target.has(TraitType.DESTRUCTIBLE)) {
      const damageResult = DestructibleBehavior.damage(target, weaponDamage, weaponType, world);
      
      if (damageResult.success) {
        return {
          success: true,
          type: damageResult.destroyed ? 'destroyed' : 'damaged',
          damage: damageResult.damage,
          remainingHitPoints: damageResult.remainingHitPoints,
          targetDestroyed: damageResult.destroyed,
          transformedTo: damageResult.transformedTo,
          exitRevealed: damageResult.exitRevealed,
          weaponBroke: weaponResult?.weaponBroke,
          message: damageResult.message
        };
      } else {
        // Attack failed due to requirements
        return {
          success: false,
          type: 'ineffective',
          damage: 0,
          message: damageResult.requiresWeapon 
            ? 'You need a weapon to damage that.'
            : damageResult.wrongWeaponType
            ? 'That weapon won\'t work on this target.'
            : damageResult.invulnerable
            ? 'That cannot be damaged.'
            : 'Your attack has no effect.'
        };
      }
    }
    
    // 3. Check if target is a combatant (has health)
    if (target.has(TraitType.COMBATANT)) {
      const combatResult = CombatBehavior.attack(target, weaponDamage, world);
      
      if (combatResult.success) {
        return {
          success: true,
          type: combatResult.killed ? 'killed' : 'hit',
          damage: combatResult.damage,
          remainingHitPoints: combatResult.remainingHealth,
          targetKilled: combatResult.killed,
          itemsDropped: combatResult.droppedItems,
          weaponBroke: weaponResult?.weaponBroke,
          message: combatResult.killed ? combatResult.deathMessage : combatResult.message
        };
      }
    }
    
    // 4. Target has no combat-related traits - attack is ineffective
    return {
      success: false,
      type: 'ineffective',
      damage: 0,
      message: 'Your attack has no effect on that.'
    };
  }
  
  /**
   * Check if a target can be attacked
   */
  static canAttack(target: IFEntity, weapon?: IFEntity): boolean {
    // Can attack if target has any combat-related trait
    return target.has(TraitType.BREAKABLE) ||
           target.has(TraitType.DESTRUCTIBLE) ||
           target.has(TraitType.COMBATANT);
  }
  
  /**
   * Infer the best weapon from inventory
   * @param inventory Array of entities in player's inventory
   * @returns The best weapon found, or undefined
   */
  static inferWeapon(inventory: IFEntity[]): IFEntity | undefined {
    // Find all weapons
    const weapons = inventory.filter(item => item.has(TraitType.WEAPON));
    
    if (weapons.length === 0) return undefined;
    
    // Prefer equipped weapons
    const equipped = weapons.filter(w => {
      if (!w.has(TraitType.EQUIPPED)) return false;
      const equippedTrait = w.get(TraitType.EQUIPPED);
      return equippedTrait && (equippedTrait as any).isEquipped;
    });
    if (equipped.length > 0) {
      // Return equipped weapon with highest max damage
      return equipped.reduce((best, current) => {
        const bestWeapon = best.get(TraitType.WEAPON);
        const currentWeapon = current.get(TraitType.WEAPON);
        if (!bestWeapon || !currentWeapon) return best;
        const bestDamage = (bestWeapon as any).maxDamage || 0;
        const currentDamage = (currentWeapon as any).maxDamage || 0;
        return currentDamage > bestDamage ? current : best;
      });
    }
    
    // No equipped weapons, return weapon with highest max damage
    return weapons.reduce((best, current) => {
      const bestWeapon = best.get(TraitType.WEAPON);
      const currentWeapon = current.get(TraitType.WEAPON);
      if (!bestWeapon || !currentWeapon) return best;
      const bestDamage = (bestWeapon as any).maxDamage || 0;
      const currentDamage = (currentWeapon as any).maxDamage || 0;
      return currentDamage > bestDamage ? current : best;
    });
  }
}