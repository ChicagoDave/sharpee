/**
 * Vehicle Behavior - Handles vehicle movement and actor transport
 *
 * Provides utilities for:
 * - Moving a vehicle (and its contents) between rooms
 * - Checking if an actor is in a vehicle
 * - Getting the vehicle an actor is in
 */

import { WorldModel } from '../../world/WorldModel';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { VehicleTrait } from './vehicleTrait';

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
  const location = world.getLocation(actorId);
  if (!location) return false;

  const locationEntity = world.getEntity(location);
  if (!locationEntity) return false;

  return isVehicle(locationEntity);
}

/**
 * Get the vehicle an actor is in, or undefined if not in a vehicle
 */
export function getActorVehicle(world: WorldModel, actorId: string): IFEntity | undefined {
  const location = world.getLocation(actorId);
  if (!location) return undefined;

  const locationEntity = world.getEntity(location);
  if (!locationEntity) return undefined;

  if (isVehicle(locationEntity)) {
    return locationEntity;
  }

  return undefined;
}

/**
 * Get all actors currently inside a vehicle
 */
export function getVehicleOccupants(world: WorldModel, vehicleId: string): IFEntity[] {
  const contents = world.getContents(vehicleId);
  return contents.filter((entity: IFEntity) => entity.has(TraitType.ACTOR));
}

/**
 * Move a vehicle to a new room, transporting all contents with it.
 * Returns true if movement succeeded.
 *
 * This is the core vehicle transport function - when a vehicle moves,
 * everything inside it (including actors) moves with it.
 */
export function moveVehicle(
  world: WorldModel,
  vehicleId: string,
  destinationRoomId: string
): boolean {
  const vehicle = world.getEntity(vehicleId);
  if (!vehicle) return false;

  const vehicleTrait = vehicle.get(TraitType.VEHICLE) as VehicleTrait | undefined;
  if (!vehicleTrait) return false;

  // Move the vehicle to the new room
  world.moveEntity(vehicleId, destinationRoomId);

  // Update vehicle position if using position tracking
  if (vehicleTrait.positionRooms) {
    // Find position name for this room
    const positionEntry = Object.entries(vehicleTrait.positionRooms)
      .find(([_, roomId]) => roomId === destinationRoomId);

    if (positionEntry) {
      vehicleTrait.currentPosition = positionEntry[0];
    }
  }

  return true;
}

/**
 * Check if a vehicle can move (is operational)
 */
export function canVehicleMove(vehicle: IFEntity): { canMove: boolean; reason?: string } {
  const vehicleTrait = vehicle.get(TraitType.VEHICLE) as VehicleTrait | undefined;
  if (!vehicleTrait) {
    return { canMove: false, reason: 'Not a vehicle' };
  }

  if (!vehicleTrait.isOperational) {
    return {
      canMove: false,
      reason: vehicleTrait.notOperationalReason ?? 'The vehicle is not operational'
    };
  }

  return { canMove: true };
}

/**
 * Check if an actor can exit their current location.
 * If in a vehicle that requires exit, they cannot simply walk out.
 */
export function canActorLeaveLocation(
  world: WorldModel,
  actorId: string
): { canLeave: boolean; mustExitVehicle?: IFEntity } {
  const vehicle = getActorVehicle(world, actorId);

  if (!vehicle) {
    return { canLeave: true };
  }

  const vehicleTrait = vehicle.get(TraitType.VEHICLE) as VehicleTrait | undefined;
  if (!vehicleTrait) {
    return { canLeave: true };
  }

  if (vehicleTrait.requiresExitBeforeLeaving) {
    return { canLeave: false, mustExitVehicle: vehicle };
  }

  return { canLeave: true };
}

/**
 * Check if an actor in a vehicle can use GO/walk commands.
 * Some vehicles block walking movement entirely.
 *
 * Returns:
 * - canWalk: true if actor can use GO commands (not in vehicle, or in walkable vehicle)
 * - vehicle: the vehicle entity if actor is in one (undefined if not in a vehicle)
 */
export function canActorWalkInVehicle(
  world: WorldModel,
  actorId: string
): { canWalk: boolean; vehicle?: IFEntity } {
  const vehicle = getActorVehicle(world, actorId);

  if (!vehicle) {
    return { canWalk: true };
  }

  const vehicleTrait = vehicle.get(TraitType.VEHICLE) as VehicleTrait | undefined;
  if (!vehicleTrait) {
    // In something with no VehicleTrait - treat as blocking container
    return { canWalk: false, vehicle };
  }

  if (vehicleTrait.blocksWalkingMovement) {
    return { canWalk: false, vehicle };
  }

  // In a walkable vehicle - return the vehicle so caller knows player is in one
  return { canWalk: true, vehicle };
}
