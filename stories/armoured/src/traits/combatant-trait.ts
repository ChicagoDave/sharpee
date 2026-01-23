import { ITrait } from '@sharpee/world-model';

/**
 * CombatantTrait - Makes an entity capable of combat.
 *
 * This trait tracks combat state for actors (player, NPCs, monsters).
 * Equipment bonuses are calculated dynamically from worn/wielded items.
 *
 * Usage:
 *   player.add(new CombatantTrait({
 *     maxHealth: 20,
 *     currentHealth: 20,
 *     baseArmorClass: 10
 *   }));
 */
export class CombatantTrait implements ITrait {
  static readonly type = 'armoured.trait.combatant' as const;
  readonly type = CombatantTrait.type;

  /**
   * Maximum health points.
   */
  maxHealth: number;

  /**
   * Current health points. At 0, the combatant is defeated.
   */
  currentHealth: number;

  /**
   * Base armor class without any equipment (typically 10).
   */
  baseArmorClass: number;

  /**
   * Attack bonus added to hit rolls.
   */
  attackBonus: number;

  /**
   * Whether this combatant is still able to fight.
   */
  isAlive: boolean;

  constructor(config: {
    maxHealth: number;
    currentHealth?: number;
    baseArmorClass?: number;
    attackBonus?: number;
  }) {
    this.maxHealth = config.maxHealth;
    this.currentHealth = config.currentHealth ?? config.maxHealth;
    this.baseArmorClass = config.baseArmorClass ?? 10;
    this.attackBonus = config.attackBonus ?? 0;
    this.isAlive = true;
  }
}
