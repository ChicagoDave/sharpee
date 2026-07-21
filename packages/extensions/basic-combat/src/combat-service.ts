/**
 * Combat Service (ADR-072)
 *
 * Handles combat resolution using a skill-based probability system.
 * Moved from stdlib to basic-combat extension — stories opt in by
 * calling registerBasicCombat().
 */

import { EntityId, SeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CombatantTrait,
  HealthTrait,
  HealthBehavior,
  WeaponTrait,
} from '@sharpee/world-model';
import { nounPhraseFor } from '@sharpee/stdlib';
import { CombatMessages, HealthStatus } from './combat-messages.js';

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
    const targetHealth = target.get(TraitType.HEALTH) as HealthTrait | undefined; // life-state (ADR-226)
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

    // Base message data.
    // ADR-158: pass EntityInfo for entity-valued template params (target);
    // keep *Name strings for handler / event-sourcing consumption.
    const messageData: Record<string, unknown> = {
      attackerName: attacker.name,
      targetName: target.name,
      weaponName: weapon?.name,
      target: nounPhraseFor(target),
    };

    if (!hit) {
      return {
        hit: false,
        damage: 0,
        targetNewHealth: targetHealth?.health ?? 0,
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
    if (weaponTrait?.isBlessed && targetCombat?.isUndead) {
      totalDamage = Math.floor(totalDamage * 1.5);
    }

    // Apply armor reduction
    const armor = targetCombat?.armor ?? 0;
    const effectiveDamage = Math.max(1, totalDamage - armor); // Always do at least 1 damage

    // Calculate new health (life-state lives on HealthTrait — ADR-226)
    const currentHealth = targetHealth?.health ?? 10;
    const newHealth = Math.max(0, currentHealth - effectiveDamage);

    // Determine outcome
    const killed = newHealth <= 0;
    const maxHealth = targetHealth?.maxHealth ?? 10;
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
    // Check if target has combatant trait.
    // ADR-158: include EntityInfo alongside the bare-string targetName.
    const targetCombat = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
    if (!targetCombat) {
      return {
        valid: false,
        messageId: CombatMessages.CANNOT_ATTACK,
        messageData: { targetName: target.name, target: nounPhraseFor(target) },
      };
    }

    // Check if target is alive (life-state on HealthTrait — ADR-226)
    const targetHealth = target.get(TraitType.HEALTH) as HealthTrait | undefined;
    if (targetHealth && !HealthBehavior.isAlive(targetHealth)) {
      return {
        valid: false,
        messageId: CombatMessages.ALREADY_DEAD,
        messageData: { targetName: target.name, target: nounPhraseFor(target) },
      };
    }

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
    const health = entity.get(TraitType.HEALTH) as HealthTrait | undefined;
    if (!health) {
      return 'healthy'; // no life-state -> treat as healthy
    }

    if (!HealthBehavior.isAlive(health)) {
      return 'dead';
    }

    if (!HealthBehavior.isConscious(health)) {
      return 'unconscious';
    }

    const healthPercent = health.health / health.maxHealth;

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
 * Result of applying combat damage
 */
export interface ApplyCombatResultInfo {
  /** IDs of items dropped from target's inventory */
  droppedItems: EntityId[];
}

/**
 * Apply combat result to the target entity
 * Handles health updates, consciousness changes, death, and inventory dropping
 */
export function applyCombatResult(
  target: IFEntity,
  result: CombatResult,
  world: WorldModel
): ApplyCombatResultInfo {
  const info: ApplyCombatResultInfo = { droppedItems: [] };

  if (!result.hit) return info;

  const combatant = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
  if (!combatant) return info;
  const health = target.get(TraitType.HEALTH) as HealthTrait | undefined;

  // Update health on the life-state trait. Consciousness derives from health
  // (ADR-226 §1 F1) — there is no separate knockout step; `targetKnockedOut`
  // is carried only as a message signal by resolveAttack.
  if (health) {
    health.health = result.targetNewHealth;
    if (result.targetKilled) {
      HealthBehavior.kill(health, 'combat');
    }
  }

  // Handle death: drop inventory if configured
  if (result.targetKilled) {
    if (combatant.dropsInventory) {
      const location = world.getLocation(target.id);
      if (location) {
        const inventory = world.getContents(target.id);
        for (const item of inventory) {
          world.moveEntity(item.id, location);
          info.droppedItems.push(item.id);
        }
      }
    }
  }

  return info;
}
