// packages/world-model/src/traits/backdrop/backdropTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Initialization data for a backdrop.
 */
export interface IBackdropData {
  /** Every room the backdrop is present at, the first being where it lives. */
  roomIds?: string[];
}

/**
 * A backdrop is one scenery thing present in many rooms (ADR-374 D1): the
 * sky over a landing field, the sea along a coast. It lives in the first
 * room of its list, like any thing, and is present at the others the way a
 * door is present at its far side — visible and reachable, never listed.
 *
 * Read by `PresenceBehavior`, which the scope rule and the visibility gates
 * consult. Carries no state of its own beyond the room list.
 */
export class BackdropTrait implements ITrait, IBackdropData {
  static readonly type = TraitType.BACKDROP;
  readonly type = TraitType.BACKDROP;

  roomIds: string[];

  constructor(data: IBackdropData = {}) {
    this.roomIds = [...(data.roomIds ?? [])];
  }
}
