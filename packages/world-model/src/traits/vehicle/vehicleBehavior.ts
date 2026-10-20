/**
 * Vehicle Behavior - the rules a vehicle's movement model decides
 *
 * Public interface: `isVehicle`, `isActorInVehicle`, `getActorVehicle`,
 * `getVehicleOccupants`, `isAboardVehicle`, `getVehicleAboard`,
 * `takesCommandSet` (where an actor rides and what they may say there),
 * `goingFromVehicle` (what GO means from inside), `admitsVehicle`,
 * `isUnderWay`, the driving statements `startVehicle`, `stopVehicle` and
 * `sendVehicle`, the machine's per-turn step `stepVehicle` with its result
 * `VehicleStep`, the line model's `isStop`, `currentStop` and
 * `moveVehicleToStop`, and the rooms-aboard half:
 * `vehicleOutsideExitResolver` and `registerVehicleExitResolver` (an exit
 * `to outside` lands where the vehicle is), the expanse half of exiting
 * and entering: `leaveVehicleIntoExpanse` and `boardFromExpanse` (ADR-376 D9),
 * and the sailing half (ADR-375): `turnHeading`, `comeAbout`, `setSails`,
 * `makeSail`, `shortenSail`, `furlSails`, `paceUnderSail`, `windOf`.
 *
 * Owner context: world-model vehicle behavior. Every answer is read from
 * the world and the trait's model; nothing here keeps a position of its own.
 * Moving a vehicle is `WorldModel.moveEntity`, which carries what the
 * vehicle holds because containment is relational. The stepping functions
 * are the whole of the vehicle's built-in machine: the turn host that calls
 * them once per turn decides nothing about movement.
 *
 * References:
 * - ADR-366 D4 — moving a vehicle moves what it holds.
 * - ADR-366 D5, D5a–D5d — what GO means from inside; what a step is per type.
 * - ADR-366 D5e, D5g — the machine is the vehicle's own; its state is trait data.
 * - ADR-366 D6 — a room admits the steered vehicles it names.
 * - ADR-366 D7 — rooms aboard; `to outside` resolves to the vehicle's room,
 *   and refuses with `vehicle-under-way` while the vehicle is nowhere.
 * - ADR-366 D9 — the vehicle's location is the one fact, read, never copied.
 * - ADR-295 D4 — the exit resolver seam the outside exit rides.
 * - ADR-376 D3, D5, D8, D9, D10 — the open model's step: a path walked cell by
 *   cell, arrival, alongside, the edge, departure from a landmark, the hold
 *   while the player is out.
 * - ADR-375 D2, D3, D5, D7 — a bearing's step, the pace by the angle off the
 *   wind, irons, coming about, the sails.
 */

import type { ExitResolver } from '../../capabilities/exit-resolver-binding.js';
import type { WorldModel } from '../../world/WorldModel.js';
import type { IFEntity } from '../../entities/if-entity.js';
import { isDirection, type DirectionType } from '../../constants/directions.js';
import { TraitType } from '../trait-types.js';
import { RoomTrait } from '../room/roomTrait.js';
import { RoomBehavior } from '../room/roomBehavior.js';
import { OpenableBehavior } from '../openable/openableBehavior.js';
import { TraversalBehavior } from '../../world/TraversalBehavior.js';
import { AboardTrait } from './aboardTrait.js';
import { VehicleTrait, VehicleLineModel, VehicleOpenModel } from './vehicleTrait.js';
import { cellOf, ExpanseTrait, isInsideExpanse, sameCell, type ExpanseSide, type ExpanseWind, type IExpanseCell } from '../expanse/expanseTrait.js';
import { FloatingTrait } from '../expanse/floatingTrait.js';
import {
  angleOffWind,
  bearingOf,
  expanseOfLandmark,
  floatingThingsAt,
  headingVector,
  landmarkAt,
  landmarkCellOf,
} from '../expanse/expanseBehavior.js';
import type { SailingPace } from './vehicleTrait.js';

/**
 * Check if an entity is a vehicle
 */
export function isVehicle(entity: IFEntity): boolean {
  return entity.has(TraitType.VEHICLE);
}

/**
 * Check if an actor is currently inside a vehicle
 */
export function isActorInVehicle(world: WorldModel, actorId: string): boolean {
  return getActorVehicle(world, actorId) !== undefined;
}

/**
 * Get the vehicle an actor is in, or undefined if not in a vehicle
 */
export function getActorVehicle(world: WorldModel, actorId: string): IFEntity | undefined {
  const location = world.getLocation(actorId);
  if (!location) return undefined;

  const locationEntity = world.getEntity(location);
  if (!locationEntity) return undefined;

  return isVehicle(locationEntity) ? locationEntity : undefined;
}

/**
 * Get all actors currently inside a vehicle
 */
