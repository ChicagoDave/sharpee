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
import { createReservoirNorth } from './rooms/reservoir-north';
import { createStreamView } from './rooms/stream-view';
import { createGlacierRoom } from './rooms/glacier-room';
export interface DamRoomIds {
  loudRoom: string;
  deepCanyon: string;
  damLobby: string;
  dam: string;
  damBase: string;
  maintenanceRoom: string;
  reservoirSouth: string;
  reservoir: string;
  reservoirNorth: string;
  streamView: string;
  glacierRoom: string;
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
  const reservoirNorth = createReservoirNorth(world);
  const streamView = createStreamView(world);
  const glacierRoom = createGlacierRoom(world);

  const roomIds: DamRoomIds = {
    loudRoom: loudRoom.id,
    deepCanyon: deepCanyon.id,
    damLobby: damLobby.id,
    dam: dam.id,
    damBase: damBase.id,
    maintenanceRoom: maintenanceRoom.id,
    reservoirSouth: reservoirSouth.id,
    reservoir: reservoir.id,
    reservoirNorth: reservoirNorth.id,
    streamView: streamView.id,
    glacierRoom: glacierRoom.id
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
  // Loud Room: internal connections only
  // UP → Damp Cave and SW → N/S Passage are set externally by connectUndergroundToDam
  const loudRoom = world.getEntity(roomIds.loudRoom);
  if (loudRoom) {
    const roomTrait = loudRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // SOUTH to Round Room - connected externally by connectDamToUnderground
        // UP to Damp Cave - connected externally by connectUndergroundToDam
      };
    }
  }

  // Deep Canyon: SE to Round Room (via external), NORTH to Dam Lobby
  // Note: Deep Canyon is accessed from Round Room NW, so the return is SE
  const deepCanyon = world.getEntity(roomIds.deepCanyon);
  if (deepCanyon) {
    const roomTrait = deepCanyon.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.damLobby },
        // SOUTHEAST to Round Room - connected externally by connectDamToUnderground
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

  // Reservoir South: SOUTH to Dam, NORTH to Reservoir, WEST to Stream View
  const reservoirSouth = world.getEntity(roomIds.reservoirSouth);
  if (reservoirSouth) {
    const roomTrait = reservoirSouth.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.dam },
        [Direction.NORTH]: { destination: roomIds.reservoir },
        [Direction.WEST]: { destination: roomIds.streamView },
      };
    }
  }

  // Reservoir: SOUTH to Reservoir South, NORTH to Reservoir North
  const reservoir = world.getEntity(roomIds.reservoir);
  if (reservoir) {
    const roomTrait = reservoir.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.reservoirSouth },
        [Direction.NORTH]: { destination: roomIds.reservoirNorth },
      };
    }
  }

  // Reservoir North: SOUTH to Reservoir
  // NORTH to Atlantis Room is connected externally by connectDamToUnderground
  const reservoirNorth = world.getEntity(roomIds.reservoirNorth);
  if (reservoirNorth) {
    const roomTrait = reservoirNorth.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.reservoir },
      };
    }
  }

  // Stream View: EAST to Reservoir South, NORTH to Glacier Room
  const streamView = world.getEntity(roomIds.streamView);
  if (streamView) {
    const roomTrait = streamView.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.reservoirSouth },
        [Direction.NORTH]: { destination: roomIds.glacierRoom },
      };
    }
  }

  // Glacier Room: SOUTH to Stream View
  // WEST to Small Chamber (volcano region) is connected externally
  // DOWN to Egyptian Room is connected externally
  const glacierRoom = world.getEntity(roomIds.glacierRoom);
  if (glacierRoom) {
    const roomTrait = glacierRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.streamView },
      };
    }
  }
}

/**
 * Connect Dam region to Round Room (external connection)
 *
 * Note: Round Room NW → Deep Canyon (per map-connections.md)
 * Loud Room is accessed via N/S Passage (underground region), not directly from Round Room.
 */
export function connectDamToUnderground(
  world: WorldModel,
  damIds: DamRoomIds,
  roundRoomId: string
): void {
  // Round Room NW → Deep Canyon
  const roundRoom = world.getEntity(roundRoomId);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTHWEST] = { destination: damIds.deepCanyon };
    }
  }

  // Deep Canyon SE → Round Room
  const deepCanyon = world.getEntity(damIds.deepCanyon);
  if (deepCanyon) {
    const roomTrait = deepCanyon.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTHEAST] = { destination: roundRoomId };
    }
  }
}

/**
 * Connect Reservoir North to Atlantis Room
 *
 * Per map-connections.md:
 * - Reservoir North N → Atlantis Room
 * - Atlantis Room SE → Reservoir North
 */
export function connectReservoirToAtlantis(
  world: WorldModel,
  damIds: DamRoomIds,
  atlantisRoomId: string
): void {
  // Reservoir North N → Atlantis Room
  const reservoirNorth = world.getEntity(damIds.reservoirNorth);
  if (reservoirNorth) {
    const roomTrait = reservoirNorth.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: atlantisRoomId };
    }
  }

  // Atlantis Room SE → Reservoir North
  const atlantisRoom = world.getEntity(atlantisRoomId);
  if (atlantisRoom) {
    const roomTrait = atlantisRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTHEAST] = { destination: damIds.reservoirNorth };
    }
  }
}

/**
 * Connect Glacier Room to Egyptian Room
 *
 * Per map-connections.md:
 * - Egyptian Room U → Glacier Room
 * - Glacier Room D → Egyptian Room
 */
export function connectGlacierToEgyptian(
  world: WorldModel,
  damIds: DamRoomIds,
  egyptianRoomId: string
): void {
  // Glacier Room D → Egyptian Room
  const glacierRoom = world.getEntity(damIds.glacierRoom);
  if (glacierRoom) {
    const roomTrait = glacierRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: egyptianRoomId };
    }
  }

  // Egyptian Room U → Glacier Room
  const egyptianRoom = world.getEntity(egyptianRoomId);
  if (egyptianRoom) {
    const roomTrait = egyptianRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: damIds.glacierRoom };
    }
  }
}
