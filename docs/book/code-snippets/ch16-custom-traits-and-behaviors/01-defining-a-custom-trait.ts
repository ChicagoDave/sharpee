import { ITrait } from '@sharpee/world-model';

export class DispenserTrait implements ITrait {
  static readonly type = 'zoo.trait.dispenser';
  readonly type = DispenserTrait.type;

  /** How many servings remain. */
  chargesRemaining = 3;

  constructor(data?: Partial<DispenserTrait>) {
    if (data) Object.assign(this, data);
  }
}
