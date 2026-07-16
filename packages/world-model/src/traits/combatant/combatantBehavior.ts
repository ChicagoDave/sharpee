/**
 * Behavior for combatant entities.
 *
 * Combat orchestration — armor reduction, inventory-drop on death, combat messages —
 * over the entity's combat *stats* (`CombatantTrait`). Health itself lives on the
 * required {@link HealthTrait}; all health reads/writes route through
 * {@link HealthBehavior} (ADR-226 / ADR-223 child A). A combatant is guaranteed a
 * `HealthTrait` by the load-time AC-7 check.
 *
 * Public interface: `canAttack` / `attack` / `heal` / `resurrect` / `isAlive` /
 * `getHealth` / `getHealthPercentage` / `isHostile` / `setHostile`.
 * Owner context: `@sharpee/world-model` — combat (requires the HEALTH layer).
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { WorldModel } from '../../world/WorldModel';
import { TraitType } from '../trait-types';
import { CombatantTrait } from './combatantTrait';
import { HealthTrait } from '../health/healthTrait';
import { HealthBehavior } from '../health/healthBehavior';
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

export class CombatBehavior extends Behavior {
  static requiredTraits = [TraitType.COMBATANT, TraitType.HEALTH];

  /**
   * Check if a combatant can be attacked (present, and alive per its health).
   */
  static canAttack(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return false;
    }
    const health = CombatBehavior.optional<HealthTrait>(entity, TraitType.HEALTH);
    return health ? HealthBehavior.isAlive(health) : true;
  }

  /**
   * Attack a combatant.
   * @param entity The combatant to attack
   * @param damage Base damage amount (pre-armor)
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
    const health = CombatBehavior.require<HealthTrait>(entity, TraitType.HEALTH);

    if (!HealthBehavior.isAlive(health)) {
      return {
        success: false,
        damage: 0,
        killed: false,
        remainingHealth: 0
      };
    }

    // Apply armor reduction (always at least 1 damage), then route through health.
    const actualDamage = Math.max(1, damage - combatant.armor);
    const killed = HealthBehavior.takeDamage(health, actualDamage, 'combat');

    const result: ICombatResult = {
      success: true,
      damage: actualDamage,
      killed,
      remainingHealth: health.health,
      message: combatant.hitMessage,
      retaliated: combatant.canRetaliate && !killed
    };

    // Handle death
    if (killed) {
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
   * Heal a combatant. Returns the amount actually healed.
   */
  static heal(entity: IFEntity, amount: number): number {
    if (!entity.has(TraitType.COMBATANT)) {
      return 0;
    }
    const health = CombatBehavior.require<HealthTrait>(entity, TraitType.HEALTH);
    return HealthBehavior.heal(health, amount);
  }

  /**
   * Resurrect a dead combatant — clears the terminal state and restores full health.
   * @returns true if a dead combatant was resurrected, false if it was already alive
   */
  static resurrect(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return false;
    }
    const health = CombatBehavior.require<HealthTrait>(entity, TraitType.HEALTH);

    if (HealthBehavior.isAlive(health)) return false;

    health.dead = false;
    health.causeOfDeath = undefined;
    health.health = health.maxHealth;
    return true;
  }

  /**
   * Check if combatant is alive (via its health). Non-combatants are alive by default.
   */
  static isAlive(entity: IFEntity): boolean {
    if (!entity.has(TraitType.COMBATANT)) {
      return true; // Non-combatants are considered 'alive' by default
    }
    const health = CombatBehavior.optional<HealthTrait>(entity, TraitType.HEALTH);
    return health ? HealthBehavior.isAlive(health) : true;
  }

  /**
   * Get current health.
   */
  static getHealth(entity: IFEntity): number {
    const health = CombatBehavior.require<HealthTrait>(entity, TraitType.HEALTH);
    return health.health;
  }

  /**
   * Get health percentage.
   */
  static getHealthPercentage(entity: IFEntity): number {
    const health = CombatBehavior.require<HealthTrait>(entity, TraitType.HEALTH);
    return (health.health / health.maxHealth) * 100;
  }

  /**
   * Check if combatant is hostile.
   */
  static isHostile(entity: IFEntity): boolean {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    return combatant.hostile;
  }

  /**
   * Set hostility.
   */
  static setHostile(entity: IFEntity, hostile: boolean): void {
    const combatant = CombatBehavior.require<CombatantTrait>(entity, TraitType.COMBATANT);
    combatant.hostile = hostile;
  }
}
