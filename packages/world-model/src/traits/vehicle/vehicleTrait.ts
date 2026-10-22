/**
 * Vehicle Trait - an enterable thing that carries what it holds when it moves
 *
 * Public interface: `VehicleTrait` (data: the movement model `movement`, the
 * player's command sets and the room it is `boardedThrough`), the movement
 * types `VehicleMovement`, `VehicleNoneMovement`,
 * `VehicleLineMovement`, `VehicleStreetsMovement`, `VehicleCompassMovement`,
 * `VehicleFlightMovement`, `VehicleOpenMovement`, their declaration shapes
 * `VehicleMovementConfig`, the type guard `isVehicleTrait`, and the factory
 * `createVehicleTrait`.
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
 * - ADR-376 D3, D5 — the open model under `use expanses`: heading or course,
 *   a position held only while the vehicle is in the expanse.
 * - ADR-375 D2, D5, D7 — under `use sailing`: a bearing, the pace table by
 *   the angle off the wind, the sails, and irons.
 */

import { TraitType } from '../trait-types.js';
import { ITrait } from '../trait.js';
import type { ExpanseSide, IExpanseCell } from '../expanse/expanseTrait.js';

/** One pace cell of a sailing band (ADR-375 D5): turns per step, or `stopped`. */
export type SailingPace = number | 'stopped';

/** One band of a sailing table (ADR-375 D5, D7): `from` to `to` degrees off the wind, a pace per setting. */
export interface SailingBand {
  from: number;
  to: number;
  /** The setting `null` is the one cell of a vehicle without sails. */
  paces: Array<{ setting: string | null; pace: SailingPace }>;
}

/** The `sailing` block (ADR-375 D5): the bands and the calm row. */
export interface SailingTable {
  bands: SailingBand[];
  calm: SailingPace;
}

/** A vehicle that does not move (ADR-366 D5): a bathtub, a crate the player sits in. */
export interface VehicleNoneMovement {
  kind: 'none';
}

/**
 * The line (ADR-366 D5a): ordered stops the vehicle runs between. GO from
 * inside is refused; the player rides, the world's state or the story drives.
 */
export interface VehicleLineMovement {
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
export interface VehicleStreetsMovement {
  kind: 'streets';
}

/**
 * The compass (ADR-366 D5c): the vehicle keeps a heading and moves one room
 * that way every `pace` turns while the way is admitted.
 */
export interface VehicleCompassMovement {
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
export interface VehicleFlightMovement {
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

/**
 * Open movement (ADR-376 D3, `use expanses`): a position in an expanse
 * rather than a room, stepped `stride` units every `pace` turns along a
 * heading or toward a course. Under way means exactly one of `heading` and
 * `course` is set; at rest both are null. `position` is held only while the
 * vehicle is in the expanse room (D5): at a landmark it is null and the
 * vehicle's location is the one record.
 */
export interface VehicleOpenMovement {
  kind: 'open';
  drive: 'player' | 'control';
  /** Turns per step, one or more. Under sail (`sailing` present) the table sets the pace and this is unread. */
  pace: number;
  /** Units per step, one or more. */
  stride: number;
  /** How far one sees from aboard, in expanse units (D6). */
  sight: number;
  /** What the vehicle shows when seen from a distance (D6, `seen from afar:`). */
  seenFromAfar?: string;
  /**
   * The `sailing` block (ADR-375 D5): present on a sailing vehicle, whose
   * heading is then a bearing and whose pace is the band's.
   */
  sailing?: SailingTable;
  /** `sails:` (ADR-375 D7): the settings, least to most canvas, and the current one (machine state). */
  sails?: { settings: string[]; current: string };
  /**
   * Machine state: the heading — one of the eight compass words, or a
   * bearing in degrees under sail (ADR-375 D2). Null when the vehicle has
   * none; a sailing vehicle keeps its bearing when hove to.
   */
  heading: string | number | null;
  /** Machine state: the cell the vehicle is bound for, or null when not on a course. */
  course: IExpanseCell | null;
  /** Machine state: the coordinates in the expanse (fractional under sail), or null at a landmark (D5). */
  position: IExpanseCell | null;
  /** Machine state: whether the machine is moving the vehicle. */
  underWay: boolean;
  /** Machine state: turns left before the next step. */
  turnsToStep: number;
  /** Machine state: the edge the vehicle stopped at, refusing headings toward it until it steps away (D8). */
  atEdge: ExpanseSide | null;
  /** Machine state (ADR-375 D5): lying still in a `stopped` band under the fullest setting, reported once. */
  inIrons: boolean;
}

/** How a vehicle moves — the declaration of its built-in machine, with the machine's state beside it. */
export type VehicleMovement =
  | VehicleNoneMovement
  | VehicleLineMovement
  | VehicleStreetsMovement
  | VehicleCompassMovement
  | VehicleFlightMovement
  | VehicleOpenMovement;

type LineState = 'underWay' | 'travelDirection' | 'turnsToStep';
type CompassState = 'heading' | 'turnsToStep';
type FlightState = 'destination' | 'turnsRemaining';
type OpenState = 'heading' | 'course' | 'position' | 'underWay' | 'turnsToStep' | 'atEdge' | 'inIrons';

/**
 * A model as declared: the machine's state fields are optional and start at
 * rest (not under way, onward, no heading, no destination).
 */
export type VehicleMovementConfig =
  | VehicleNoneMovement
  | VehicleStreetsMovement
  | (Omit<VehicleLineMovement, LineState> & Partial<Pick<VehicleLineMovement, LineState>>)
  | (Omit<VehicleCompassMovement, CompassState> & Partial<Pick<VehicleCompassMovement, CompassState>>)
  | (Omit<VehicleFlightMovement, FlightState> & Partial<Pick<VehicleFlightMovement, FlightState>>)
  | (Omit<VehicleOpenMovement, OpenState> & Partial<Pick<VehicleOpenMovement, OpenState>>);

/**
 * Configuration options for VehicleTrait
 */
export interface VehicleTraitConfig {
  /** `movement:` and the lines its type takes (ADR-366 D5). */
  movement?: VehicleMovementConfig;
  /** The player's command sets (`commands:`), present on a player-driven vehicle. */
  commands?: string[];
  /** The room `boarded through:` names (ADR-366 D7), present on a vehicle with rooms aboard. */
  boardedThrough?: string;
}

/**
 * Trait for vehicles - enterable things that transport what they hold
 */
export class VehicleTrait implements ITrait {
  static readonly type = TraitType.VEHICLE;
  readonly type = TraitType.VEHICLE;

