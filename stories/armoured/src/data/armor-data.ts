import type { ArmorSlot } from '../traits';

/**
 * Armor definition - all properties needed to create an armor entity.
 */
export interface ArmorDefinition {
  /** Unique identifier for this armor type */
  id: string;
  /** Display name */
  name: string;
  /** Description when examined */
  description: string;
  /** Cost in gold pieces */
  cost: number;
  /** Weight in pounds */
  weight: number;
  /** Armor class provided */
  armorClass: number;
  /** Where this armor is worn */
  slot: ArmorSlot;
  /** Alternative names the player can use */
  aliases?: string[];
}

/**
 * Body armor - worn on the torso, provides base AC.
 */
export const BODY_ARMOR: ArmorDefinition[] = [
  {
    id: 'padded-robe',
    name: 'padded robe',
    description:
      'A simple robe with light padding sewn into the lining. ' +
      'It offers minimal protection but allows freedom of movement.',
    cost: 0.5,
    weight: 3,
    armorClass: 11,
    slot: 'body',
    aliases: ['robe', 'padded'],
  },
  {
    id: 'leather-armor',
    name: 'leather armor',
    description:
      'Hardened leather shaped to cover the torso and shoulders. ' +
      'A reliable choice for those who value mobility.',
    cost: 15,
    weight: 20,
    armorClass: 13,
    slot: 'body',
    aliases: ['leather', 'leathers'],
  },
  {
    id: 'chain-mail',
    name: 'chain mail',
    description:
      'Interlocking metal rings form a flexible mesh that covers the body. ' +
      'The weight is considerable but the protection is solid.',
    cost: 75,
    weight: 50,
    armorClass: 15,
    slot: 'body',
    aliases: ['chain', 'chainmail', 'mail'],
  },
  {
    id: 'plate-mail',
    name: 'plate mail',
    description:
      'Fitted plates of steel cover nearly every vulnerable point. ' +
      'This is the armor of knights and champions.',
    cost: 400,
    weight: 80,
    armorClass: 17,
    slot: 'body',
    aliases: ['plate', 'platemail', 'full plate'],
  },
];

/**
 * Shields - held in off-hand, adds to AC.
 */
export const SHIELDS: ArmorDefinition[] = [
  {
    id: 'wooden-shield',
    name: 'wooden shield',
    description:
      'A round shield of sturdy oak bound with iron. ' +
      'Light enough to maneuver quickly.',
    cost: 1,
    weight: 5,
    armorClass: 1,
    slot: 'shield',
    aliases: ['wood shield', 'round shield'],
  },
  {
    id: 'metal-shield',
    name: 'metal shield',
    description:
      'A kite-shaped shield of hammered steel. ' +
      'Heavy but capable of turning aside powerful blows.',
    cost: 5,
    weight: 15,
    armorClass: 2,
    slot: 'shield',
    aliases: ['steel shield', 'kite shield', 'iron shield'],
  },
];

/**
 * All armor in the game.
 */
export const ALL_ARMOR: ArmorDefinition[] = [...BODY_ARMOR, ...SHIELDS];
