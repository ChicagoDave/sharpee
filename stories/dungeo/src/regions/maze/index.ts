/**
 * Maze Region - The infamous maze of twisty little passages
 *
 * Based on Mainframe Zork's maze.
 * Includes: Grating Room, Maze1-Maze15, Dead End 1-5, Cyclops Room, Treasure Room
 * Total: 23 rooms
 *
 * Entry points:
 * - Grating Room (from Clearing above via grating)
 * - Maze-1 (from Troll Room west, from Round Room southwest)
 * - Maze-9 (from Cyclops Room northeast)
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createGratingRoom } from './rooms/grating-room';
import { createMaze1 } from './rooms/maze1';
import { createMaze2 } from './rooms/maze2';
import { createMaze3 } from './rooms/maze3';
import { createMaze4 } from './rooms/maze4';
import { createMaze5 } from './rooms/maze5';
import { createMaze6 } from './rooms/maze6';
import { createMaze7 } from './rooms/maze7';
import { createMaze8 } from './rooms/maze8';
import { createMaze9 } from './rooms/maze9';
import { createMaze10 } from './rooms/maze10';
import { createMaze11 } from './rooms/maze11';
import { createMaze12 } from './rooms/maze12';
import { createMaze13 } from './rooms/maze13';
import { createMaze14 } from './rooms/maze14';
import { createMaze15 } from './rooms/maze15';
import { createDeadEnd1, createDeadEnd2, createDeadEnd3, createDeadEnd4, createDeadEnd5 } from './rooms/dead-end';
import { createCyclopsRoom } from './rooms/cyclops-room';
import { createTreasureRoom } from './rooms/treasure-room';

export interface MazeRoomIds {
  gratingRoom: string;
  maze1: string;
  maze2: string;
  maze3: string;
  maze4: string;
  maze5: string;
  maze6: string;
  maze7: string;
  maze8: string;
  maze9: string;
  maze10: string;
  maze11: string;
  maze12: string;
  maze13: string;
  maze14: string;
  maze15: string;
  deadEnd1: string;
  deadEnd2: string;
  deadEnd3: string;
  deadEnd4: string;
  deadEnd5: string;
  cyclopsRoom: string;
  treasureRoom: string;
}

/**
 * Create all rooms in the Maze region
 */
