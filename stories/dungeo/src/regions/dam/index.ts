/**
 * Dam Region - Flood Control Dam #3 and surrounding areas
 *
 * This region connects from the Round Room via the Loud Room.
 * See README.md for full documentation and connection diagram.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createLoudRoom } from './rooms/loud-room';
import { createDeepCanyon } from './rooms/deep-canyon';
import { createDamLobby } from './rooms/dam-lobby';
import { createDam } from './rooms/dam';
import { createDamBase } from './rooms/dam-base';
import { createMaintenanceRoom } from './rooms/maintenance-room';
import { createReservoirSouth } from './rooms/reservoir-south';
import { createReservoir } from './rooms/reservoir';

export interface DamRoomIds {
  loudRoom: string;
  deepCanyon: string;
  damLobby: string;
  dam: string;
  damBase: string;
  maintenanceRoom: string;
  reservoirSouth: string;
  reservoir: string;
}

/**
 * Create all rooms in the Dam region
 */
export function createDamRooms(world: WorldModel): DamRoomIds {
  const loudRoom = createLoudRoom(world);
  const deepCanyon = createDeepCanyon(world);
  const damLobby = createDamLobby(world);
  const dam = createDam(world);
  const damBase = createDamBase(world);
  const maintenanceRoom = createMaintenanceRoom(world);
  const reservoirSouth = createReservoirSouth(world);
  const reservoir = createReservoir(world);

  const roomIds: DamRoomIds = {
    loudRoom: loudRoom.id,
    deepCanyon: deepCanyon.id,
    damLobby: damLobby.id,
    dam: dam.id,
    damBase: damBase.id,
    maintenanceRoom: maintenanceRoom.id,
    reservoirSouth: reservoirSouth.id,
    reservoir: reservoir.id
  };

  // Connect rooms within this region
  connectDamRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Dam region
 */
export { createDamObjects } from './objects';

/**
 * Connect Dam region rooms to each other
 * See README.md for connection diagram
 */
function connectDamRooms(world: WorldModel, roomIds: DamRoomIds): void {
  // Loud Room: UP to Deep Canyon
  const loudRoom = world.getEntity(roomIds.loudRoom);
  if (loudRoom) {
    const roomTrait = loudRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.deepCanyon },
        // SOUTH to Round Room - connected externally
      };
    }
  }

  // Deep Canyon: DOWN to Loud Room, NORTH to Dam Lobby
  const deepCanyon = world.getEntity(roomIds.deepCanyon);
  if (deepCanyon) {
    const roomTrait = deepCanyon.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.loudRoom },
        [Direction.NORTH]: { destination: roomIds.damLobby },
      };
    }
  }

  // Dam Lobby: SOUTH to Deep Canyon, NORTH to Dam, EAST to Maintenance
  const damLobby = world.getEntity(roomIds.damLobby);
  if (damLobby) {
    const roomTrait = damLobby.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.deepCanyon },
        [Direction.NORTH]: { destination: roomIds.dam },
        [Direction.EAST]: { destination: roomIds.maintenanceRoom },
      };
    }
  }

  // Dam: SOUTH to Lobby, DOWN to Base, NORTH to Reservoir South
  const dam = world.getEntity(roomIds.dam);
  if (dam) {
    const roomTrait = dam.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.damLobby },
        [Direction.DOWN]: { destination: roomIds.damBase },
        [Direction.NORTH]: { destination: roomIds.reservoirSouth },
      };
    }
  }

  // Dam Base: UP to Dam
  const damBase = world.getEntity(roomIds.damBase);
  if (damBase) {
    const roomTrait = damBase.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.dam },
        // River access - future phases
      };
    }
  }

  // Maintenance Room: WEST to Dam Lobby
  const maintenanceRoom = world.getEntity(roomIds.maintenanceRoom);
  if (maintenanceRoom) {
    const roomTrait = maintenanceRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.damLobby },
      };
    }
  }

  // Reservoir South: SOUTH to Dam, NORTH to Reservoir
  const reservoirSouth = world.getEntity(roomIds.reservoirSouth);
  if (reservoirSouth) {
    const roomTrait = reservoirSouth.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.dam },
        [Direction.NORTH]: { destination: roomIds.reservoir },
      };
    }
  }

  // Reservoir: SOUTH to Reservoir South
  const reservoir = world.getEntity(roomIds.reservoir);
  if (reservoir) {
    const roomTrait = reservoir.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.reservoirSouth },
      };
    }
  }
}

/**
 * Connect Dam region to Round Room (external connection)
 */
export function connectDamToUnderground(
  world: WorldModel,
  damIds: DamRoomIds,
  roundRoomId: string
): void {
  // Round Room NORTH to Loud Room
  const roundRoom = world.getEntity(roundRoomId);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: damIds.loudRoom };
    }
  }

  // Loud Room SOUTH to Round Room
  const loudRoom = world.getEntity(damIds.loudRoom);
  if (loudRoom) {
    const roomTrait = loudRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: roundRoomId };
    }
  }
}
