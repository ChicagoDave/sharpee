/**
 * Troll Trait
 *
 * Marker trait for the troll NPC. Custom action handling uses interceptors
 * (ADR-118) registered on this trait type, not capability dispatch.
 *
 * Interceptors (in troll-capability-behaviors.ts):
 * - TrollTakingInterceptor: Block TAKE TROLL ("spits in your face")
 * - TrollAttackingInterceptor: Block unarmed ATTACK ("laughs at puny gesture")
 * - TrollTalkingInterceptor: Block TALK when incapacitated ("can't hear you")
 *
 * Event handlers (in underground.ts):
 * - GIVE/THROW: Catch/eat items, throw knife back
 *
 * From MDL source (act1.254, dung.355)
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the troll trait
 */
export interface TrollTraitConfig {
  /** Room ID where troll resides (for exit blocking) */
  roomId: string;
  /** Entity ID of troll's axe */
  axeId: string;
}

/**
 * Troll Trait
 *
 * Entities with this trait have troll-specific interceptors registered
 * for taking, attacking, and talking actions.
 */
export class TrollTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll' as const;

  readonly type = TrollTrait.type;

  /** Room ID where troll resides */
  roomId: string;

  /** Entity ID of troll's axe */
  axeId: string;

  constructor(config: TrollTraitConfig) {
    this.roomId = config.roomId;
    this.axeId = config.axeId;
  }
}

// Ensure the class implements ITraitConstructor
export const TrollTraitConstructor: ITraitConstructor<TrollTrait> = TrollTrait;
