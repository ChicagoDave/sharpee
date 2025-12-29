/**
 * Maze Region - The infamous maze of twisty little passages
 *
 * Based on Mainframe Zork's maze with intentionally confusing connections.
 * Includes: Grating Room, Maze1-Maze20, Dead End, Cyclops Room, Treasure Room
 * Total: 24 rooms
 *
 * Entry: Grating Room (from Clearing above)
 * Key exits: Cyclops Room (up to Strange Passage), Treasure Room (thief's lair)
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
import { createMaze16 } from './rooms/maze16';
import { createMaze17 } from './rooms/maze17';
import { createMaze18 } from './rooms/maze18';
import { createMaze19 } from './rooms/maze19';
import { createMaze20 } from './rooms/maze20';
import { createDeadEnd } from './rooms/dead-end';
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
  maze16: string;
  maze17: string;
  maze18: string;
  maze19: string;
  maze20: string;
  deadEnd: string;
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
  const maze16 = createMaze16(world);
  const maze17 = createMaze17(world);
  const maze18 = createMaze18(world);
  const maze19 = createMaze19(world);
  const maze20 = createMaze20(world);
  const deadEnd = createDeadEnd(world);
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
    maze16: maze16.id,
    maze17: maze17.id,
    maze18: maze18.id,
    maze19: maze19.id,
    maze20: maze20.id,
    deadEnd: deadEnd.id,
    cyclopsRoom: cyclopsRoom.id,
    treasureRoom: treasureRoom.id
  };

  // Connect the maze rooms (intentionally confusing!)
  connectMazeRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Maze region
 */
export { createMazeObjects } from './objects';

/**
 * Connect Maze rooms to each other
 *
 * The maze connections are based on Mainframe Zork's original maze.
 * These are intentionally confusing - going one direction and then
 * the opposite direction often doesn't return you to your starting point.
 */
