/**
 * Vehicle Trait - an enterable thing that carries what it holds when it moves
 *
 * Public interface: `VehicleTrait` (data: the movement model), the model
 * types `VehicleModel`, `VehicleLineModel`, `VehicleStreetsModel`, the type
 * guard `isVehicleTrait`, and the factory `createVehicleTrait`.
 *
 * Owner context: world-model traits. The trait carries exactly what the
 * language can write about a vehicle and nothing else (ADR-366 D8): its
 * movement model. Where the vehicle is, which stop it is at, and whether it
 * holds its riders in or on are read from the world (the vehicle's location,
 * D9) and from `EnterableTrait.preposition`, never copied here.
 *
 * Moving a vehicle moves what it holds (D4): containment is relational, so
 * `WorldModel.moveEntity` on the vehicle carries every held entity at every
 * depth, with no vehicle-specific move.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

/**
 * The line (ADR-366 D5a): ordered stops the story drives the vehicle between.
 * GO from inside is refused; the player rides, the story drives.
 */
export interface VehicleLineModel {
  kind: 'line';
  /** Room ids of the stops, in line order. At least two, no repeats. */
  stops: string[];
  /** True for `runs from ... to ...`: the line is travelled one way only. */
  oneWay: boolean;
}

/**
 * The streets (ADR-366 D5b): GO from inside moves the vehicle along the
 * current room's exit when the destination room admits it.
 */
export interface VehicleStreetsModel {
  kind: 'streets';
}

/**
 * How a vehicle moves. A vehicle with no model does not move under the
 * player's GO (a bathtub, a crate the player can sit in).
 */
export type VehicleModel = VehicleLineModel | VehicleStreetsModel;

/**
 * Configuration options for VehicleTrait
 */
export interface VehicleTraitConfig {
  model?: VehicleModel;
}

/**
 * Trait for vehicles - enterable things that transport what they hold
 */
export class VehicleTrait implements ITrait {
  static readonly type = TraitType.VEHICLE;
  readonly type = TraitType.VEHICLE;

  /** The movement model; undefined means the vehicle does not move under GO. */
  model?: VehicleModel;

  constructor(config: VehicleTraitConfig = {}) {
    if (config.model?.kind === 'line') {
      const { stops } = config.model;
      if (stops.length < 2) {
        throw new Error('VehicleTrait: a line needs at least two stops');
      }
      if (new Set(stops).size !== stops.length) {
        throw new Error('VehicleTrait: a line names each stop once');
      }
      this.model = { kind: 'line', stops: [...stops], oneWay: config.model.oneWay };
    } else if (config.model) {
      this.model = { ...config.model };
    }
  }
}

/**
 * Type guard for VehicleTrait
 */
export function isVehicleTrait(trait: ITrait): trait is VehicleTrait {
  return trait.type === TraitType.VEHICLE;
}

/**
 * Factory function for creating VehicleTrait
 */
export function createVehicleTrait(config: VehicleTraitConfig = {}): VehicleTrait {
  return new VehicleTrait(config);
}
