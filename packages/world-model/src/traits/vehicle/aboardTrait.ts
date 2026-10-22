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

/**
 * One `to outside` exit of a room aboard a vehicle: a computed-exit
 * declaration, whose `via` is the hatch the line named, if any.
 */
export type IOutsideExit = IComputedExitDeclaration;

export interface IAboardData {
  /** The vehicle this room is inside. */
  vehicleId: string;
  /** The directions that lead outside, each with the rooms the vehicle can be in. */
  outside?: Partial<Record<DirectionType, IOutsideExit>>;
}

/**
 * Trait for a room aboard a vehicle. Its `computedExits` are the room's
 * `to outside` exits — one record each, the candidates and the door — so the
 * room behavior's computed-exit lookup finds them without knowing vehicles
 * exist, and the outside-exit resolver reads the door from the same record.
 */
export class AboardTrait implements ITrait, IComputedExitCarrier {
  static readonly type = TraitType.ABOARD;
  readonly type = TraitType.ABOARD;

  vehicleId: string;
  /** The `to outside` exits (ADR-366 D7), each a computed-exit declaration (ADR-295 D3) with its door. */
  computedExits: Partial<Record<DirectionType, IOutsideExit>>;

  constructor(data: IAboardData) {
    this.vehicleId = data.vehicleId;
    this.computedExits = {};
    for (const [direction, exit] of Object.entries(data.outside ?? {}) as Array<[DirectionType, IOutsideExit]>) {
      this.computedExits[direction] = { candidates: [...exit.candidates], ...(exit.via !== undefined ? { via: exit.via } : {}) };
    }
  }
}

/**
 * Type guard for AboardTrait
 */
export function isAboardTrait(trait: ITrait): trait is AboardTrait {
  return trait.type === TraitType.ABOARD;
}
