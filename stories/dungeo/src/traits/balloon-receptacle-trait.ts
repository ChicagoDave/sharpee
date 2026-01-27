/**
 * Balloon Receptacle Trait
 *
 * Marks the receptacle (brazier) in the balloon as intercepting PUT actions.
 * When a burning object is placed in the receptacle, it heats the cloth bag
 * and inflates the balloon.
 *
 * The actual balloon state is tracked via BalloonStateTrait on the balloon entity.
 * This trait just stores the connection between receptacle and balloon.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the BalloonReceptacleTrait
 */
export interface BalloonReceptacleTraitConfig {
  /** Entity ID of the balloon basket */
  balloonId: string;
}

/**
 * Balloon Receptacle Trait - connects receptacle to balloon state
 */
export class BalloonReceptacleTrait implements ITrait {
  static readonly type = 'dungeo.trait.balloon_receptacle';
  readonly type = BalloonReceptacleTrait.type;

  /** Entity ID of the balloon basket */
  balloonId: string;

  constructor(config: BalloonReceptacleTraitConfig) {
    this.balloonId = config.balloonId;
  }
}

/**
 * Type guard for BalloonReceptacleTrait
 */
export interface BalloonReceptacleTraitConstructor extends ITraitConstructor<BalloonReceptacleTrait> {
  readonly type: 'dungeo.trait.balloon_receptacle';
}
