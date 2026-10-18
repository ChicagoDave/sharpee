/**
 * Vehicle Trait - an enterable thing that carries what it holds when it moves
 *
 * Public interface: `VehicleTrait` (data: the movement model and the
 * player's command sets), the model types `VehicleModel`, `VehicleNoneModel`,
 * `VehicleLineModel`, `VehicleStreetsModel`, `VehicleCompassModel`,
 * `VehicleFlightModel`, their declaration shapes `VehicleModelConfig`, the
 * type guard `isVehicleTrait`, and the factory `createVehicleTrait`.
 *
 * Owner context: world-model traits. The trait carries exactly what the
 * language can write about a vehicle and nothing else: its movement model,
 * which is the declaration of the vehicle's built-in machine, and the
 * machine's own state as plain fields beside it, so a voyage survives a
 * save with every other trait field. Where the vehicle is, which stop it is
 * at, and whether it holds its riders in or on are read from the world (the
 * vehicle's location) and from `EnterableTrait.preposition`, never copied
 * here.
 *
 * Moving a vehicle moves what it holds: containment is relational, so
 * `WorldModel.moveEntity` on the vehicle carries every held entity at every
 * depth, with no vehicle-specific move.
 *
 * References:
 * - ADR-366 D5, D5a–D5d — the five movement types and what each declares.
 * - ADR-366 D5e, D5g — the machine is the vehicle's own; its state is trait data.
 * - ADR-366 D8, D9 — nothing else on the trait; location is read, never copied.
 * - ADR-366 D4 — moving a vehicle moves what it holds.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';

/** A vehicle that does not move (ADR-366 D5): a bathtub, a crate the player sits in. */
export interface VehicleNoneModel {
  kind: 'none';
}

/**
 * The line (ADR-366 D5a): ordered stops the vehicle runs between. GO from
 * inside is refused; the player rides, the world's state or the story drives.
 */
export interface VehicleLineModel {
  kind: 'line';
  /** Room ids of the stops, in line order. At least two, no repeats. */
  stops: string[];
  /** True for `direction: one-way`: the line is travelled first to last only. */
  oneWay: boolean;
  /** `drive: state` (its `position` rows decide) or `drive: control` (`start`/`stop`). */
  drive: 'state' | 'control';
  /** Turns per step under `drive: control`, one or more. */
  pace?: number;
  /** Machine state: the vehicle is stepping along the line. */
  underWay: boolean;
  /** Machine state: which way along the stops it is travelling. */
  travelDirection: 'onward' | 'back';
  /** Machine state: turns left before the next step. */
  turnsToStep: number;
}

/**
 * The streets (ADR-366 D5b): GO from inside moves the vehicle along the
 * current room's exit when the destination room admits it.
 */
export interface VehicleStreetsModel {
  kind: 'streets';
}

/**
 * The compass (ADR-366 D5c): the vehicle keeps a heading and moves one room
 * that way every `pace` turns while the way is admitted.
 */
export interface VehicleCompassModel {
  kind: 'compass';
  drive: 'player' | 'control';
  /** Turns per step, one or more. */
  pace: number;
  /** Machine state: the heading, or null when not under way. */
  heading: string | null;
  /** Machine state: turns left before the next step. */
  turnsToStep: number;
}

/**
 * Free flight (ADR-366 D5d): any destination to any other, nowhere for the
 * passage, then arrival.
 */
export interface VehicleFlightModel {
  kind: 'flight';
  drive: 'player' | 'control';
  /** Room ids the vehicle may fly between. At least two. */
  destinations: string[];
  /** Turns the passage takes, one or more. */
  passage: number;
  /** Machine state: where it is bound, or null when not under way. */
  destination: string | null;
  /** Machine state: turns left in the passage. */
  turnsRemaining: number;
}

/** How a vehicle moves — the declaration of its built-in machine, with the machine's state beside it. */
export type VehicleModel =
  | VehicleNoneModel
  | VehicleLineModel
  | VehicleStreetsModel
  | VehicleCompassModel
  | VehicleFlightModel;