function connectMazeRooms(world: WorldModel, roomIds: MazeRoomIds): void {
  // Grating Room - entry from Clearing above
  const gratingRoom = world.getEntity(roomIds.gratingRoom);
  if (gratingRoom) {
    const roomTrait = gratingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // UP leads to Clearing - connected externally
        [Direction.SOUTHWEST]: { destination: roomIds.maze1 },
      };
    }
  }

  // Maze 1
  const maze1 = world.getEntity(roomIds.maze1);
  if (maze1) {
    const roomTrait = maze1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze1 },  // loops back
        [Direction.SOUTH]: { destination: roomIds.maze4 },
        [Direction.EAST]: { destination: roomIds.maze2 },
        [Direction.WEST]: { destination: roomIds.maze11 },
        [Direction.UP]: { destination: roomIds.maze2 },
      };
    }
  }

  // Maze 2
  const maze2 = world.getEntity(roomIds.maze2);
  if (maze2) {
    const roomTrait = maze2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze1 },
        [Direction.EAST]: { destination: roomIds.maze3 },
        [Direction.DOWN]: { destination: roomIds.deadEnd },
      };
    }
  }

  // Maze 3
  const maze3 = world.getEntity(roomIds.maze3);
  if (maze3) {
    const roomTrait = maze3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze3 },  // loops back
        [Direction.WEST]: { destination: roomIds.maze2 },
        [Direction.UP]: { destination: roomIds.maze5 },
      };
    }
  }

  // Maze 4
  const maze4 = world.getEntity(roomIds.maze4);
  if (maze4) {
    const roomTrait = maze4.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze1 },
        [Direction.WEST]: { destination: roomIds.deadEnd },
        [Direction.EAST]: { destination: roomIds.maze5 },
      };
    }
  }

  // Maze 5 - main junction
  const maze5 = world.getEntity(roomIds.maze5);
  if (maze5) {
    const roomTrait = maze5.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze6 },
        [Direction.SOUTH]: { destination: roomIds.maze7 },
        [Direction.EAST]: { destination: roomIds.maze8 },
        [Direction.DOWN]: { destination: roomIds.maze3 },
        [Direction.WEST]: { destination: roomIds.maze4 },
      };
    }
  }

  // Maze 6
  const maze6 = world.getEntity(roomIds.maze6);
  if (maze6) {
    const roomTrait = maze6.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze5 },
        [Direction.EAST]: { destination: roomIds.maze9 },
        [Direction.DOWN]: { destination: roomIds.maze7 },
      };
    }
  }

  // Maze 7
  const maze7 = world.getEntity(roomIds.maze7);
  if (maze7) {
    const roomTrait = maze7.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze5 },
        [Direction.SOUTH]: { destination: roomIds.maze8 },
        [Direction.EAST]: { destination: roomIds.maze10 },
        [Direction.UP]: { destination: roomIds.maze6 },
        [Direction.DOWN]: { destination: roomIds.maze12 },
      };
    }
  }

  // Maze 8
  const maze8 = world.getEntity(roomIds.maze8);
  if (maze8) {
    const roomTrait = maze8.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze7 },
        [Direction.WEST]: { destination: roomIds.maze5 },
        [Direction.SOUTHEAST]: { destination: roomIds.maze9 },
      };
    }
  }

  // Maze 9
  const maze9 = world.getEntity(roomIds.maze9);
  if (maze9) {
    const roomTrait = maze9.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTHWEST]: { destination: roomIds.maze8 },
        [Direction.WEST]: { destination: roomIds.maze6 },
        [Direction.SOUTH]: { destination: roomIds.maze10 },
        [Direction.DOWN]: { destination: roomIds.maze13 },
      };
    }
  }

  // Maze 10
  const maze10 = world.getEntity(roomIds.maze10);
  if (maze10) {
    const roomTrait = maze10.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze9 },
        [Direction.WEST]: { destination: roomIds.maze7 },
        [Direction.UP]: { destination: roomIds.maze11 },
      };
    }
  }

  // Maze 11
  const maze11 = world.getEntity(roomIds.maze11);
  if (maze11) {
    const roomTrait = maze11.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.gratingRoom },
        [Direction.EAST]: { destination: roomIds.maze1 },
        [Direction.DOWN]: { destination: roomIds.maze10 },
        [Direction.NORTHEAST]: { destination: roomIds.gratingRoom },
        [Direction.WEST]: { destination: roomIds.maze12 },
      };
    }
  }

  // Maze 12
  const maze12 = world.getEntity(roomIds.maze12);
  if (maze12) {
    const roomTrait = maze12.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze11 },
        [Direction.UP]: { destination: roomIds.maze7 },
        [Direction.SOUTH]: { destination: roomIds.maze13 },
        [Direction.WEST]: { destination: roomIds.maze14 },
      };
    }
  }

  // Maze 13
  const maze13 = world.getEntity(roomIds.maze13);
  if (maze13) {
    const roomTrait = maze13.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze12 },
        [Direction.UP]: { destination: roomIds.maze9 },
        [Direction.EAST]: { destination: roomIds.maze14 },
        [Direction.DOWN]: { destination: roomIds.maze14 },
      };
    }
  }

  // Maze 14
  const maze14 = world.getEntity(roomIds.maze14);
  if (maze14) {
    const roomTrait = maze14.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze12 },
        [Direction.WEST]: { destination: roomIds.maze13 },
        [Direction.UP]: { destination: roomIds.maze13 },
        [Direction.SOUTH]: { destination: roomIds.maze15 },
      };
    }
  }

  // Maze 15
  const maze15 = world.getEntity(roomIds.maze15);
  if (maze15) {
    const roomTrait = maze15.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze14 },
        [Direction.SOUTH]: { destination: roomIds.maze16 },
        [Direction.WEST]: { destination: roomIds.maze17 },
      };
    }
  }

  // Maze 16
  const maze16 = world.getEntity(roomIds.maze16);
  if (maze16) {
    const roomTrait = maze16.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze15 },
        [Direction.EAST]: { destination: roomIds.maze17 },
        [Direction.SOUTH]: { destination: roomIds.maze18 },
      };
    }
  }

  // Maze 17 - near Cyclops
  const maze17 = world.getEntity(roomIds.maze17);
  if (maze17) {
    const roomTrait = maze17.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze15 },
        [Direction.WEST]: { destination: roomIds.maze16 },
        [Direction.SOUTH]: { destination: roomIds.maze19 },
        [Direction.NORTH]: { destination: roomIds.cyclopsRoom },
      };
    }
  }

  // Maze 18
  const maze18 = world.getEntity(roomIds.maze18);
  if (maze18) {
    const roomTrait = maze18.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze16 },
        [Direction.WEST]: { destination: roomIds.maze19 },
        [Direction.SOUTH]: { destination: roomIds.maze20 },
      };
    }
  }

  // Maze 19
  const maze19 = world.getEntity(roomIds.maze19);
  if (maze19) {
    const roomTrait = maze19.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze17 },
        [Direction.EAST]: { destination: roomIds.maze18 },
        [Direction.DOWN]: { destination: roomIds.maze20 },
      };
    }
  }

  // Maze 20
  const maze20 = world.getEntity(roomIds.maze20);
  if (maze20) {
    const roomTrait = maze20.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.maze18 },
        [Direction.UP]: { destination: roomIds.maze19 },
        [Direction.WEST]: { destination: roomIds.maze20 },  // loops back
      };
    }
  }

  // Dead End - contains skeleton, coins, and key
  const deadEnd = world.getEntity(roomIds.deadEnd);
  if (deadEnd) {
    const roomTrait = deadEnd.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.maze4 },
        [Direction.UP]: { destination: roomIds.maze2 },
      };
    }
  }

  // Cyclops Room
  const cyclopsRoom = world.getEntity(roomIds.cyclopsRoom);
  if (cyclopsRoom) {
    const roomTrait = cyclopsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.maze17 },
        [Direction.NORTHWEST]: { destination: roomIds.treasureRoom },
        // UP leads to Strange Passage and then Living Room - connected externally
      };
    }
  }

  // Treasure Room (Thief's Lair)
  const treasureRoom = world.getEntity(roomIds.treasureRoom);
  if (treasureRoom) {
    const roomTrait = treasureRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.cyclopsRoom },
        // UP via chimney - potentially connects elsewhere
      };
    }
  }
}

/**
 * Connect Maze to Clearing (surface)
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
  // Cyclops Room UP leads to Living Room (via Strange Passage)
  // This is a one-way shortcut after defeating cyclops
  const cyclopsRoom = world.getEntity(mazeIds.cyclopsRoom);
  if (cyclopsRoom) {
    const roomTrait = cyclopsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: livingRoomId };
    }
  }
}