export function getVehicleOccupants(world: WorldModel, vehicleId: string): IFEntity[] {
  const contents = world.getContents(vehicleId);
  return contents.filter((entity: IFEntity) => entity.has(TraitType.ACTOR));
}

/**
 * What GO means for an actor, decided by the vehicle they are in (D5).
 * `on-foot`: not in a vehicle, GO is walking. `steers`: GO moves the
 * vehicle (the destination still has to admit it, `admitsVehicle`).
 * `rides`: a line vehicle; the player rides and the story drives.
 * `stays`: a vehicle with no movement model does not move under GO.
 */
export type VehicleGoing =
  | { kind: 'on-foot' }
  | { kind: 'steers'; vehicle: IFEntity }
  | { kind: 'rides'; vehicle: IFEntity }
  | { kind: 'stays'; vehicle: IFEntity };

/**
 * Decide what GO means for an actor from where they are.
 *
 * @param world - The world model
 * @param actorId - The actor trying to go
 * @returns on-foot when the actor is not in a vehicle; otherwise the model's answer
 */
export function goingFromVehicle(world: WorldModel, actorId: string): VehicleGoing {
  const vehicle = getActorVehicle(world, actorId);
  if (!vehicle) return { kind: 'on-foot' };

  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'streets') return { kind: 'steers', vehicle };
  if (model?.kind === 'line' || model?.kind === 'compass' || model?.kind === 'flight' || model?.kind === 'open') return { kind: 'rides', vehicle };
  return { kind: 'stays', vehicle };
}

/**
 * Whether a vehicle's machine is moving it (ADR-366 D5e): a line stepping
 * along its stops, a compass vehicle on a heading, a flight vehicle in its
 * passage, an open vehicle on a heading or a course. A `none` or streets
 * vehicle is never under way.
 *
 * @param vehicle - A vehicle; false when it has no model
 */
export function isUnderWay(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  switch (model?.kind) {
    case 'line':
      return model.underWay;
    case 'compass':
      return model.heading !== null;
    case 'flight':
      return model.destination !== null;
    case 'open':
      return model.underWay;
    default:
      return false;
  }
}

/**
 * `start <vehicle> [heading <direction>]` (ADR-366 D5a, D5c, D5f; ADR-376
 * D3): put the vehicle's machine under way. A line steps from its current
 * stop in its travel direction, turning back at a `both` line's end; a
 * compass vehicle takes the heading; an open vehicle takes one of the eight
 * headings, dropping any course, and leaves its landmark for the expanse
 * at the landmark's cell (D5). The first step comes after `pace` turns;
 * stepping is the machine's per-turn work.
 *
 * @param world - The world model
 * @param vehicle - A line, compass or open vehicle
 * @param heading - The heading, for a compass or open vehicle
 * @returns false when the vehicle cannot start: a one-way line at its end
 *   (`vehicle-at-end`), a compass or open vehicle with no heading, an open
 *   vehicle with a heading that is not one of the eight or that points
 *   toward the edge it is at (D8, the edge's phrase), one outside any
 *   expanse, or a type with no `start`
 */
export function startVehicle(world: WorldModel, vehicle: IFEntity, heading?: string | number): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'line') {
    const stop = currentStop(world, vehicle);
    const index = stop === undefined ? -1 : model.stops.indexOf(stop);
    if (index === model.stops.length - 1) {
      if (model.oneWay) return false;
      model.travelDirection = 'back';
    } else if (index === 0) {
      model.travelDirection = 'onward';
    }
    model.underWay = true;
    model.turnsToStep = model.pace ?? 1;
    return true;
  }
  if (model?.kind === 'compass') {
    if (heading === undefined || typeof heading !== 'string') return false;
    model.heading = heading;
    model.turnsToStep = model.pace;
    return true;
  }
  if (model?.kind === 'open') {
    // ADR-375 D2, D3: under sail the heading is a bearing (a compass word
    // names one), and `ahead` — no heading given — goes on the bearing held.
    let next: string | number | null = heading ?? null;
    if (model.sailing) {
      if (next === null) next = model.heading;
      else next = bearingOf(next) ?? null;
    } else if (next === null && typeof model.heading === 'number') {
      // `ahead` on a ship steered by degrees without a sailing table (ADR-375 D4, "always wind").
      next = model.heading;
    } else if (typeof next === 'number') {
      next = bearingOf(next) ?? null;
    }
    const vector = next !== null ? headingVector(next) : undefined;
    if (!vector || headsIntoEdge(model.atEdge, vector)) return false;
    if (!departLandmark(world, vehicle, model)) return false;
    model.heading = next;
    model.course = null;
    model.underWay = true;
    model.inIrons = false;
    const pace = model.sailing ? paceUnderSail(world, vehicle) : model.pace;
    model.turnsToStep = typeof pace === 'number' ? pace : 0;
    return true;
  }
  return false;
}

