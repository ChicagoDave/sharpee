/**
 * Burnable Trait
 *
 * Trait for marking entities that can be burned/set on fire.
 * Used by incense, guidebook, newspaper, and other flammable items.
 *
 * Replaces the anti-pattern of (entity as any).isBurning = true/false.
 * This trait persists through checkpoint save/restore, unlike custom properties.
 *
 * Different burnable types:
 * - 'incense': Burns for fixed duration via fuse (3 turns)
 * - 'candle': Burns via LightSourceTrait + fuse (50 turns)
 * - 'flammable': Burns based on size (size * 20 turns)
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the burnable trait
 */
export interface BurnableTraitConfig {
  /** Type of burnable item - affects behavior */
  burnableType: 'incense' | 'candle' | 'flammable';

  /** Whether the entity is currently burning (default: false) */
  isBurning?: boolean;

  /** Whether the entity has fully burned out (default: false) */
  burnedOut?: boolean;

  /** Turns of burning remaining for duration-based burns */
  burnTurnsRemaining?: number;

  /** Size factor for calculating burn duration (size * 20 = turns) */
  size?: number;
}

/**
 * Burnable Trait
 *
 * Entities with this trait can be:
 * - Lit on fire (BURN, LIGHT actions)
 * - Used as heat sources (balloon receptacle)
 * - Consumed over time (fuses/daemons)
 *
 * The burn action and light action check for this trait to determine
 * if an entity can be burned. The balloon handler checks isBurning
 * to determine if the balloon should inflate.
 */
export class BurnableTrait implements ITrait {
  static readonly type = 'dungeo.trait.burnable' as const;

  readonly type = BurnableTrait.type;

  /** Type of burnable item - affects behavior */
  burnableType: 'incense' | 'candle' | 'flammable';

  /** Whether the entity is currently burning */
  isBurning: boolean;

  /** Whether the entity has fully burned out */
  burnedOut: boolean;

  /** Turns of burning remaining (for duration-based burns) */
  burnTurnsRemaining: number;

  /** Size factor for burn duration calculation */
  size: number;

  constructor(config: BurnableTraitConfig) {
    this.burnableType = config.burnableType;
    this.isBurning = config.isBurning ?? false;
    this.burnedOut = config.burnedOut ?? false;
    this.burnTurnsRemaining = config.burnTurnsRemaining ?? 0;
    this.size = config.size ?? 1;
  }
}

// Ensure the class implements ITraitConstructor
export const BurnableTraitConstructor: ITraitConstructor<BurnableTrait> = BurnableTrait;
