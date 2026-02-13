/**
 * Weapon Utilities
 *
 * Helper functions for finding and evaluating weapons.
 * Combat resolution has moved to @sharpee/ext-basic-combat.
 */

import {
  IFEntity,
  WorldModel,
  TraitType,
  WeaponTrait,
} from '@sharpee/world-model';

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