/**
 * The wind an open vehicle sails in (ADR-375 D4): its expanse's `wind`, or
 * undefined when the expanse carries none or the vehicle is in no expanse.
 */
export function windOf(world: WorldModel, vehicle: IFEntity): ExpanseWind | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open') return undefined;
  return expanseOfVehicle(world, vehicle, model)?.trait.wind;
}

/**
 * The pace a sailing vehicle makes now (ADR-375 D5, D7): the cell of its
 * band for the angle off the wind, under its sail setting — or `stopped`.
 * Undefined when the vehicle does not sail or has no heading.
 *
 * @param world - The world model
 * @param vehicle - An open vehicle with a `sailing` table
 * @param setting - A setting to read instead of the current one (the
 *   fullest, for irons)
 */
export function paceUnderSail(world: WorldModel, vehicle: IFEntity, setting?: string): SailingPace | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sailing || model.heading === null) return undefined;
  const wind = windOf(world, vehicle);
  if (wind === undefined || wind === 'calm') return model.sailing.calm;
  const bearing = bearingOf(model.heading);
  if (bearing === undefined) return 'stopped';
  const angle = angleOffWind(bearing, wind);
  const band = model.sailing.bands.find((b) => angle >= b.from && angle <= b.to);
  if (!band) return 'stopped';
  const want = model.sails ? (setting ?? model.sails.current) : null;
  const cell = band.paces.find((p) => p.setting === want) ?? band.paces[0];
  return cell?.pace ?? 'stopped';
}

/**
 * `port <n>` / `starboard <n>` (ADR-375 D3): turn a sailing vehicle's
 * bearing by `degrees` — negative to port, positive to starboard — under
 * way or not; a ship with no bearing yet is taken as pointing north. Only
 * a sailing vehicle turns by degrees.
 *
 * @returns the new bearing, or undefined when the vehicle does not sail
 */
export function turnHeading(vehicle: IFEntity, degrees: number): number | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open') return undefined;
  const from = model.heading === null ? 0 : bearingOf(model.heading) ?? 0;
  const next = (((from + degrees) % 360) + 360) % 360;
  model.heading = next;
  model.course = null;
  return next;
}

/** Why `come about` was refused (ADR-375 D3). */
export type ComeAboutRefusal = 'no-wind' | 'cannot';

/**
 * `come about` (ADR-375 D3): tack through the wind — the bearing turns to
 * the same angle off the wind on the other side of it (wind from 45,
 * heading 90, comes about to 0). Refused with `no-wind` aboard a vehicle
 * that does not sail or in a calm, and with `cannot` dead into or dead
 * before the wind, where there is no other side.
 *
 * @returns the new bearing, or the refusal
 */
export function comeAbout(world: WorldModel, vehicle: IFEntity): number | ComeAboutRefusal {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sailing) return 'no-wind';
  const wind = windOf(world, vehicle);
  if (wind === undefined || wind === 'calm') return 'no-wind';
  const from = model.heading === null ? 0 : bearingOf(model.heading) ?? 0;
  const off = ((((from - wind) % 360) + 540) % 360) - 180; // signed, -180 < off <= 180
  if (off === 0 || off === 180 || off === -180) return 'cannot';
  const next = (((wind - off) % 360) + 360) % 360;
  model.heading = next;
  model.course = null;
  return next;
}

/**
 * `set the <vehicle>'s sails to <setting>` (ADR-375 D7): the current
 * setting, from the next step. False when the vehicle has no sails or the
 * setting is not one of its own.
 */
export function setSails(vehicle: IFEntity, setting: string): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sails || !model.sails.settings.includes(setting)) return false;
  model.sails.current = setting;
  return true;
}

/** `make sail` (ADR-375 D7): one setting up. False at the fullest (`sails-at-full`) or without sails. */
export function makeSail(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sails) return false;
  const index = model.sails.settings.indexOf(model.sails.current);
  if (index >= model.sails.settings.length - 1) return false;
  model.sails.current = model.sails.settings[index + 1];
  return true;
}

/** `shorten sail` (ADR-375 D7): one setting down. False at the first (`sails-already-furled`) or without sails. */
export function shortenSail(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sails) return false;
  const index = model.sails.settings.indexOf(model.sails.current);
  if (index <= 0) return false;
  model.sails.current = model.sails.settings[index - 1];
  return true;
}

/** `furl sails` (ADR-375 D7): to the first setting. False when already there or without sails. */
export function furlSails(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.sails) return false;
  if (model.sails.current === model.sails.settings[0]) return false;
  model.sails.current = model.sails.settings[0];
  return true;
}

/**
 * The edge an open vehicle is at when a way with any component toward it is
 * asked for (ADR-376 D8), or undefined when the way is open. The actions
 * read it to refuse with the edge's phrase before `startVehicle` or
 * `sendVehicle` would.
 *
 * @param vehicle - An open vehicle
 * @param vector - The direction's components, x east and y north (a
 *   heading's unit vector, or the signs of a course's first leg)
 */
