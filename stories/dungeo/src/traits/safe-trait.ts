/**
 * Safe Trait - Marker trait for the rusty safe in Dusty Room
 *
 * Used to register the safe opening interceptor (blocks OPEN when rusted shut).
 * State is tracked via entity.attributes:
 * - rustedShut: true until brick explosion
 * - safeBlownOpen: true after explosion
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

export class SafeTrait implements ITrait {
  static readonly type = 'dungeo.trait.safe' as const;
  readonly type = SafeTrait.type;

  constructor() {
    // Marker trait — state is on entity.attributes
  }
}

export const SafeTraitConstructor: ITraitConstructor<SafeTrait> = SafeTrait;
