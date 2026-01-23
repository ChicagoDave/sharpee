import type { WeaponCategory, DamageType } from '../traits';

/**
 * Weapon definition - all properties needed to create a weapon entity.
 */
export interface WeaponDefinition {
  /** Unique identifier for this weapon type */
  id: string;
  /** Display name */
  name: string;
  /** Description when examined */
  description: string;
  /** Cost in gold pieces */
  cost: number;
  /** Weight in pounds */
  weight: number;
  /** Base damage on hit */
  damage: number;
  /** Type of damage dealt */
  damageType: DamageType;
  /** Melee or ranged */
  category: WeaponCategory;
  /** Alternative names the player can use */
  aliases?: string[];
}

/**
 * Melee weapons - used in close combat.
 */
export const MELEE_WEAPONS: WeaponDefinition[] = [
  {
    id: 'dagger',
    name: 'dagger',
    description:
      'A short blade useful for quick strikes. ' +
      'Easy to conceal but limited in reach.',
    cost: 2,
    weight: 1,
    damage: 4,
    damageType: 'piercing',
    category: 'melee',
    aliases: ['knife', 'blade'],
  },
  {
    id: 'shortsword',
    name: 'shortsword',
    description:
      'A one-handed sword of modest length. ' +
      'Balanced for both cutting and thrusting.',
    cost: 10,
    weight: 3,
    damage: 6,
    damageType: 'slashing',
    category: 'melee',
    aliases: ['short sword'],
  },
  {
    id: 'longsword',
    name: 'longsword',
    description:
      'A versatile blade that can be wielded with one or two hands. ' +
      'The weapon of choice for many warriors.',
    cost: 25,
    weight: 4,
    damage: 8,
    damageType: 'slashing',
    category: 'melee',
    aliases: ['long sword', 'sword'],
  },
  {
    id: 'battleaxe',
    name: 'battleaxe',
    description:
      'A heavy axe designed for war. ' +
      'Its weight makes each blow devastating.',
    cost: 20,
    weight: 6,
    damage: 10,
    damageType: 'slashing',
    category: 'melee',
    aliases: ['axe', 'battle axe'],
  },
  {
    id: 'warhammer',
    name: 'warhammer',
    description:
      'A hammer with a weighted head designed to crush armor. ' +
      'Effective against heavily armored foes.',
    cost: 15,
    weight: 5,
    damage: 8,
    damageType: 'bludgeoning',
    category: 'melee',
    aliases: ['hammer', 'war hammer'],
  },
];

/**
 * Ranged weapons - used at a distance.
 */
export const RANGED_WEAPONS: WeaponDefinition[] = [
  {
    id: 'shortbow',
    name: 'shortbow',
    description:
      'A compact bow suitable for hunting or skirmishing. ' +
      'Quick to draw but limited in power.',
    cost: 12,
    weight: 2,
    damage: 6,
    damageType: 'piercing',
    category: 'ranged',
    aliases: ['short bow', 'bow'],
  },
  {
    id: 'longbow',
    name: 'longbow',
    description:
      'A tall bow requiring considerable strength to draw. ' +
      'Capable of piercing armor at great distance.',
    cost: 30,
    weight: 3,
    damage: 8,
    damageType: 'piercing',
    category: 'ranged',
    aliases: ['long bow'],
  },
  {
    id: 'crossbow',
    name: 'crossbow',
    description:
      'A mechanical bow that fires bolts with tremendous force. ' +
      'Slow to reload but devastating on impact.',
    cost: 50,
    weight: 8,
    damage: 10,
    damageType: 'piercing',
    category: 'ranged',
    aliases: ['arbalest'],
  },
];

/**
 * All weapons in the game.
 */
export const ALL_WEAPONS: WeaponDefinition[] = [
  ...MELEE_WEAPONS,
  ...RANGED_WEAPONS,
];