export function edgeAhead(vehicle: IFEntity, vector: IExpanseCell): ExpanseSide | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || model.atEdge === null) return undefined;
  return headsIntoEdge(model.atEdge, vector) ? model.atEdge : undefined;
}

/** Whether a direction has a component toward the edge the vehicle is at (D8). */
function headsIntoEdge(atEdge: ExpanseSide | null, vector: IExpanseCell): boolean {
  switch (atEdge) {
    case 'NORTH': return vector.y > 0;
    case 'SOUTH': return vector.y < 0;
    case 'EAST': return vector.x > 0;
    case 'WEST': return vector.x < 0;
    default: return false;
  }
}

/**
 * The expanse an open vehicle is in or at (D5): the expanse room it is in
 * when positioned, else the expanse its landmark room belongs to. Undefined
 * when the vehicle is in neither — moved somewhere the model has no meaning.
 */
function expanseOfVehicle(world: WorldModel, vehicle: IFEntity, model: VehicleOpenModel): { expanse: IFEntity; trait: ExpanseTrait } | undefined {
  const location = world.getLocation(vehicle.id);
  if (location === undefined) return undefined;
  const here = world.getEntity(location);
  const direct = here?.get(ExpanseTrait);
  if (here && direct) return model.position ? { expanse: here, trait: direct } : undefined;
  const expanse = model.position ? undefined : expanseOfLandmark(world, location);
  const trait = expanse?.get(ExpanseTrait);
  return expanse && trait ? { expanse, trait } : undefined;
}

/**
 * Leaving a landmark on `start` or `send` (D3, D5): the vehicle takes the
 * landmark's cell as its position and moves into the expanse room, with
 * everything it holds. Nothing to do when already positioned.
 * @returns false when the vehicle is in no expanse
 */
function departLandmark(world: WorldModel, vehicle: IFEntity, model: VehicleOpenModel): boolean {
  const found = expanseOfVehicle(world, vehicle, model);
  if (!found) return false;
  if (model.position) return true;
  const location = world.getLocation(vehicle.id) as string;
  const cell = landmarkCellOf(found.trait, location);
  if (!cell) return false;
  model.position = cell;
  world.moveEntity(vehicle.id, found.expanse.id);
  return true;
}

/**
 * `stop <vehicle>` (ADR-366 D5f; ADR-376 D3): take the vehicle's machine
 * out of the way where it is — a line halts at its stop, a compass vehicle
 * loses its heading, an open vehicle loses heading and course and keeps
 * its position.
 *
 * @returns false when the type has no `stop`
 */
export function stopVehicle(vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'line') {
    model.underWay = false;
    model.turnsToStep = 0;
    return true;
  }
  if (model?.kind === 'compass') {
    model.heading = null;
    model.turnsToStep = 0;
    return true;
  }
  if (model?.kind === 'open') {
    // ADR-375 D3: hove to, a ship keeps its bearing for `ahead`.
    if (!model.sailing && typeof model.heading !== 'number') model.heading = null;
    model.course = null;
    model.underWay = false;
    model.inIrons = false;
    model.turnsToStep = 0;
    return true;
  }
  return false;
}

/**
 * `send <vehicle> to <destination>` (ADR-366 D5d; ADR-376 D3): a flight
 * vehicle leaves its room and is nowhere for the passage, then arrives; an
 * open vehicle takes a course for a landmark's cell or a cell of its
 * expanse, dropping any heading, and leaves its landmark for the expanse
 * (D5). The departure and the arrival are the machine's per-turn work; this
 * records where it is bound.
 *
 * @param world - The world model
 * @param vehicle - A flight or open vehicle
 * @param destination - A room id (a flight destination, or an open vehicle's
 *   landmark), or a cell for an open vehicle
 * @returns false when the vehicle takes no `send`, the room is not one of
 *   its destinations or landmarks, the cell lies outside its expanse
 *   (`coordinates-outside-expanse`), the course's first leg heads into the
 *   edge it is at (D8), or the vehicle is in no expanse
 */
export function sendVehicle(world: WorldModel, vehicle: IFEntity, destination: string | IExpanseCell): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind === 'flight') {
    if (typeof destination !== 'string' || !model.destinations.includes(destination)) return false;
    model.destination = destination;
    model.turnsRemaining = model.passage;
    return true;
  }
  if (model?.kind !== 'open') return false;
  const found = expanseOfVehicle(world, vehicle, model);
  if (!found) return false;
  const target = typeof destination === 'string' ? landmarkCellOf(found.trait, destination) : { x: destination.x, y: destination.y };
  if (!target || !isInsideExpanse(found.trait, target)) return false;
  const from = model.position ?? landmarkCellOf(found.trait, world.getLocation(vehicle.id) as string);
  if (!from) return false;
  if (headsIntoEdge(model.atEdge, { x: Math.sign(target.x - from.x), y: Math.sign(target.y - from.y) })) return false;
  if (!departLandmark(world, vehicle, model)) return false;
  model.course = target;
  if (!model.sailing && typeof model.heading !== 'number') model.heading = null;
  model.underWay = true;
  model.inIrons = false;
  const pace = model.sailing ? paceUnderSail(world, vehicle) : model.pace;
  model.turnsToStep = typeof pace === 'number' ? pace : 0;
  return true;
}