type LineState = 'underWay' | 'travelDirection' | 'turnsToStep';
type CompassState = 'heading' | 'turnsToStep';
type FlightState = 'destination' | 'turnsRemaining';

/**
 * A model as declared: the machine's state fields are optional and start at
 * rest (not under way, onward, no heading, no destination).
 */
export type VehicleModelConfig =
  | VehicleNoneModel
  | VehicleStreetsModel
  | (Omit<VehicleLineModel, LineState> & Partial<Pick<VehicleLineModel, LineState>>)
  | (Omit<VehicleCompassModel, CompassState> & Partial<Pick<VehicleCompassModel, CompassState>>)
  | (Omit<VehicleFlightModel, FlightState> & Partial<Pick<VehicleFlightModel, FlightState>>);

/**
 * Configuration options for VehicleTrait
 */
export interface VehicleTraitConfig {
  model?: VehicleModelConfig;
  /** The player's command sets (`commands:`), present on a player-driven vehicle. */
  commands?: string[];
}

/**
 * Trait for vehicles - enterable things that transport what they hold
 */
export class VehicleTrait implements ITrait {
  static readonly type = TraitType.VEHICLE;
  readonly type = TraitType.VEHICLE;

  /** The movement model; undefined means the vehicle does not move under GO. */
  model?: VehicleModel;
  /** The player's command sets (ADR-366 D5i); absent when the player drives nothing. */
  commands?: string[];

  constructor(config: VehicleTraitConfig = {}) {
    const model = config.model;
    if (model) this.model = VehicleTrait.buildModel(model);
    if (config.commands) this.commands = [...config.commands];
  }

  /**
   * Build a model from its declaration, holding the invariants the analyzer
   * reports first: two stops, none repeated; two destinations; a pace of at
   * least one. The machine's state starts at rest unless the declaration
   * carries it.
   * @throws when an invariant is broken
   */
  private static buildModel(config: VehicleModelConfig): VehicleModel {
    switch (config.kind) {
      case 'none':
      case 'streets':
        return { kind: config.kind };
      case 'line': {
        const { stops } = config;
        if (stops.length < 2) {
          throw new Error('VehicleTrait: a line needs at least two stops');
        }
        if (new Set(stops).size !== stops.length) {
          throw new Error('VehicleTrait: a line names each stop once');
        }
        if (config.pace !== undefined && (!Number.isInteger(config.pace) || config.pace < 1)) {
          throw new Error('VehicleTrait: a pace is a whole number of turns, one or more');
        }
        return {
          kind: 'line',
          stops: [...stops],
          oneWay: config.oneWay,
          drive: config.drive,
          ...(config.pace !== undefined ? { pace: config.pace } : {}),
          underWay: config.underWay ?? false,
          travelDirection: config.travelDirection ?? 'onward',
          turnsToStep: config.turnsToStep ?? 0,
        };
      }
      case 'compass': {
        if (!Number.isInteger(config.pace) || config.pace < 1) {
          throw new Error('VehicleTrait: a pace is a whole number of turns, one or more');
        }
        return {
          kind: 'compass',
          drive: config.drive,
          pace: config.pace,
          heading: config.heading ?? null,
          turnsToStep: config.turnsToStep ?? 0,
        };
      }
      case 'flight': {
        if (new Set(config.destinations).size < 2) {
          throw new Error('VehicleTrait: a flight needs at least two destinations');
        }
        if (!Number.isInteger(config.passage) || config.passage < 1) {
          throw new Error('VehicleTrait: a passage is a whole number of turns, one or more');
        }
        return {
          kind: 'flight',
          drive: config.drive,
          destinations: [...new Set(config.destinations)],
          passage: config.passage,
          destination: config.destination ?? null,
          turnsRemaining: config.turnsRemaining ?? 0,
        };
      }
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
