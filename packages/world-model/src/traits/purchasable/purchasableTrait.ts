/**
 * Purchasable trait (ADR-372 D5) — marks a thing the buying action may
 * target and carries its price. The money itself is not here: whoever
 * registers the buying capability behavior on this trait owns the purse
 * (the Chord story-loader spends a counter on the buyer named by
 * `currency`; a TypeScript story registers its own).
 *
 * Public interface: PurchasableTrait, IPurchasableData.
 * Owner context: @sharpee/world-model / traits
 */

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/** Data for the purchasable trait: a price in one named currency. */
export interface IPurchasableData {
  /** What the thing costs, a non-negative whole number */
  price: number;

  /** The currency word the price is in (`credits`) — the purse the behavior spends */
  currency: string;
}

/**
 * Purchasable trait — eligibility and price only. The sale's outcome is the
 * thing's registered implementation of `if.action.buying` (an ADR-090
 * capability behavior); the standard buying action never mutates state.
 */
export class PurchasableTrait implements ITrait, IPurchasableData {
  static readonly type = TraitType.PURCHASABLE;
  static readonly capabilities = ['if.action.buying'] as const;
  readonly type = TraitType.PURCHASABLE;

  price: number;
  currency: string;

  constructor(data: IPurchasableData) {
    if (!Number.isInteger(data.price) || data.price < 0) {
      throw new Error(`A price must be a non-negative whole number (got ${data.price}).`);
    }
    if (!data.currency) {
      throw new Error('A price must name its currency.');
    }
    this.price = data.price;
    this.currency = data.currency;
  }
}
