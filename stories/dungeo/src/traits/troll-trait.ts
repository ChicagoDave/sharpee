/**
 * Troll Trait
 *
 * Trait for the troll NPC. Declares capabilities for giving and throwing
 * (ADR-090) and has interceptors (ADR-118) for taking, attacking, talking.
 *
 * Capability behaviors (in troll-receiving-behavior.ts):
 * - if.action.giving: Catch/eat items, throw knife back
 * - if.action.throwing: Same behavior as giving
 *
 * Interceptors (in troll-capability-behaviors.ts):
 * - TrollTakingInterceptor: Block TAKE TROLL ("spits in your face")
 * - TrollAttackingInterceptor: Block unarmed ATTACK ("laughs at puny gesture")
 * - TrollTalkingInterceptor: Block TALK when incapacitated ("can't hear you")
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
  static readonly capabilities = ['if.action.giving', 'if.action.throwing'] as const;

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