/**
 * The resolver for a room aboard a vehicle (ADR-366 D7): an exit `to
 * outside` leads to the room the vehicle is in, through the door the line
 * named, and is blocked with `vehicle-under-way` while the vehicle is nowhere.
 * Defers to static topology for a direction the trait does not declare.
 */
export const vehicleOutsideExitResolver: ExitResolver = (_room, trait, direction, _staticExit, ctx) => {
  const aboard = trait as AboardTrait;
  // A `to outside` exit is written with a compass word; a passage key names none.
  const outside = isDirection(direction) ? aboard.outside[direction] : undefined;
  if (!outside) return undefined;
  const vehicle = ctx.world.getEntity(aboard.vehicleId);
  const location = ctx.world.getLocation(aboard.vehicleId);
  if (!vehicle || location === undefined || isUnderWay(vehicle)) {
    return { kind: 'blocked', messageId: 'if.action.going.vehicle_under_way', params: { vehicle: vehicle?.name ?? aboard.vehicleId } };
  }
  return { kind: 'exit', destination: location, ...(outside.via !== undefined ? { via: outside.via } : {}) };
};

/**
 * Register the outside-exit resolver on a world. Idempotent; a story that
 * has rooms aboard a vehicle registers it at load.
 */
export function registerVehicleExitResolver(world: WorldModel): void {
  world.registerExitResolver(AboardTrait.type, vehicleOutsideExitResolver);
}

/**
 * Whether a room admits a vehicle (D6). A room admits no vehicle unless it
 * names it.
 *
 * @param room - The room the vehicle would land in
 * @param vehicle - The vehicle
 */
export function admitsVehicle(room: IFEntity, vehicle: IFEntity): boolean {
  return room.get(RoomTrait)?.admits.includes(vehicle.id) ?? false;
}

function lineOf(vehicle: IFEntity): VehicleLineModel | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  return model?.kind === 'line' ? model : undefined;
}

/**
 * Whether a room is one of a line vehicle's stops.
 *
 * @param vehicle - A vehicle; false when it has no line model
 * @param roomId - The room to test
 */
export function isStop(vehicle: IFEntity, roomId: string): boolean {
  return lineOf(vehicle)?.stops.includes(roomId) ?? false;
}

/**
 * The stop a line vehicle is at, read from its location (D9).
 *
 * @returns the stop's room id, or undefined when the vehicle has no line or is between stops
 */
export function currentStop(world: WorldModel, vehicle: IFEntity): string | undefined {
  const location = world.getLocation(vehicle.id);
  return location !== undefined && isStop(vehicle, location) ? location : undefined;
}

/**
 * Move a line vehicle, and everything it holds, to one of its stops (D5a).
 *
 * @param world - The world model
 * @param vehicle - A vehicle with a line model
 * @param stopId - The stop to move to
 * @throws when the vehicle has no line or the room is not one of its stops
 */
export function moveVehicleToStop(world: WorldModel, vehicle: IFEntity, stopId: string): void {
  if (!lineOf(vehicle)) {
    throw new Error(`moveVehicleToStop: ${vehicle.id} has no line`);
  }
  if (!isStop(vehicle, stopId)) {
    throw new Error(`moveVehicleToStop: ${stopId} is not a stop of ${vehicle.id}`);
  }
  world.moveEntity(vehicle.id, stopId);
}

/**
 * Whether an entity is aboard a vehicle: inside it at any depth, or in a
 * room aboard it (D7). An actor in a box in the hold is aboard the ship.
 *
 * @param world - The world model
 * @param entityId - The entity to test, usually an actor
 * @param vehicleId - The vehicle
 */
export function isAboardVehicle(world: WorldModel, entityId: string, vehicleId: string): boolean {
  const seen = new Set<string>();
  let current: string | undefined = world.getLocation(entityId);
  while (current !== undefined && !seen.has(current)) {
    if (current === vehicleId) return true;
    seen.add(current);
    const entity = world.getEntity(current);
    const aboard = entity?.get(AboardTrait);
    if (aboard?.vehicleId === vehicleId) return true;
    current = world.getLocation(current);
  }
  return false;
}

