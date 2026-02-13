/**
 * Trophy Case Trait (ADR-129)
 *
 * Marker trait for the trophy case entity. When items with TreasureTrait
 * are placed in a container with this trait, the TrophyCasePuttingInterceptor
 * awards trophy case points via world.awardScore().
 */

import { ITrait } from '@sharpee/world-model';

export class TrophyCaseTrait implements ITrait {
  static readonly type = 'dungeo.trait.trophy_case' as const;
  readonly type = TrophyCaseTrait.type;
}