export function createMazeRooms(world: WorldModel): MazeRoomIds {
  const gratingRoom = createGratingRoom(world);
  const maze1 = createMaze1(world);
  const maze2 = createMaze2(world);
  const maze3 = createMaze3(world);
  const maze4 = createMaze4(world);
  const maze5 = createMaze5(world);
  const maze6 = createMaze6(world);
  const maze7 = createMaze7(world);
  const maze8 = createMaze8(world);
  const maze9 = createMaze9(world);
  const maze10 = createMaze10(world);
  const maze11 = createMaze11(world);
  const maze12 = createMaze12(world);
  const maze13 = createMaze13(world);
  const maze14 = createMaze14(world);
  const maze15 = createMaze15(world);
  const deadEnd1 = createDeadEnd1(world);
  const deadEnd2 = createDeadEnd2(world);
  const deadEnd3 = createDeadEnd3(world);
  const deadEnd4 = createDeadEnd4(world);
  const deadEnd5 = createDeadEnd5(world);
  const cyclopsRoom = createCyclopsRoom(world);
  const treasureRoom = createTreasureRoom(world);

  const roomIds: MazeRoomIds = {
    gratingRoom: gratingRoom.id,
    maze1: maze1.id,
    maze2: maze2.id,
    maze3: maze3.id,
    maze4: maze4.id,
    maze5: maze5.id,
    maze6: maze6.id,
    maze7: maze7.id,
    maze8: maze8.id,
    maze9: maze9.id,
    maze10: maze10.id,
    maze11: maze11.id,
    maze12: maze12.id,
    maze13: maze13.id,
    maze14: maze14.id,
    maze15: maze15.id,
    deadEnd1: deadEnd1.id,
    deadEnd2: deadEnd2.id,
    deadEnd3: deadEnd3.id,
    deadEnd4: deadEnd4.id,
    deadEnd5: deadEnd5.id,
    cyclopsRoom: cyclopsRoom.id,
    treasureRoom: treasureRoom.id
  };

  // Connect the maze rooms
  connectMazeRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Maze region
 */
export { createMazeObjects } from './objects';

/**
 * Connect Maze rooms to each other
 * Based on map-connections.md from THE MAP OF DUNGEON
 */
function connectMazeRooms(world: WorldModel, roomIds: MazeRoomIds): void {
  // MAZE-1: W→Troll Room (external), E→Maze-2, S→Maze-3
  const maze1 = world.getEntity(roomIds.maze1);
  if (maze1) {
    const roomTrait = maze1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // W→Troll Room connected externally
        [Direction.EAST]: { destination: roomIds.maze2 },
        [Direction.SOUTH]: { destination: roomIds.maze3 },
      };
    }
  }

  // MAZE-2: N→Maze-1, W→Maze-4, E→Dead End-1
  const maze2 = world.getEntity(roomIds.maze2);
  if (maze2) {
    const roomTrait = maze2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze1 },
        [Direction.WEST]: { destination: roomIds.maze4 },
        [Direction.EAST]: { destination: roomIds.deadEnd1 },
      };
    }
  }

  // MAZE-3: S→Maze-1, N→Maze-2, E→Maze-4
  const maze3 = world.getEntity(roomIds.maze3);
  if (maze3) {
    const roomTrait = maze3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze1 },
        [Direction.NORTH]: { destination: roomIds.maze2 },
        [Direction.EAST]: { destination: roomIds.maze4 },
      };
    }
  }

  // MAZE-4: N→Maze-2, W→Maze-3, U→Maze-15
  const maze4 = world.getEntity(roomIds.maze4);
  if (maze4) {
    const roomTrait = maze4.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze2 },
        [Direction.WEST]: { destination: roomIds.maze3 },
        [Direction.UP]: { destination: roomIds.maze15 },
      };
    }
  }

  // MAZE-5: NE→Dead End-3, SE→Dead End-4
  const maze5 = world.getEntity(roomIds.maze5);
  if (maze5) {
    const roomTrait = maze5.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTHEAST]: { destination: roomIds.deadEnd3 },
        [Direction.SOUTHEAST]: { destination: roomIds.deadEnd4 },
      };
    }
  }

  // MAZE-6: D→Maze-15, E→Maze-7, U→Maze-11
  const maze6 = world.getEntity(roomIds.maze6);
  if (maze6) {
    const roomTrait = maze6.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.maze15 },
        [Direction.EAST]: { destination: roomIds.maze7 },
        [Direction.UP]: { destination: roomIds.maze11 },
      };
    }
  }

  // MAZE-7: W→Maze-6
  const maze7 = world.getEntity(roomIds.maze7);
  if (maze7) {
    const roomTrait = maze7.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.maze6 },
      };
    }
  }

  // MAZE-8: S→Dead End-3, W→Maze-9
  const maze8 = world.getEntity(roomIds.maze8);
  if (maze8) {
    const roomTrait = maze8.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.deadEnd3 },
        [Direction.WEST]: { destination: roomIds.maze9 },
      };
    }
  }

  // MAZE-9: S→Dead End-3, W→Maze-8, NE→Cyclops Room
  const maze9 = world.getEntity(roomIds.maze9);
  if (maze9) {
    const roomTrait = maze9.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.deadEnd3 },
        [Direction.WEST]: { destination: roomIds.maze8 },
        [Direction.NORTHEAST]: { destination: roomIds.cyclopsRoom },
      };
    }
  }

  // MAZE-10: N→Dead End-5, U→Maze-11, W→Maze-15
  const maze10 = world.getEntity(roomIds.maze10);
  if (maze10) {
    const roomTrait = maze10.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.deadEnd5 },
        [Direction.UP]: { destination: roomIds.maze11 },
        [Direction.WEST]: { destination: roomIds.maze15 },
      };
    }
  }

  // MAZE-11: N→Maze-6, E→Maze-12, W→Maze-10, S→Maze-14, D→Maze-13
  const maze11 = world.getEntity(roomIds.maze11);
  if (maze11) {
    const roomTrait = maze11.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze6 },
        [Direction.EAST]: { destination: roomIds.maze12 },
        [Direction.WEST]: { destination: roomIds.maze10 },
        [Direction.SOUTH]: { destination: roomIds.maze14 },
        [Direction.DOWN]: { destination: roomIds.maze13 },
      };
    }
  }

  // MAZE-12: NW→Maze-14, D→Maze-13, NE→Grating Room
  const maze12 = world.getEntity(roomIds.maze12);
  if (maze12) {
    const roomTrait = maze12.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTHWEST]: { destination: roomIds.maze14 },
        [Direction.DOWN]: { destination: roomIds.maze13 },
        [Direction.NORTHEAST]: { destination: roomIds.gratingRoom },
      };
    }
  }

  // MAZE-13: E→Maze-11, U→Maze-12, W→Maze-14
  const maze13 = world.getEntity(roomIds.maze13);
  if (maze13) {
    const roomTrait = maze13.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze11 },
        [Direction.UP]: { destination: roomIds.maze12 },
        [Direction.WEST]: { destination: roomIds.maze14 },
      };
    }
  }

  // MAZE-14: E→Maze-11, S→Maze-13, W→Maze-12, D→Maze-10
  const maze14 = world.getEntity(roomIds.maze14);
  if (maze14) {
    const roomTrait = maze14.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze11 },
        [Direction.SOUTH]: { destination: roomIds.maze13 },
        [Direction.WEST]: { destination: roomIds.maze12 },
        [Direction.DOWN]: { destination: roomIds.maze10 },
      };
    }
  }

  // MAZE-15: N→Maze-4, SW→Maze-6, E→Dead End-3
  const maze15 = world.getEntity(roomIds.maze15);
  if (maze15) {
    const roomTrait = maze15.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze4 },
        [Direction.SOUTHWEST]: { destination: roomIds.maze6 },
        [Direction.EAST]: { destination: roomIds.deadEnd3 },
      };
    }
  }

  // Dead End-1: S→Maze-2
  const deadEnd1 = world.getEntity(roomIds.deadEnd1);
  if (deadEnd1) {
    const roomTrait = deadEnd1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze2 },
      };
    }
  }

  // Dead End-2: S→Dead End-1
  const deadEnd2 = world.getEntity(roomIds.deadEnd2);
  if (deadEnd2) {
    const roomTrait = deadEnd2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.deadEnd1 },
      };
    }
  }

  // Dead End-3: W→Maze-15, NE→Dead End-2, E→Maze-5, S→Maze-9, U→Maze-8
  const deadEnd3 = world.getEntity(roomIds.deadEnd3);
  if (deadEnd3) {
    const roomTrait = deadEnd3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.maze15 },
        [Direction.NORTHEAST]: { destination: roomIds.deadEnd2 },
        [Direction.EAST]: { destination: roomIds.maze5 },
        [Direction.SOUTH]: { destination: roomIds.maze9 },
        [Direction.UP]: { destination: roomIds.maze8 },
      };
    }
  }

  // Dead End-4: N→Maze-5
  const deadEnd4 = world.getEntity(roomIds.deadEnd4);
  if (deadEnd4) {
    const roomTrait = deadEnd4.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze5 },
      };
    }
  }

  // Dead End-5: S→Maze-10
  const deadEnd5 = world.getEntity(roomIds.deadEnd5);
  if (deadEnd5) {
    const roomTrait = deadEnd5.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze10 },
      };
    }
  }

  // Grating Room: NE→Maze-12, U→Clearing (external)
  const gratingRoom = world.getEntity(roomIds.gratingRoom);
  if (gratingRoom) {
    const roomTrait = gratingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTHWEST]: { destination: roomIds.maze12 },
        // UP→Clearing connected externally
      };
    }
  }

  // Cyclops Room: NE→Maze-9, U→Treasure Room, N→Strange Passage (external)
  const cyclopsRoom = world.getEntity(roomIds.cyclopsRoom);
  if (cyclopsRoom) {
    const roomTrait = cyclopsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTHWEST]: { destination: roomIds.maze9 },
        [Direction.UP]: { destination: roomIds.treasureRoom },
        // N→Strange Passage connected externally
      };
    }
  }

  // Treasure Room: SW→Cyclops Room
  const treasureRoom = world.getEntity(roomIds.treasureRoom);
  if (treasureRoom) {
    const roomTrait = treasureRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.cyclopsRoom },
      };
    }
  }
}

