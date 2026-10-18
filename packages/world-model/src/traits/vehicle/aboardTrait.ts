/**
 * Aboard Trait - a room inside a vehicle, and its exits to outside
 *
 * Public interface: `AboardTrait` (data: the vehicle the room is aboard and
 * the directions that lead outside, each a computed exit whose candidates
 * are the rooms the vehicle can be in), `IAboardData`, `isAboardTrait`.
 *
 * Owner context: world-model traits. A room aboard a vehicle is that
 * vehicle's interior: whoever is in it is aboard for every purpose, and an
 * exit written `to outside` lands wherever the vehicle is. The trait is
 * pure data; the traversal-time answer is the vehicle exit resolver in
 * `vehicleBehavior.ts`, registered per world under this trait's type, as
 * every computed exit's resolver is.
 *
 * References:
 * - ADR-366 D7 — rooms aboard, the boarding room, `<direction> to outside`.
 * - ADR-295 D3, D4 — computed exits: declared candidates, a registered resolver.
 */

import type { DirectionType } from '../../constants/directions.js';
import type { IComputedExitCarrier, IComputedExitDeclaration } from '../room/computedExitContract.js';
import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

/** One `to outside` exit of a room aboard a vehicle. */
export interface IOutsideExit extends IComputedExitDeclaration {
  /** The door the exit passes through, if the line named one. */
  via?: string;
}

export interface IAboardData {
  /** The vehicle this room is inside. */
  vehicleId: string;
  /** The directions that lead outside, each with the rooms the vehicle can be in. */
  outside?: Partial<Record<DirectionType, IOutsideExit>>;
}

/**
 * Trait for a room aboard a vehicle. Its `computedExits` are the room's
 * `to outside` exits, so the room behavior's computed-exit lookup finds them
 * without knowing vehicles exist.
 */
export class AboardTrait implements ITrait, IAboardData, IComputedExitCarrier {
  static readonly type = TraitType.ABOARD;
  readonly type = TraitType.ABOARD;

  vehicleId: string;
  outside: Partial<Record<DirectionType, IOutsideExit>>;
  /** The computed-exit declarations (ADR-295 D3): one per `to outside` direction. */
  computedExits: Partial<Record<DirectionType, IComputedExitDeclaration>>;

  constructor(data: IAboardData) {
    this.vehicleId = data.vehicleId;
    this.outside = {};
    this.computedExits = {};
    for (const [direction, exit] of Object.entries(data.outside ?? {}) as Array<[DirectionType, IOutsideExit]>) {
      this.outside[direction] = { candidates: [...exit.candidates], ...(exit.via !== undefined ? { via: exit.via } : {}) };
      this.computedExits[direction] = { candidates: [...exit.candidates] };
    }
  }
}

/**
 * Type guard for AboardTrait
 */
export function isAboardTrait(trait: ITrait): trait is AboardTrait {
  return trait.type === TraitType.ABOARD;
}
