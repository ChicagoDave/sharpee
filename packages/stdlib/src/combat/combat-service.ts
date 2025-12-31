/**
 * Combat Service (ADR-072)
 *
 * Handles combat resolution using a skill-based probability system.
 */

import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CombatantTrait,
  WeaponTrait,
} from '@sharpee/world-model';
import { CombatMessages, HealthStatus } from './combat-messages';

/**
 * Context for combat resolution
 */
export interface CombatContext {
  /** The attacker entity */
  attacker: IFEntity;

  /** The target entity */
  target: IFEntity;

  /** Weapon being used (if any) */
  weapon?: IFEntity;

  /** The world model */
  world: WorldModel;

  /** Seeded random number generator */
  random: SeededRandom;
}

/**
 * Result of combat resolution
 */
export interface CombatResult {
  /** Whether the attack hit */
  hit: boolean;

  /** Damage dealt (0 if missed) */
  damage: number;

  /** Target's new health after damage */
  targetNewHealth: number;

  /** Whether target was knocked out (unconscious) */
  targetKnockedOut: boolean;

  /** Whether target was killed */
  targetKilled: boolean;

  /** Message ID for the result */
  messageId: string;

  /** Data for the message */
  messageData: Record<string, unknown>;
}

/**
 * Validation result for combat
 */
export interface CombatValidation {
  valid: boolean;
  messageId?: string;
  messageData?: Record<string, unknown>;
}

/**
 * Combat Service interface
 */
export interface ICombatService {
  /** Resolve a single attack */
  resolveAttack(context: CombatContext): CombatResult;

  /** Check if attacker can attack target */
  canAttack(attacker: IFEntity, target: IFEntity): CombatValidation;

  /** Get descriptive health status */
  getHealthStatus(entity: IFEntity): HealthStatus;

  /** Calculate hit chance */
  calculateHitChance(
    attackerSkill: number,
    defenderSkill: number,
    weaponBonus: number
  ): number;
}

/**
 * Combat Service implementation
 */
export class CombatService implements ICombatService {
  /**
   * Calculate hit chance based on skills
   *
   * Base chance starts at 50%.
   * Each point of skill advantage = +1%.
   * Clamped to 10%-95% (always some chance either way).
   */
  calculateHitChance(
    attackerSkill: number,
    defenderSkill: number,
    weaponBonus: number
  ): number {
    const baseChance = 50;
    const skillDiff = attackerSkill + weaponBonus - defenderSkill;
    return Math.max(10, Math.min(95, baseChance + skillDiff));
  }

