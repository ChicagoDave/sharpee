import { IFEntity, WorldModel } from '@sharpee/world-model';
import { WearableTrait } from '@sharpee/world-model';

import { ArmorTrait, WeaponTrait, CombatantTrait } from '../traits';

/**
 * Calculate the effective Armor Class for an entity.
 *
 * AC is calculated as:
 *   Base AC + Body Armor AC + Shield AC bonus
 *
 * This demonstrates querying multiple traits to compute derived values.
 */
export function calculateArmorClass(
  entity: IFEntity,
  world: WorldModel
): number {
  const combatant = entity.get(CombatantTrait);
  if (!combatant) {
    return 10; // Default AC for non-combatants
  }

  let totalAC = combatant.baseArmorClass;

  // Find worn armor
  const contents = world.getContents(entity.id);
  for (const item of contents) {
    const wearable = item.get(WearableTrait);
    const armor = item.get(ArmorTrait);

    // Only count worn armor
    if (wearable && armor) {
      if (armor.slot === 'body') {
        // Body armor replaces base AC
        totalAC = Math.max(totalAC, armor.armorClass);
      } else if (armor.slot === 'shield') {
        // Shield adds to AC
        totalAC += armor.armorClass;
      }
    }
  }

  return totalAC;
}

/**
 * Calculate damage for an attack.
 *
 * Returns the equipped weapon's damage, or 1 for unarmed.
 */
export function calculateDamage(
  attacker: IFEntity,
  world: WorldModel
): number {
  // Find wielded weapon (for now, any weapon in inventory)
  const contents = world.getContents(attacker.id);
  for (const item of contents) {
    const weapon = item.get(WeaponTrait);
    if (weapon) {
      return weapon.damage;
    }
  }

  // Unarmed
  return 1;
}

/**
 * Simulate a simple attack roll.
 *
 * Roll: d20 + attack bonus vs target AC
 * Returns: { hit: boolean, roll: number, damage: number }
 */
export function rollAttack(
  attacker: IFEntity,
  target: IFEntity,
  world: WorldModel
): { hit: boolean; roll: number; damage: number } {
  const attackerCombatant = attacker.get(CombatantTrait);
  const attackBonus = attackerCombatant?.attackBonus ?? 0;

  // Simulate d20 roll (1-20)
  const dieRoll = Math.floor(Math.random() * 20) + 1;
  const totalRoll = dieRoll + attackBonus;

  const targetAC = calculateArmorClass(target, world);
  const hit = totalRoll >= targetAC;

  const damage = hit ? calculateDamage(attacker, world) : 0;

  return { hit, roll: totalRoll, damage };
}

/**
 * Apply damage to a combatant.
 *
 * Returns true if the target is defeated (health reaches 0).
 */
export function applyDamage(target: IFEntity, damage: number): boolean {
  const combatant = target.get(CombatantTrait);
  if (!combatant) {
    return false;
  }

  combatant.currentHealth = Math.max(0, combatant.currentHealth - damage);

  if (combatant.currentHealth <= 0) {
    combatant.isAlive = false;
    return true;
  }

  return false;
}

/**
 * Get a description of an entity's combat status.
 */
export function getCombatStatus(
  entity: IFEntity,
  world: WorldModel
): string {
  const combatant = entity.get(CombatantTrait);
  if (!combatant) {
    return 'Not a combatant.';
  }

  const ac = calculateArmorClass(entity, world);
  const healthPercent = Math.floor(
    (combatant.currentHealth / combatant.maxHealth) * 100
  );

  let healthDesc: string;
  if (healthPercent >= 100) {
    healthDesc = 'uninjured';
  } else if (healthPercent >= 75) {
    healthDesc = 'lightly wounded';
  } else if (healthPercent >= 50) {
    healthDesc = 'wounded';
  } else if (healthPercent >= 25) {
    healthDesc = 'badly wounded';
  } else if (healthPercent > 0) {
    healthDesc = 'near death';
  } else {
    healthDesc = 'defeated';
  }

  return `Health: ${combatant.currentHealth}/${combatant.maxHealth} (${healthDesc}), AC: ${ac}`;
}