/**
 * What one turn of the vehicle's machine did (D5e): it reached a room
 * (`vehicle-arrived`, a stop, the room in its heading, its destination, or
 * a landmark), it ran out of way or reached its course and took itself out
 * of the way (`vehicle-stopped`, reported once), it left its room for the
 * passage (`departed`, which no stock line reports: the fold is the
 * author's sequence on `becomes under way`), it came alongside a floating
 * thing and stopped (`vehicle-alongside`, ADR-376 D10), or it reached an
 * edge of its expanse and stopped (`expanse-edge` or the edge's own phrase,
 * ADR-376 D8).
 */
export type VehicleStep =
  | { kind: 'arrived'; roomId: string }
  | { kind: 'stopped' }
  | { kind: 'departed' }
  | { kind: 'alongside'; thingId: string }
  | { kind: 'edge'; side: ExpanseSide; messageKey?: string; sailing?: boolean }
  /** ADR-375 D5: a sailing vehicle lies in irons, reported once. */
  | { kind: 'in-irons' };

/**
 * One turn of the vehicle's built-in machine (ADR-366 D5e). The types share
 * one machine and differ only in what a step is (D5f): a line steps to the
 * next stop or to where its `position` block says, a compass vehicle steps
 * along the exit in its heading, a flight vehicle leaves, is nowhere for
 * the passage, and arrives. Every move is `WorldModel.moveEntity`, so what
 * the vehicle holds comes along (D4), and every piece of machine state
 * written here is a trait field (D5g).
 *
 * @param world - The world model
 * @param vehicle - A vehicle; nothing happens without a model that moves
 * @param positionAnswer - For a `drive: state` line, the stop its
 *   `position` block names this turn; the caller evaluates the block,
 *   since its guards are code the trait cannot hold. Ignored by every
 *   other model.
 * @returns what the step did, or undefined when the vehicle stayed put
 */
export function stepVehicle(world: WorldModel, vehicle: IFEntity, positionAnswer?: string): VehicleStep | undefined {
  const model = vehicle.get(VehicleTrait)?.model;
  switch (model?.kind) {
    case 'line':
      return model.drive === 'state' ? stepStateLine(world, vehicle, model, positionAnswer) : stepControlLine(world, vehicle, model);
    case 'compass':
      return stepCompass(world, vehicle, model);
    case 'flight':
      return stepFlight(world, vehicle, model);
    case 'open':
      return stepOpen(world, vehicle, model);
    default:
      return undefined;
  }
}

/** D5a, `drive: state`: the block's answer differs from where the vehicle is, so it moves there. */
function stepStateLine(world: WorldModel, vehicle: IFEntity, model: VehicleLineModel, positionAnswer: string | undefined): VehicleStep | undefined {
  if (positionAnswer === undefined || !model.stops.includes(positionAnswer)) return undefined;
  if (world.getLocation(vehicle.id) === positionAnswer) return undefined;
  world.moveEntity(vehicle.id, positionAnswer);
  return { kind: 'arrived', roomId: positionAnswer };
}

/**
 * D5a, `drive: control`: every `pace` turns under way, one stop in the
 * travel direction; the machine halts itself at the line's end. A vehicle
 * found off its stops (a `move` the author wrote) halts where it is.
 */
function stepControlLine(world: WorldModel, vehicle: IFEntity, model: VehicleLineModel): VehicleStep | undefined {
  if (!model.underWay) return undefined;
  const stop = currentStop(world, vehicle);
  if (stop === undefined) {
    model.underWay = false;
    model.turnsToStep = 0;
    return { kind: 'stopped' };
  }
  model.turnsToStep -= 1;
  if (model.turnsToStep > 0) return undefined;

  // `startVehicle` turned a `both` line at its end and refused a one-way
  // one, and arriving at an end halts below, so the next stop always exists.
  const index = model.stops.indexOf(stop);
  const nextIndex = model.travelDirection === 'onward' ? index + 1 : index - 1;
  const next = model.stops[nextIndex];
  world.moveEntity(vehicle.id, next);
  const atEnd = nextIndex === 0 || nextIndex === model.stops.length - 1;
  if (atEnd) {
    model.underWay = false;
    model.turnsToStep = 0;
  } else {
    model.turnsToStep = model.pace ?? 1;
  }
  return { kind: 'arrived', roomId: next };
}

/**
 * D5c: every `pace` turns on a heading, one room along the way that way
 * while traversal grants it to a steered vehicle (ADR-378 D0: the way
 * exists and is not hidden or blocked, no closed or locked door bars it, and
 * the destination admits the vehicle, D6); when it cannot, the heading
 * clears and the vehicle is stopped, once.
 */