  /**
   * Resolve an attack
   */
  resolveAttack(context: CombatContext): CombatResult {
    const { attacker, target, weapon, random } = context;

    // Get combatant traits
    const attackerCombat = attacker.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    const targetCombat = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    const weaponTrait = weapon?.get(TraitType.WEAPON) as WeaponTrait | undefined;

    // Get skill values
    const attackerSkill = attackerCombat?.skill ?? 30;
    const defenderSkill = targetCombat?.skill ?? 30;
    const weaponBonus = weaponTrait?.skillBonus ?? 0;

    // Calculate hit chance
    const hitChance = this.calculateHitChance(attackerSkill, defenderSkill, weaponBonus);

    // Roll to hit
    const roll = random.int(1, 100);
    const hit = roll <= hitChance;

    // Base message data
    const messageData: Record<string, unknown> = {
      attackerName: attacker.name,
      targetName: target.name,
      weaponName: weapon?.name,
    };

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        targetNewHealth: targetCombat?.health ?? 0,
        targetKnockedOut: false,
        targetKilled: false,
        messageId: CombatMessages.ATTACK_MISSED,
        messageData,
      };
    }

    // Calculate damage
    const baseDamage = attackerCombat?.baseDamage ?? 1;
    const weaponDamage = weaponTrait?.damage ?? 0;
    let totalDamage = baseDamage + weaponDamage;

    // Blessed weapon bonus against undead (if applicable)
    if (weaponTrait?.isBlessed) {
      // Check if target is undead (story would define this trait)
      const targetIdentity = target.get(TraitType.IDENTITY) as any;
      if (targetIdentity?.isUndead) {
        totalDamage = Math.floor(totalDamage * 1.5);
      }
    }

    // Apply armor reduction
    const armor = targetCombat?.armor ?? 0;
    const effectiveDamage = Math.max(1, totalDamage - armor); // Always do at least 1 damage

    // Calculate new health
    const currentHealth = targetCombat?.health ?? 10;
    const newHealth = Math.max(0, currentHealth - effectiveDamage);

    // Determine outcome
    const killed = newHealth <= 0;
    const maxHealth = targetCombat?.maxHealth ?? 10;
    const knockedOut = !killed && newHealth <= maxHealth * 0.2;

    // Add damage to message data
    messageData.damage = effectiveDamage;

    // Determine message based on outcome
    let messageId: string;
    if (killed) {
      messageId = CombatMessages.ATTACK_KILLED;
    } else if (knockedOut) {
      messageId = CombatMessages.ATTACK_KNOCKED_OUT;
    } else if (effectiveDamage >= maxHealth * 0.3) {
      messageId = CombatMessages.ATTACK_HIT_HEAVY;
    } else if (effectiveDamage <= maxHealth * 0.1) {
      messageId = CombatMessages.ATTACK_HIT_LIGHT;
    } else {
      messageId = CombatMessages.ATTACK_HIT;
    }

    return {
      hit: true,
      damage: effectiveDamage,
      targetNewHealth: newHealth,
      targetKnockedOut: knockedOut,
      targetKilled: killed,
      messageId,
      messageData,
    };
  }

  /**
   * Check if an entity can attack another
   */
  canAttack(attacker: IFEntity, target: IFEntity): CombatValidation {
    // Check if target has combatant trait
    const targetCombat = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (!targetCombat) {
      return {
        valid: false,
        messageId: CombatMessages.CANNOT_ATTACK,
        messageData: { targetName: target.name },
      };
    }

    // Check if target is alive
    if (!targetCombat.isAlive) {
      return {
        valid: false,
        messageId: CombatMessages.ALREADY_DEAD,
        messageData: { targetName: target.name },
      };
    }

    // Check if target is unconscious (optional - some games allow attacking unconscious targets)
    // For now, we allow it but could add a flag to control this

    return { valid: true };
  }

  /**
   * Get health status for an entity
   */
  getHealthStatus(entity: IFEntity): HealthStatus {
    const combatant = entity.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (!combatant) {
      return 'healthy'; // Non-combatants are "healthy"
    }

    if (!combatant.isAlive) {
      return 'dead';
    }

    if (!combatant.isConscious) {
      return 'unconscious';
    }

    const healthPercent = combatant.health / combatant.maxHealth;

    if (healthPercent <= 0.1) {
      return 'near_death';
    } else if (healthPercent <= 0.3) {
      return 'badly_wounded';
    } else if (healthPercent <= 0.7) {
      return 'wounded';
    } else {
      return 'healthy';
    }
  }
}

/**
 * Create a new Combat Service instance
 */
export function createCombatService(): ICombatService {
  return new CombatService();
}

/**
 * Apply combat result to the target entity
 */
export function applyCombatResult(
  target: IFEntity,
  result: CombatResult,
  world: WorldModel
): void {
  if (!result.hit) return;

  const combatant = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
  if (!combatant) return;

  // Update health
  combatant.health = result.targetNewHealth;

  // Update consciousness
  if (result.targetKnockedOut) {
    combatant.knockOut();
  }

  // Update alive status
  if (result.targetKilled) {
    combatant.kill();
  }
}

/**
 * Find the wielded weapon for an entity
 */
export function findWieldedWeapon(
  entity: IFEntity,
  world: WorldModel
): IFEntity | undefined {
  // Get entity's inventory
  const inventory = world.getContents(entity.id);

  // Find weapons
  const weapons = inventory.filter((item) => item.has(TraitType.WEAPON));

  if (weapons.length === 0) {
    return undefined;
  }

  // Prefer equipped weapons
  const equipped = weapons.filter((w) => {
    if (!w.has(TraitType.EQUIPPED)) return false;
    const equippedTrait = w.get(TraitType.EQUIPPED) as any;
    return equippedTrait?.isEquipped;
  });

  if (equipped.length > 0) {
    // Return weapon with highest damage
    return equipped.reduce((best, current) => {
      const bestWeapon = best.get(TraitType.WEAPON) as WeaponTrait;
      const currentWeapon = current.get(TraitType.WEAPON) as WeaponTrait;
      return currentWeapon.damage > bestWeapon.damage ? current : best;
    });
  }

  // Return first weapon found (or best by damage)
  return weapons.reduce((best, current) => {
    const bestWeapon = best.get(TraitType.WEAPON) as WeaponTrait;
    const currentWeapon = current.get(TraitType.WEAPON) as WeaponTrait;
    return currentWeapon.damage > bestWeapon.damage ? current : best;
  });
}
