import { ITrait } from '@sharpee/world-model';

/**
 * ValueTrait - Provides economic value for buying/selling.
 *
 * This trait handles monetary worth, separate from other properties.
 * Any entity that can be bought or sold should have this trait.
 *
 * Usage:
 *   chainmail.add(new ValueTrait({ cost: 75 }));
 */
export class ValueTrait implements ITrait {
  static readonly type = 'armoured.trait.value' as const;
  readonly type = ValueTrait.type;

  /**
   * Base cost in gold pieces.
   */
  cost: number;

  constructor(config: { cost: number }) {
    this.cost = config.cost;
  }
}
