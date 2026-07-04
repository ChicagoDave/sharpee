import { IFEntity } from '@sharpee/world-model';
import { DispenserTrait } from './dispenser-trait.js';

export class DispenserBehavior {
  /**
   * Spend one charge. Returns false if the dispenser is
   * already empty.
   */
  static dispense(dispenser: IFEntity): boolean {
    const trait = dispenser.get(DispenserTrait);
    if (!trait || trait.chargesRemaining <= 0) return false;
    trait.chargesRemaining -= 1;
    return true;
  }

  static isEmpty(dispenser: IFEntity): boolean {
    const trait = dispenser.get(DispenserTrait);
    return !trait || trait.chargesRemaining <= 0;
  }
}
