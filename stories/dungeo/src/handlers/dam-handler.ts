/**
 * Dam Puzzle Handler - Reservoir Exit Management
 *
 * Integrates with dam-state.ts to handle reservoir walkability:
 * - When dam is drained → reservoir exits unblocked
 * - When dam is closed → reservoir exits blocked
 *
 * Dam draining is INSTANT per FORTRAN source. This handler listens for
 * dungeo.dam.opened/closed events from turn-bolt action.
 */

import {
  WorldModel,
  IWorldModel,
  RoomBehavior,
  Direction,
  IdentityTrait
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { isYellowButtonPressed, isDamDrained } from '../scheduler/dam-state';

// Message IDs for dam puzzle
export const DamMessages = {
  // Reservoir messages
  RESERVOIR_DRAINING: 'dungeo.dam.reservoir_draining',
  RESERVOIR_DRAINED: 'dungeo.dam.reservoir_drained'
};

// Room IDs for the dam region (set during registration)
let damRoomId: string;
let maintenanceRoomId: string;
let reservoirSouthId: string;
let reservoirId: string;
let reservoirNorthId: string;

/**
 * Check if the dam gate is enabled (yellow button pressed)
 * Delegates to dam-fuse state
 */
export function isDamGateEnabled(world: IWorldModel): boolean {
  return isYellowButtonPressed(world as WorldModel);
}

/**
 * Check if the dam is open (water drained)
 * Delegates to dam-fuse state
 */
export function isDamOpen(world: IWorldModel): boolean {
  return isDamDrained(world as WorldModel);
}

/**
 * Open the dam and drain the reservoir
 * Called by turn-bolt action after draining completes
 */
export function openDam(world: IWorldModel): void {
  // Unblock reservoir exits
  unblockReservoirExits(world);

  // Update reservoir room descriptions
  updateReservoirDescriptions(world, true);
}

/**
 * Close the dam (refill reservoir) - not typically used but available
 */
export function closeDam(world: IWorldModel): void {
  // Block reservoir exits again
  blockReservoirExits(world);

  // Update reservoir room descriptions
  updateReservoirDescriptions(world, false);
}

/**
 * Unblock all reservoir exits (dam opened)
 */
function unblockReservoirExits(world: IWorldModel): void {
  const reservoirSouth = world.getEntity(reservoirSouthId);
  const reservoir = world.getEntity(reservoirId);
  const reservoirNorth = world.getEntity(reservoirNorthId);

  if (reservoirSouth) {
    RoomBehavior.unblockExit(reservoirSouth, Direction.NORTH);
  }

  if (reservoir) {
    RoomBehavior.unblockExit(reservoir, Direction.NORTH);
    RoomBehavior.unblockExit(reservoir, Direction.SOUTH);
  }

  if (reservoirNorth) {
    RoomBehavior.unblockExit(reservoirNorth, Direction.SOUTH);
  }
}

/**
 * Block all reservoir exits (dam closed)
 */
function blockReservoirExits(world: IWorldModel): void {
  const reservoirSouth = world.getEntity(reservoirSouthId);
  const reservoir = world.getEntity(reservoirId);
  const reservoirNorth = world.getEntity(reservoirNorthId);

  if (reservoirSouth) {
    RoomBehavior.blockExit(reservoirSouth, Direction.NORTH,
      'The reservoir is full of water. You cannot walk that way.');
  }

  if (reservoir) {
    RoomBehavior.blockExit(reservoir, Direction.NORTH,
      'The reservoir is full of water. You cannot continue north.');
    RoomBehavior.blockExit(reservoir, Direction.SOUTH,
      'The reservoir is full of water. You cannot continue south.');
  }

  if (reservoirNorth) {
    RoomBehavior.blockExit(reservoirNorth, Direction.SOUTH,
      'The reservoir is full of water. You cannot walk that way.');
  }
}

/**
 * Update reservoir room descriptions based on dam state
 */
function updateReservoirDescriptions(world: IWorldModel, drained: boolean): void {
  const reservoirSouth = world.getEntity(reservoirSouthId);
  const reservoir = world.getEntity(reservoirId);
  const reservoirNorth = world.getEntity(reservoirNorthId);

  if (drained) {
    // Reservoir drained - muddy bottom exposed
    if (reservoirSouth) {
      const identity = reservoirSouth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the southern edge of what was once a reservoir. The water has drained away, leaving a muddy expanse stretching north. A path leads south.';
      }
    }

    if (reservoir) {
      const identity = reservoir.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the muddy bottom of a drained reservoir. The exposed lake bed stretches in all directions. Various objects that were once submerged are now visible.';
      }
    }

    if (reservoirNorth) {
      const identity = reservoirNorth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are at the north end of a drained reservoir. The muddy bottom extends to the south, and a dark passage leads north.';
      }
    }
  } else {
    // Reservoir flooded
    if (reservoirSouth) {
      const identity = reservoirSouth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the southern shore of a large reservoir. The water extends north as far as you can see. A path leads south.';
      }
    }

    if (reservoir) {
      const identity = reservoir.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on what used to be a large reservoir, now drained. The muddy bottom is exposed, and you can see various objects that were once submerged.';
      }
    }

    if (reservoirNorth) {
      const identity = reservoirNorth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are at the north end of a large reservoir. A passage leads north into darkness, and the reservoir extends to the south.';
      }
    }
  }
}

/**
 * Register the reservoir exit handler
 *
 * Stores room IDs and listens for dam draining completion to unblock exits.
 */
export function registerReservoirExitHandler(
  world: WorldModel,
  roomIds: {
    dam: string;
    maintenanceRoom: string;
    reservoirSouth: string;
    reservoir: string;
    reservoirNorth: string;
  }
): void {
  // Store room IDs for later use
  damRoomId = roomIds.dam;
  maintenanceRoomId = roomIds.maintenanceRoom;
  reservoirSouthId = roomIds.reservoirSouth;
  reservoirId = roomIds.reservoir;
  reservoirNorthId = roomIds.reservoirNorth;

  // Block reservoir exits initially (dam closed = flooded)
  blockReservoirExits(world);

  // Listen for dam opened event (instant draining)
  world.registerEventHandler('dungeo.dam.opened', (event: ISemanticEvent, w: IWorldModel): void => {
    openDam(w);
  });

  // Listen for dam closed event (player turned bolt to close)
  world.registerEventHandler('dungeo.dam.closed', (event: ISemanticEvent, w: IWorldModel): void => {
    closeDam(w);
  });
}
