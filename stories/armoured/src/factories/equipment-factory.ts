import { WorldModel, EntityType, IFEntity } from '@sharpee/world-model';
import { IdentityTrait, WearableTrait } from '@sharpee/world-model';

import { ArmorTrait, WeaponTrait, ValueTrait } from '../traits';
import type { ArmorDefinition } from '../data/armor-data';
import type { WeaponDefinition } from '../data/weapon-data';

/**
 * Create an armor entity from a definition.
 *
 * This demonstrates the Sharpee composition pattern:
 * - IdentityTrait: name, description, weight, aliases
 * - WearableTrait: can be worn (stdlib trait)
 * - ArmorTrait: armor class and slot (story-specific)
 * - ValueTrait: cost for buying/selling (story-specific)
 *
 * Each trait is focused on a single responsibility.
 * The entity gains all capabilities through composition.
 */
export function createArmor(
  world: WorldModel,
  definition: ArmorDefinition,
  locationId?: string
): IFEntity {
  const armor = world.createEntity(definition.id, EntityType.OBJECT);

  // Identity: what is it, what does it look like
  armor.add(
    new IdentityTrait({
      name: definition.name,
      aliases: definition.aliases ?? [],
      description: definition.description,
      weight: definition.weight,
    })
  );

  // Wearable: can be worn by actors (built-in stdlib trait)
  armor.add(new WearableTrait());

  // Armor: provides protection (story-specific)
  armor.add(
    new ArmorTrait({
      armorClass: definition.armorClass,
      slot: definition.slot,
    })
  );

  // Value: can be bought/sold (story-specific)
  armor.add(new ValueTrait({ cost: definition.cost }));

  // Place in world if location specified
  if (locationId) {
    world.moveEntity(armor.id, locationId);
  }

  return armor;
}

/**
 * Create a weapon entity from a definition.
 *
 * Similar composition pattern to armor:
 * - IdentityTrait: name, description, weight
 * - WeaponTrait: damage, type, category (story-specific)
 * - ValueTrait: cost (story-specific)
 *
 * Note: weapons are NOT wearable - they are wielded.
 * A WieldableTrait could be added if that distinction matters.
 */
export function createWeapon(
  world: WorldModel,
  definition: WeaponDefinition,
  locationId?: string
): IFEntity {
  const weapon = world.createEntity(definition.id, EntityType.OBJECT);

  // Identity: what is it, what does it look like
  weapon.add(
    new IdentityTrait({
      name: definition.name,
      aliases: definition.aliases ?? [],
      description: definition.description,
      weight: definition.weight,
    })
  );

  // Weapon: offensive capabilities (story-specific)
  weapon.add(
    new WeaponTrait({
      damage: definition.damage,
      damageType: definition.damageType,
      category: definition.category,
    })
  );

  // Value: can be bought/sold (story-specific)
  weapon.add(new ValueTrait({ cost: definition.cost }));

  // Place in world if location specified
  if (locationId) {
    world.moveEntity(weapon.id, locationId);
  }

  return weapon;
}

/**
 * Create all armor from the data tables.
 */
export function createAllArmor(
  world: WorldModel,
  definitions: ArmorDefinition[],
  locationId: string
): IFEntity[] {
  return definitions.map((def) => createArmor(world, def, locationId));
}

/**
 * Create all weapons from the data tables.
 */
export function createAllWeapons(
  world: WorldModel,
  definitions: WeaponDefinition[],
  locationId: string
): IFEntity[] {
  return definitions.map((def) => createWeapon(world, def, locationId));
}