/**
 * Connect Maze to Clearing (surface) via grating
 */
export function connectMazeToClearing(
  world: WorldModel,
  mazeIds: MazeRoomIds,
  clearingId: string
): void {
  // Grating Room UP to Clearing
  const gratingRoom = world.getEntity(mazeIds.gratingRoom);
  if (gratingRoom) {
    const roomTrait = gratingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: clearingId };
    }
  }

  // Clearing DOWN to Grating Room (through grating)
  const clearing = world.getEntity(clearingId);
  if (clearing) {
    const roomTrait = clearing.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: mazeIds.gratingRoom };
    }
  }
}

/**
 * Connect Cyclops Room to Living Room via Strange Passage
 * This is the shortcut out of the maze after defeating the cyclops
 */
export function connectCyclopsToLivingRoom(
  world: WorldModel,
  mazeIds: MazeRoomIds,
  livingRoomId: string
): void {
  // Cyclops Room NORTH leads to Living Room (via Strange Passage)
  const cyclopsRoom = world.getEntity(mazeIds.cyclopsRoom);
  if (cyclopsRoom) {
    const roomTrait = cyclopsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: livingRoomId };
    }
  }
}

/**
 * Connect Maze-1 to Troll Room
 *
 * Per Troll Room description: "passages to the east and south and a
 * forbidding hole leading west" - the WEST exit leads to the maze.
 */
export function connectMazeToTrollRoom(
  world: WorldModel,
  mazeIds: MazeRoomIds,
  trollRoomId: string
): void {
  // Maze-1 WEST to Troll Room
  const maze1 = world.getEntity(mazeIds.maze1);
  if (maze1) {
    const roomTrait = maze1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: trollRoomId };
    }
  }

  // Troll Room WEST to Maze-1 (the "forbidding hole leading west")
  const trollRoom = world.getEntity(trollRoomId);
  if (trollRoom) {
    const roomTrait = trollRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: mazeIds.maze1 };
    }
  }
}

/**
 * Connect Maze-1 to Round Room
 */
export function connectMazeToRoundRoom(
  world: WorldModel,
  mazeIds: MazeRoomIds,
  roundRoomId: string
): void {
  // Round Room SOUTHWEST to Maze-1
  const roundRoom = world.getEntity(roundRoomId);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTHWEST] = { destination: mazeIds.maze1 };
    }
  }

  // Maze-1 NORTHEAST to Round Room
  const maze1 = world.getEntity(mazeIds.maze1);
  if (maze1) {
    const roomTrait = maze1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTHEAST] = { destination: roundRoomId };
    }
  }
}
