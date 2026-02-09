/**
 * Gas Room Trait (ADR-126)
 *
 * Marker trait for the Gas Room entity, enabling destination interceptor
 * registration. The Gas Room contains flammable gas that explodes on
 * contact with any open flame (torch, candles, match).
 * The brass lantern (electric) is safe.
 *
 * Per MDL source (act3.199).
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

export class GasRoomTrait implements ITrait {
  static readonly type = 'dungeo.trait.gas_room';
  readonly type = GasRoomTrait.type;

  constructor() {}
}

export interface GasRoomTraitConstructor extends ITraitConstructor<GasRoomTrait> {
  readonly type: 'dungeo.trait.gas_room';
}
