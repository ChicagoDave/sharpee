/**
 * Forest Region - Forest paths around the white house
 *
 * Includes: Forest paths (4), Clearing, Up a Tree, Canyon area (3)
 * The forest surrounds the white house and provides access to the Clearing
 * where the underground grating is located.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createForestPath1 } from './rooms/forest-path-1';
import { createForestPath2 } from './rooms/forest-path-2';
import { createForestPath3 } from './rooms/forest-path-3';
import { createForestPath4 } from './rooms/forest-path-4';
import { createClearing } from './rooms/clearing';
import { createUpATree } from './rooms/up-a-tree';
import { createCanyonView } from './rooms/canyon-view';
import { createRockyLedge } from './rooms/rocky-ledge';
import { createCanyonBottom } from './rooms/canyon-bottom';

export interface ForestRoomIds {
  forestPath1: string;  // North of North of House
  forestPath2: string;  // East of clearing
  forestPath3: string;  // West of forest path 2
  forestPath4: string;  // South of forest path 3 (maze edge)
  clearing: string;     // Has grating
  upATree: string;      // Up the tree in forest
  canyonView: string;   // Top of Great Canyon
  rockyLedge: string;   // Halfway down canyon
  canyonBottom: string; // Bottom of canyon
}

/**
 * Create all rooms in the Forest region
 */
export function createForestRooms(world: WorldModel): ForestRoomIds {
  const forestPath1 = createForestPath1(world);
  const forestPath2 = createForestPath2(world);
  const forestPath3 = createForestPath3(world);
  const forestPath4 = createForestPath4(world);
  const clearing = createClearing(world);
  const upATree = createUpATree(world);
  const canyonView = createCanyonView(world);
  const rockyLedge = createRockyLedge(world);
  const canyonBottom = createCanyonBottom(world);

  const roomIds: ForestRoomIds = {
    forestPath1: forestPath1.id,
    forestPath2: forestPath2.id,
    forestPath3: forestPath3.id,
    forestPath4: forestPath4.id,
    clearing: clearing.id,
    upATree: upATree.id,
    canyonView: canyonView.id,
    rockyLedge: rockyLedge.id,
    canyonBottom: canyonBottom.id
  };

  // Connect the forest rooms
  connectForestRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Forest region
 */
export { createForestObjects } from './objects';

/**
 * Connect Forest rooms to each other
 */
function connectForestRooms(world: WorldModel, roomIds: ForestRoomIds): void {
  // Forest Path 1 (near North of House)
  const forestPath1 = world.getEntity(roomIds.forestPath1);
  if (forestPath1) {
    const roomTrait = forestPath1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.clearing },
        [Direction.UP]: { destination: roomIds.upATree },
        // South connects to North of House - set externally
      };
    }
  }

  // Forest Path 2
  const forestPath2 = world.getEntity(roomIds.forestPath2);
  if (forestPath2) {
    const roomTrait = forestPath2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.clearing },
        [Direction.EAST]: { destination: roomIds.forestPath3 },
      };
    }
  }

  // Forest Path 3
  const forestPath3 = world.getEntity(roomIds.forestPath3);
  if (forestPath3) {
    const roomTrait = forestPath3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.forestPath2 },
        [Direction.SOUTH]: { destination: roomIds.forestPath4 },
        [Direction.EAST]: { destination: roomIds.canyonView },
      };
    }
  }

  // Canyon View
  const canyonView = world.getEntity(roomIds.canyonView);
  if (canyonView) {
    const roomTrait = canyonView.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.forestPath3 },
        [Direction.DOWN]: { destination: roomIds.rockyLedge },
      };
    }
  }

  // Rocky Ledge
  const rockyLedge = world.getEntity(roomIds.rockyLedge);
  if (rockyLedge) {
    const roomTrait = rockyLedge.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.canyonView },
        [Direction.DOWN]: { destination: roomIds.canyonBottom },
      };
    }
  }

  // Canyon Bottom
  const canyonBottom = world.getEntity(roomIds.canyonBottom);
  if (canyonBottom) {
    const roomTrait = canyonBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.rockyLedge },
        // North/South could connect to river areas later
      };
    }
  }

  // Forest Path 4 (near maze)
  const forestPath4 = world.getEntity(roomIds.forestPath4);
  if (forestPath4) {
    const roomTrait = forestPath4.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.forestPath3 },
        // South/West could connect to maze - later
      };
    }
  }

  // Clearing
  const clearing = world.getEntity(roomIds.clearing);
  if (clearing) {
    const roomTrait = clearing.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.forestPath1 },
        [Direction.EAST]: { destination: roomIds.forestPath2 },
        // Down through grating - connected later when grating implemented
      };
    }
  }

  // Up a Tree
  const upATree = world.getEntity(roomIds.upATree);
  if (upATree) {
    const roomTrait = upATree.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.forestPath1 },
      };
    }
  }
}

/**
 * Connect Forest to White House exterior
 */
export function connectForestToExterior(
  world: WorldModel,
  forestIds: ForestRoomIds,
  northOfHouseId: string,
  behindHouseId: string
): void {
  // Forest Path 1 south to North of House
  const forestPath1 = world.getEntity(forestIds.forestPath1);
  if (forestPath1) {
    const roomTrait = forestPath1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: northOfHouseId };
    }
  }

  // North of House north to Forest Path 1
  const northOfHouse = world.getEntity(northOfHouseId);
  if (northOfHouse) {
    const roomTrait = northOfHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: forestIds.forestPath1 };
    }
  }

  // Behind House east to Clearing (or forest)
  const behindHouse = world.getEntity(behindHouseId);
  if (behindHouse) {
    const roomTrait = behindHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: forestIds.clearing };
    }
  }

  // Clearing west to Behind House? Let's not connect this directly
  // The clearing is north of the house area
}