function stepCompass(world: WorldModel, vehicle: IFEntity, model: Extract<NonNullable<VehicleTrait['model']>, { kind: 'compass' }>): VehicleStep | undefined {
  if (model.heading === null) return undefined;
  model.turnsToStep -= 1;
  if (model.turnsToStep > 0) return undefined;

  const location = world.getLocation(vehicle.id);
  const room = location !== undefined ? world.getEntity(location) : undefined;
  const way = room !== undefined
    ? TraversalBehavior.wayFor(world, room, model.heading as DirectionType, { kind: 'steered', vehicle })
    : undefined;
  if (way?.kind !== 'exit') {
    model.heading = null;
    model.turnsToStep = 0;
    return { kind: 'stopped' };
  }
  world.moveEntity(vehicle.id, way.destination.id);
  model.turnsToStep = model.pace;
  return { kind: 'arrived', roomId: way.destination.id };
}

/**
 * D5d: bound for a destination, the vehicle leaves its room on the first
 * turn and is nowhere; the passage counts down a turn at a time; at zero
 * it arrives and is no longer under way.
 */
function stepFlight(world: WorldModel, vehicle: IFEntity, model: Extract<NonNullable<VehicleTrait['model']>, { kind: 'flight' }>): VehicleStep | undefined {
  if (model.destination === null) return undefined;
  if (world.getLocation(vehicle.id) !== undefined) {
    world.moveEntity(vehicle.id, null);
    return { kind: 'departed' };
  }
  model.turnsRemaining -= 1;
  if (model.turnsRemaining > 0) return undefined;
  const destination = model.destination;
  world.moveEntity(vehicle.id, destination);
  model.destination = null;
  model.turnsRemaining = 0;
  return { kind: 'arrived', roomId: destination };
}

/**
 * ADR-376 D3: every `pace` turns under way, one step of `stride` along the
 * heading or toward the course — diagonal until one axis matches, then
 * straight, never overshooting. The path from the old cell to the new is
 * walked cell by cell, and the first of these ends the step: a landmark's
 * cell (the vehicle moves into its room, drops its position and stops:
 * `arrived`), a floating thing's cell (`alongside`, stopped there, D10), a
 * cell past an edge (stopped at the last cell inside, `atEdge` set, D8).
 * A course reached is `stopped`. While any actor out of the vehicle holds
 * its cell the machine holds and the turn is not counted (D9). A vehicle
 * found in no expanse stops where it is.
 */
function stepOpen(world: WorldModel, vehicle: IFEntity, model: VehicleOpenModel): VehicleStep | undefined {
  if (!model.underWay) return undefined;
  const found = expanseOfVehicle(world, vehicle, model);
  if (!found || !model.position) {
    halt(model);
    return { kind: 'stopped' };
  }
  if (actorOutAt(world, found.expanse.id, model.position)) return undefined;

  if (model.sailing && model.course === null) {
    // ADR-375 D5, D7: the band for the angle off the wind, read live, sets
    // the pace; in a `stopped` band the ship holds — in irons, reported
    // once, only when the fullest setting would be stopped too — and moves
    // again the turn a turn or a wind shift takes it out.
    const pace = paceUnderSail(world, vehicle);
    if (pace === undefined || pace === 'stopped') {
      const fullest = model.sails ? model.sails.settings[model.sails.settings.length - 1] : undefined;
      const stuck = paceUnderSail(world, vehicle, fullest) === 'stopped';
      model.turnsToStep = 0;
      if (stuck && !model.inIrons) {
        model.inIrons = true;
        return { kind: 'in-irons' };
      }
      if (!stuck) model.inIrons = false;
      return undefined;
    }
    model.inIrons = false;
    if (model.turnsToStep <= 0) model.turnsToStep = pace;
  }
  model.turnsToStep -= 1;
  if (model.turnsToStep > 0) return undefined;

  const from = model.position;
  const delta = stepDelta(model, from);
  const legs = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y))));
  let last = from;
  for (let i = 1; i <= legs; i++) {
    const at = { x: from.x + (delta.x * i) / legs, y: from.y + (delta.y * i) / legs };
    const cell = cellOf(at);
    if (!isInsideExpanse(found.trait, cell)) {
      const side = sideCrossed(found.trait, cell);
      model.position = cellOf(last);
      model.atEdge = side;
      halt(model);
      const messageKey = found.trait.edges[side];
      return { kind: 'edge', side, ...(messageKey !== undefined ? { messageKey } : {}), ...(model.sailing ? { sailing: true } : {}) };
    }
    const landmark = landmarkAt(found.trait, cell);
    if (landmark !== undefined) {
      model.position = null;
      model.atEdge = null;
      halt(model);
      world.moveEntity(vehicle.id, landmark);
      return { kind: 'arrived', roomId: landmark };
    }
    const [floating] = floatingThingsAt(world, found.expanse.id, cell);
    if (floating) {
      model.position = cell;
      model.atEdge = null;
      halt(model);
      return { kind: 'alongside', thingId: floating.id };
    }
    last = at;
  }
  model.position = model.sailing && model.course === null ? last : cellOf(last);
  model.atEdge = null;
  if (model.course !== null && sameCell(last, model.course)) {
    model.course = null;
    halt(model);
    return { kind: 'stopped' };
  }
  const next = model.sailing && model.course === null ? paceUnderSail(world, vehicle) : model.pace;
  model.turnsToStep = typeof next === 'number' ? next : 0;
  return undefined;
}