  /** The movement model (`movement:`); undefined means the vehicle does not move under GO. */
  movement?: VehicleMovement;
  /** The player's command sets (ADR-366 D5i); absent when the player drives nothing. */
  commands?: string[];
  /**
   * The room id `boarded through:` names (ADR-366 D7): `enter` and `board`
   * put the player there. Absent on a vehicle with no rooms aboard, which
   * is entered as any enterable thing is.
   */
  boardedThrough?: string;

  constructor(config: VehicleTraitConfig = {}) {
    if (config.movement) this.movement = VehicleTrait.buildMovement(config.movement);
    if (config.commands) this.commands = [...config.commands];
    if (config.boardedThrough !== undefined) this.boardedThrough = config.boardedThrough;
  }

  /**
   * Build a movement model from its declaration, holding the invariants the analyzer
   * reports first: two stops, none repeated; two destinations; a pace, a
   * stride of at least one; an open vehicle on at most one of heading and
   * course. The machine's state starts at rest unless the declaration
   * carries it.
   * @throws when an invariant is broken
   */
  private static buildMovement(config: VehicleMovementConfig): VehicleMovement {
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
      case 'open': {
        if (!Number.isInteger(config.pace) || config.pace < 1) {
          throw new Error('VehicleTrait: a pace is a whole number of turns, one or more');
        }
        if (!Number.isInteger(config.stride) || config.stride < 1) {
          throw new Error('VehicleTrait: a stride is a whole number of units, one or more');
        }
        if (typeof config.sight !== 'number' || config.sight < 0) {
          throw new Error('VehicleTrait: sight is zero or more');
        }
        const heading = config.heading ?? null;
        const course = config.course ? { x: config.course.x, y: config.course.y } : null;
        if (heading !== null && course !== null && !config.sailing) {
          throw new Error('VehicleTrait: an open vehicle steers by a heading or a course, not both');
        }
        if (config.sails && (config.sails.settings.length === 0 || !config.sails.settings.includes(config.sails.current))) {
          throw new Error('VehicleTrait: sails name their settings and start in one of them');
        }
        return {
          kind: 'open',
          drive: config.drive,
          pace: config.pace,
          stride: config.stride,
          sight: config.sight,
          ...(config.seenFromAfar !== undefined ? { seenFromAfar: config.seenFromAfar } : {}),
          ...(config.sailing ? { sailing: { bands: config.sailing.bands.map((b) => ({ from: b.from, to: b.to, paces: b.paces.map((p) => ({ ...p })) })), calm: config.sailing.calm } } : {}),
          ...(config.sails ? { sails: { settings: [...config.sails.settings], current: config.sails.current } } : {}),
          heading,
          course,
          position: config.position ? { x: config.position.x, y: config.position.y } : null,
          underWay: config.underWay ?? (heading !== null || course !== null),
          turnsToStep: config.turnsToStep ?? 0,
          atEdge: config.atEdge ?? null,
          inIrons: config.inIrons ?? false,
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
