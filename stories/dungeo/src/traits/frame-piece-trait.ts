/**
 * Frame Piece Trait
 *
 * Marker trait for the frame piece entity. Used by the ghost ritual
 * dropping interceptor (ADR-118) to identify the frame piece when dropped.
 *
 * Room IDs for the ritual (Basin Room, Gallery) are stored as world
 * state values set during story initialization.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

export class FramePieceTrait implements ITrait {
  static readonly type = 'dungeo.trait.frame_piece' as const;
  readonly type = FramePieceTrait.type;

  constructor() {}
}

export const FramePieceTraitConstructor: ITraitConstructor<FramePieceTrait> = FramePieceTrait;
