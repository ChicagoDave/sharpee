/**
 * Vehicle Behavior - the rules a vehicle's movement model decides
 *
 * Public interface: `isVehicle`, `isActorInVehicle`, `getActorVehicle`,
 * `getVehicleOccupants` (where an actor rides), `goingFromVehicle` (what GO
 * means from inside, ADR-366 D5), `admitsVehicle` (D6), and the line
 * model's `isStop`, `currentStop` and `moveVehicleToStop` (D5a).
 *
 * Owner context: world-model vehicle behavior. Every answer is read from
 * the world and the trait's model; nothing here keeps a position of its own
 * (D9). Moving a vehicle is `WorldModel.moveEntity`, which carries what the
 * vehicle holds because containment is relational (D4).
 */

import { WorldModel } from '../../world/WorldModel.js';
import { IFEntity } from '../../entities/if-entity.js';
import { TraitType } from '../trait-types.js';
import { RoomTrait } from '../room/roomTrait.js';
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
  if (model?.kind === 'line') return { kind: 'rides', vehicle };
  return { kind: 'stays', vehicle };
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
