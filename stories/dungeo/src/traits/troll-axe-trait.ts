/**
 * Troll Axe Trait
 *
 * Trait for the troll's bloody axe. Claims capabilities for:
 * - 'if.action.taking': Blocks taking while troll is alive (white-hot message)
 * - 'if.scope.visible': Hides axe when troll is unconscious
 *
 * From MDL source (act1.254:176-180):
 * <DEFINE AXE-FUNCTION ()
 *   <COND (<VERB? "TAKE">
 *          <TELL "The troll's axe seems white-hot. You can't hold on to it.">
 *          T)>>
 *
 * From MDL source (act1.254:OUT!):
 * <TRZ .A ,OVISON>  ; Hide axe when troll knocked out
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the troll axe
 */
export interface TrollAxeConfig {
  /** Entity ID of the guardian (troll) */
  guardianId: string;
}

/**
 * Troll Axe Trait
 *
 * Entities with this trait have their taking action intercepted
 * by the TrollAxeTakingBehavior which checks if the guardian is alive.
 */
export class TrollAxeTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll_axe' as const;
  static readonly interceptors = [
    'if.action.taking'    // Block taking while troll alive (ADR-118)
  ] as const;
  static readonly capabilities = [
    'if.scope.visible'    // Hide when troll unconscious
  ] as const;

  readonly type = TrollAxeTrait.type;

  /** Entity ID of the guardian (troll) */
  guardianId: string;

  constructor(config: TrollAxeConfig) {
    this.guardianId = config.guardianId;
  }
}

// Ensure the class implements ITraitConstructor
export const TrollAxeTraitConstructor: ITraitConstructor<TrollAxeTrait> = TrollAxeTrait;
