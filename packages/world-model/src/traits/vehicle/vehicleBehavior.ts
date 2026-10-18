/**
 * Vehicle Behavior - the rules a vehicle's movement model decides
 *
 * Public interface: `isVehicle`, `isActorInVehicle`, `getActorVehicle`,
 * `getVehicleOccupants` (where an actor rides), `goingFromVehicle` (what GO
 * means from inside), `admitsVehicle`, `isUnderWay`, the driving statements
 * `startVehicle`, `stopVehicle` and `sendVehicle`, the line model's
 * `isStop`, `currentStop` and `moveVehicleToStop`, and the rooms-aboard
 * half: `vehicleOutsideExitResolver` and `registerVehicleExitResolver`
 * (an exit `to outside` lands where the vehicle is).
 *
 * Owner context: world-model vehicle behavior. Every answer is read from
 * the world and the trait's model; nothing here keeps a position of its own.
 * Moving a vehicle is `WorldModel.moveEntity`, which carries what the
 * vehicle holds because containment is relational.
 *
 * References:
 * - ADR-366 D4 — moving a vehicle moves what it holds.
 * - ADR-366 D5, D5a — what GO means from inside; the line's stops.
 * - ADR-366 D6 — a room admits the steered vehicles it names.
 * - ADR-366 D7 — rooms aboard; `to outside` resolves to the vehicle's room,
 *   and refuses with `vehicle-under-way` while the vehicle is nowhere.
 * - ADR-366 D9 — the vehicle's location is the one fact, read, never copied.
 * - ADR-295 D4 — the exit resolver seam the outside exit rides.
 */

import type { ExitResolver } from '../../capabilities/exit-resolver-binding.js';
import { WorldModel } from '../../world/WorldModel.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { RoomTrait } from '../room/roomTrait.js';
import { AboardTrait } from './aboardTrait.js';
import { VehicleTrait, VehicleLineModel } from './vehicleTrait.js';

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
  if (model?.kind === 'line' || model?.kind === 'compass' || model?.kind === 'flight') return { kind: 'rides', vehicle };
  return { kind: 'stays', vehicle };
}

/**
 * Whether a vehicle's machine is moving it (ADR-366 D5e): a line stepping
 * along its stops, a compass vehicle on a heading, a flight vehicle in its
 * passage. A `none` or streets vehicle is never under way.
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
    default:
      return false;
  }
}

/**
 * `start <vehicle> [heading <direction>]` (ADR-366 D5a, D5c, D5f): put the
 * vehicle's machine under way. A line steps from its current stop in its
 * travel direction, turning back at a `both` line's end; a compass vehicle
 * takes the heading. The first step comes after `pace` turns; stepping is
 * the machine's per-turn work.
 *
 * @param world - The world model
 * @param vehicle - A line or compass vehicle
 * @param heading - The heading, for a compass vehicle
 * @returns false when the vehicle cannot start: a one-way line at its end
 *   (`vehicle-at-end`), a compass vehicle with no heading, or a type with no
 *   `start`
 */
export function startVehicle(world: WorldModel, vehicle: IFEntity, heading?: string): boolean {
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
    if (heading === undefined) return false;
    model.heading = heading;
    model.turnsToStep = model.pace;
    return true;
  }
  return false;
}

/**
 * `stop <vehicle>` (ADR-366 D5f): take the vehicle's machine out of the way
 * where it is — a line halts at its stop, a compass vehicle loses its heading.
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
  return false;
}

/**
 * `send <vehicle> to <destination>` (ADR-366 D5d): a flight vehicle leaves
 * its room and is nowhere for the passage, then arrives. The departure and
 * the arrival are the machine's per-turn work; this records where it is
 * bound.
 *
 * @returns false when the vehicle is not a flight vehicle or the room is not
 *   one of its destinations
 */
export function sendVehicle(vehicle: IFEntity, destinationId: string): boolean {
  const model = vehicle.get(VehicleTrait)?.model;
  if (model?.kind !== 'flight' || !model.destinations.includes(destinationId)) return false;
  model.destination = destinationId;
  model.turnsRemaining = model.passage;
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
  const outside = aboard.outside[direction];
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