/** Take an open vehicle out of the way where it is; a ship keeps its bearing (ADR-375 D3), a compass word clears. */
function halt(model: VehicleOpenModel): void {
  if (!model.sailing && typeof model.heading !== 'number') model.heading = null;
  model.course = null;
  model.underWay = false;
  model.inIrons = false;
  model.turnsToStep = 0;
}

/**
 * The displacement of one step: `stride` along the heading — a compass
 * word's unit vector, or a bearing's sine and cosine (ADR-375 D2) — or
 * toward the course without overshooting. A course outranks a heading.
 */
function stepDelta(model: VehicleOpenModel, from: IExpanseCell): IExpanseCell {
  if (model.course === null && model.heading !== null) {
    const vector = headingVector(model.heading) ?? { x: 0, y: 0 };
    return { x: vector.x * model.stride, y: vector.y * model.stride };
  }
  const course = model.course ?? from;
  const clamp = (d: number) => Math.sign(d) * Math.min(Math.abs(d), model.stride);
  return { x: clamp(course.x - from.x), y: clamp(course.y - from.y) };
}

/** Which side a cell outside the expanse lies past; north and south before east and west. */
function sideCrossed(trait: ExpanseTrait, cell: IExpanseCell): ExpanseSide {
  if (cell.y >= trait.height) return 'NORTH';
  if (cell.y < 0) return 'SOUTH';
  if (cell.x >= trait.width) return 'EAST';
  return 'WEST';
}

/** Whether an actor out of a vehicle holds a floating position at a cell of the expanse (D9). */
function actorOutAt(world: WorldModel, expanseId: string, cell: IExpanseCell): boolean {
  return world.getContents(expanseId).some((e) => {
    if (!e.has(TraitType.ACTOR)) return false;
    const position = e.get(FloatingTrait)?.position;
    return position !== undefined && position !== null && sameCell(position, cell);
  });
}

/**
 * ADR-376 D9: an actor leaves an open vehicle that is positioned in its
 * expanse. They are put in the expanse room holding the vehicle's cell on
 * a floating trait of their own (added when they have none), so the
 * machine holds while they are out and `enter` reaches any open vehicle in
 * that cell. Nothing happens when the vehicle is at a landmark or
 * anywhere else: the caller's ordinary exit applies.
 *
 * @param world - The world model
 * @param actor - The actor leaving
 * @param vehicle - The open vehicle they are in
 * @returns true when the actor was put out into the expanse
 */
export function leaveVehicleIntoExpanse(world: WorldModel, actor: IFEntity, vehicle: IFEntity): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'open' || !model.position) return false;
  const location = world.getLocation(vehicle.id);
  if (location === undefined || !world.getEntity(location)?.has(TraitType.EXPANSE)) return false;
  let floating = actor.get(FloatingTrait);
  if (!floating) {
    floating = new FloatingTrait();
    actor.add(floating);
  }
  floating.position = { x: model.position.x, y: model.position.y };
  world.moveEntity(actor.id, location);
  return true;
}

/**
 * ADR-376 D9: an actor out in the expanse boards a vehicle, dropping the
 * position they held; the machine resumes on its next step. The move into
 * the vehicle is entering's own.
 *
 * @returns true when the actor held a position
 */
export function boardFromExpanse(actor: IFEntity): boolean {
  const floating = actor.get(FloatingTrait);
  if (!floating?.position) return false;
  floating.position = null;
  return true;
}

/**
 * The vehicle an actor is aboard (D7): the vehicle they are inside at any
 * depth, or the vehicle whose room they stand in. Undefined on foot.
 *
 * @param world - The world model
 * @param actorId - The actor
 */
export function getVehicleAboard(world: WorldModel, actorId: string): IFEntity | undefined {
  const seen = new Set<string>();
  let current: string | undefined = world.getLocation(actorId);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const entity = world.getEntity(current);
    if (!entity) return undefined;
    if (isVehicle(entity)) return entity;
    const aboard = entity.get(AboardTrait);
    if (aboard) return world.getEntity(aboard.vehicleId);
    current = world.getLocation(current);
  }
  return undefined;
}

/**
 * Whether a vehicle lists a command set (ADR-366 D5i): the words are always
 * grammar, so a set the vehicle does not take is the action's refusal,
 * `vehicle-no-such-command`.
 *
 * @param vehicle - A vehicle
 * @param set - `compass`, `destinations`, or an extension's set
 */
export function takesCommandSet(vehicle: IFEntity, set: string): boolean {
  return vehicle.get(VehicleTrait)?.commands?.includes(set) ?? false;
}
