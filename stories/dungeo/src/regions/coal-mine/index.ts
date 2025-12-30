/**
 * Coal Mine Region - Deep underground mining area
 *
 * Accessed from Mirror Room (Coal Mine state) via Cold Passage.
 * Features the slide to Cellar, mine maze, and machine room.
 *
 * Key areas:
 * - Cold Passage / Steep Crawlway (connects to Mirror Room)
 * - Slide Room and slides (one-way to Cellar)
 * - Mine Entrance and mine tunnels
 * - Mine Maze (7 rooms)
 * - Machine Room (coal-powered machine)
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createColdPassage } from './rooms/cold-passage';
import { createSteepCrawlway } from './rooms/steep-crawlway';
import { createSlideRoom } from './rooms/slide-room';
import { createSlide1 } from './rooms/slide-1';
import { createSlide2 } from './rooms/slide-2';
import { createSlide3 } from './rooms/slide-3';
import { createSlideLedge } from './rooms/slide-ledge';
import { createSootyRoom } from './rooms/sooty-room';
import { createMineEntrance } from './rooms/mine-entrance';
import { createSqueakyRoom } from './rooms/squeaky-room';
import { createSmallRoom } from './rooms/small-room';
import { createShaftRoom } from './rooms/shaft-room';
import { createWoodenTunnel } from './rooms/wooden-tunnel';
import { createSmellyRoom } from './rooms/smelly-room';
import { createGasRoom } from './rooms/gas-room';
import { createMineMaze1 } from './rooms/mine-maze-1';
import { createMineMaze2 } from './rooms/mine-maze-2';
import { createMineMaze3 } from './rooms/mine-maze-3';
import { createMineMaze4 } from './rooms/mine-maze-4';
import { createMineMaze5 } from './rooms/mine-maze-5';
import { createMineMaze6 } from './rooms/mine-maze-6';
import { createMineMaze7 } from './rooms/mine-maze-7';
import { createLadderTop } from './rooms/ladder-top';
import { createLadderBottom } from './rooms/ladder-bottom';
import { createCoalMineDeadEnd } from './rooms/coal-mine-dead-end';
import { createTimberRoom } from './rooms/timber-room';
import { createBottomOfShaft } from './rooms/bottom-of-shaft';
import { createMachineRoom } from './rooms/machine-room';

export interface CoalMineRoomIds {
  // Mirror Room entrance area
  coldPassage: string;
  steepCrawlway: string;

  // Slide area
  slideRoom: string;
  slide1: string;
  slide2: string;
  slide3: string;
  slideLedge: string;
  sootyRoom: string;

  // Mine entrance area
  mineEntrance: string;
  squeakyRoom: string;
  smallRoom: string;
  shaftRoom: string;
  woodenTunnel: string;
  smellyRoom: string;
  gasRoom: string;

  // Mine maze
  mineMaze1: string;
  mineMaze2: string;
  mineMaze3: string;
  mineMaze4: string;
  mineMaze5: string;
  mineMaze6: string;
  mineMaze7: string;

  // Deep mine
  ladderTop: string;
  ladderBottom: string;
  coalMineDeadEnd: string;
  timberRoom: string;
  bottomOfShaft: string;
  machineRoom: string;

}

/**
 * Create all rooms in the Coal Mine region
 */
export function createCoalMineRooms(world: WorldModel): CoalMineRoomIds {
  // Mirror Room entrance area
  const coldPassage = createColdPassage(world);
  const steepCrawlway = createSteepCrawlway(world);

  // Slide area
  const slideRoom = createSlideRoom(world);
  const slide1 = createSlide1(world);
  const slide2 = createSlide2(world);
  const slide3 = createSlide3(world);
  const slideLedge = createSlideLedge(world);
  const sootyRoom = createSootyRoom(world);

  // Mine entrance area
  const mineEntrance = createMineEntrance(world);
  const squeakyRoom = createSqueakyRoom(world);
  const smallRoom = createSmallRoom(world);
  const shaftRoom = createShaftRoom(world);
  const woodenTunnel = createWoodenTunnel(world);
  const smellyRoom = createSmellyRoom(world);
  const gasRoom = createGasRoom(world);

  // Mine maze
  const mineMaze1 = createMineMaze1(world);
  const mineMaze2 = createMineMaze2(world);
  const mineMaze3 = createMineMaze3(world);
  const mineMaze4 = createMineMaze4(world);
  const mineMaze5 = createMineMaze5(world);
  const mineMaze6 = createMineMaze6(world);
  const mineMaze7 = createMineMaze7(world);

  // Deep mine
  const ladderTop = createLadderTop(world);
  const ladderBottom = createLadderBottom(world);
  const coalMineDeadEnd = createCoalMineDeadEnd(world);
  const timberRoom = createTimberRoom(world);
  const bottomOfShaft = createBottomOfShaft(world);
  const machineRoom = createMachineRoom(world);


  const roomIds: CoalMineRoomIds = {
    coldPassage: coldPassage.id,
    steepCrawlway: steepCrawlway.id,
    slideRoom: slideRoom.id,
    slide1: slide1.id,
    slide2: slide2.id,
    slide3: slide3.id,
    slideLedge: slideLedge.id,
    sootyRoom: sootyRoom.id,
    mineEntrance: mineEntrance.id,
    squeakyRoom: squeakyRoom.id,
    smallRoom: smallRoom.id,
    shaftRoom: shaftRoom.id,
    woodenTunnel: woodenTunnel.id,
    smellyRoom: smellyRoom.id,
    gasRoom: gasRoom.id,
    mineMaze1: mineMaze1.id,
    mineMaze2: mineMaze2.id,
    mineMaze3: mineMaze3.id,
    mineMaze4: mineMaze4.id,
    mineMaze5: mineMaze5.id,
    mineMaze6: mineMaze6.id,
    mineMaze7: mineMaze7.id,
    ladderTop: ladderTop.id,
    ladderBottom: ladderBottom.id,
    coalMineDeadEnd: coalMineDeadEnd.id,
    timberRoom: timberRoom.id,
    bottomOfShaft: bottomOfShaft.id,
    machineRoom: machineRoom.id
  };

  // Connect the coal mine rooms
  connectCoalMineRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Coal Mine region
 */
export { createCoalMineObjects } from './objects';

/**
 * Connect Coal Mine rooms to each other
 * Based on map-connections.md
 */
function connectCoalMineRooms(world: WorldModel, roomIds: CoalMineRoomIds): void {
  // Cold Passage: E→Mirror Room (external), W→Slide Room, N→Steep Crawlway
  const coldPassage = world.getEntity(roomIds.coldPassage);
  if (coldPassage) {
    const roomTrait = coldPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.slideRoom },
        [Direction.NORTH]: { destination: roomIds.steepCrawlway }
      };
    }
  }

  // Steep Crawlway: S→Mirror Room (external), SW→Cold Passage
  const steepCrawlway = world.getEntity(roomIds.steepCrawlway);
  if (steepCrawlway) {
    const roomTrait = steepCrawlway.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTHWEST]: { destination: roomIds.coldPassage }
      };
    }
  }

  // Slide Room: D→Slide-1, E→Cold Passage, N→Mine Entrance
  const slideRoom = world.getEntity(roomIds.slideRoom);
  if (slideRoom) {
    const roomTrait = slideRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.slide1 },
        [Direction.EAST]: { destination: roomIds.coldPassage },
        [Direction.NORTH]: { destination: roomIds.mineEntrance }
      };
    }
  }

  // Slide-1: D→Slide-2 (one-way down)
  const slide1 = world.getEntity(roomIds.slide1);
  if (slide1) {
    const roomTrait = slide1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.slide2 }
      };
    }
  }

  // Slide-2: D→Slide-3 (one-way down)
  const slide2 = world.getEntity(roomIds.slide2);
  if (slide2) {
    const roomTrait = slide2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.slide3 }
      };
    }
  }

  // Slide-3: E→Slide Ledge (D→Cellar set externally)
  const slide3 = world.getEntity(roomIds.slide3);
  if (slide3) {
    const roomTrait = slide3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.slideLedge }
      };
    }
  }

  // Slide Ledge: U→Slide-2, S→Sooty Room
  const slideLedge = world.getEntity(roomIds.slideLedge);
  if (slideLedge) {
    const roomTrait = slideLedge.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.slide2 },
        [Direction.SOUTH]: { destination: roomIds.sootyRoom }
      };
    }
  }

  // Sooty Room: N→Slide Ledge
  const sootyRoom = world.getEntity(roomIds.sootyRoom);
  if (sootyRoom) {
    const roomTrait = sootyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.slideLedge }
      };
    }
  }

  // Mine Entrance: S→Slide Room, NW→Squeaky Room, NE→Shaft Room
  const mineEntrance = world.getEntity(roomIds.mineEntrance);
  if (mineEntrance) {
    const roomTrait = mineEntrance.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.slideRoom },
        [Direction.NORTHWEST]: { destination: roomIds.squeakyRoom },
        [Direction.NORTHEAST]: { destination: roomIds.shaftRoom }
      };
    }
  }

  // Squeaky Room: S→Mine Entrance, W→Small Room
  const squeakyRoom = world.getEntity(roomIds.squeakyRoom);
  if (squeakyRoom) {
    const roomTrait = squeakyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.mineEntrance },
        [Direction.WEST]: { destination: roomIds.smallRoom }
      };
    }
  }

  // Small Room: E→Squeaky Room (dead end)
  const smallRoom = world.getEntity(roomIds.smallRoom);
  if (smallRoom) {
    const roomTrait = smallRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.squeakyRoom }
      };
    }
  }

  // Shaft Room: W→Mine Entrance, N→Wooden Tunnel
  const shaftRoom = world.getEntity(roomIds.shaftRoom);
  if (shaftRoom) {
    const roomTrait = shaftRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.mineEntrance },
        [Direction.NORTH]: { destination: roomIds.woodenTunnel }
      };
    }
  }

  // Wooden Tunnel: S→Shaft Room, W→Smelly Room, NE→Mine Maze-1
  const woodenTunnel = world.getEntity(roomIds.woodenTunnel);
  if (woodenTunnel) {
    const roomTrait = woodenTunnel.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.shaftRoom },
        [Direction.WEST]: { destination: roomIds.smellyRoom },
        [Direction.NORTHEAST]: { destination: roomIds.mineMaze1 }
      };
    }
  }

  // Smelly Room: E→Wooden Tunnel, D→Gas Room
  const smellyRoom = world.getEntity(roomIds.smellyRoom);
  if (smellyRoom) {
    const roomTrait = smellyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.woodenTunnel },
        [Direction.DOWN]: { destination: roomIds.gasRoom }
      };
    }
  }

  // Gas Room: U→Smelly Room
  const gasRoom = world.getEntity(roomIds.gasRoom);
  if (gasRoom) {
    const roomTrait = gasRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.smellyRoom }
      };
    }
  }

  // Mine Maze-1: E→Wooden Tunnel, N→Mine Maze-4, SW→Mine Maze-2
  const mineMaze1 = world.getEntity(roomIds.mineMaze1);
  if (mineMaze1) {
    const roomTrait = mineMaze1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.woodenTunnel },
        [Direction.NORTH]: { destination: roomIds.mineMaze4 },
        [Direction.SOUTHWEST]: { destination: roomIds.mineMaze2 }
      };
    }
  }

  // Mine Maze-2: S→Mine Maze-1, W→Mine Maze-5, U→Mine Maze-3
  const mineMaze2 = world.getEntity(roomIds.mineMaze2);
  if (mineMaze2) {
    const roomTrait = mineMaze2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.mineMaze1 },
        [Direction.WEST]: { destination: roomIds.mineMaze5 },
        [Direction.UP]: { destination: roomIds.mineMaze3 }
      };
    }
  }

  // Mine Maze-3: W→Mine Maze-2, NE→Mine Maze-5, E→Mine Maze-5
  const mineMaze3 = world.getEntity(roomIds.mineMaze3);
  if (mineMaze3) {
    const roomTrait = mineMaze3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.mineMaze2 },
        [Direction.NORTHEAST]: { destination: roomIds.mineMaze5 },
        [Direction.EAST]: { destination: roomIds.mineMaze5 }
      };
    }
  }

  // Mine Maze-4: S→Mine Maze-1, NE→Mine Maze-7, U→Mine Maze-5
  const mineMaze4 = world.getEntity(roomIds.mineMaze4);
  if (mineMaze4) {
    const roomTrait = mineMaze4.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.mineMaze1 },
        [Direction.NORTHEAST]: { destination: roomIds.mineMaze7 },
        [Direction.UP]: { destination: roomIds.mineMaze5 }
      };
    }
  }

  // Mine Maze-5: W→Mine Maze-2, NE→Mine Maze-3, S→Mine Maze-3, D→Mine Maze-7, N→Mine Maze-6, E→Mine Maze-4
  const mineMaze5 = world.getEntity(roomIds.mineMaze5);
  if (mineMaze5) {
    const roomTrait = mineMaze5.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.mineMaze2 },
        [Direction.NORTHEAST]: { destination: roomIds.mineMaze3 },
        [Direction.SOUTH]: { destination: roomIds.mineMaze3 },
        [Direction.DOWN]: { destination: roomIds.mineMaze7 },
        [Direction.NORTH]: { destination: roomIds.mineMaze6 },
        [Direction.EAST]: { destination: roomIds.mineMaze4 }
      };
    }
  }

  // Mine Maze-6: W→Mine Maze-5, S→Mine Maze-7, D→Ladder Top, E→Mine Maze-1
  const mineMaze6 = world.getEntity(roomIds.mineMaze6);
  if (mineMaze6) {
    const roomTrait = mineMaze6.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.mineMaze5 },
        [Direction.SOUTH]: { destination: roomIds.mineMaze7 },
        [Direction.DOWN]: { destination: roomIds.ladderTop },
        [Direction.EAST]: { destination: roomIds.mineMaze1 }
      };
    }
  }

  // Mine Maze-7: U→Mine Maze-5, SE→Mine Maze-4, NW→Mine Maze-6
  const mineMaze7 = world.getEntity(roomIds.mineMaze7);
  if (mineMaze7) {
    const roomTrait = mineMaze7.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.mineMaze5 },
        [Direction.SOUTHEAST]: { destination: roomIds.mineMaze4 },
        [Direction.NORTHWEST]: { destination: roomIds.mineMaze6 }
      };
    }
  }

  // Ladder Top: U→Mine Maze-6, D→Ladder Bottom
  const ladderTop = world.getEntity(roomIds.ladderTop);
  if (ladderTop) {
    const roomTrait = ladderTop.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.mineMaze6 },
        [Direction.DOWN]: { destination: roomIds.ladderBottom }
      };
    }
  }

  // Ladder Bottom: U→Ladder Top, S→Timber Room, NE→Coal Mine Dead End
  const ladderBottom = world.getEntity(roomIds.ladderBottom);
  if (ladderBottom) {
    const roomTrait = ladderBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.ladderTop },
        [Direction.SOUTH]: { destination: roomIds.timberRoom },
        [Direction.NORTHEAST]: { destination: roomIds.coalMineDeadEnd }
      };
    }
  }

  // Coal Mine Dead End: S→Ladder Bottom
  const coalMineDeadEnd = world.getEntity(roomIds.coalMineDeadEnd);
  if (coalMineDeadEnd) {
    const roomTrait = coalMineDeadEnd.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.ladderBottom }
      };
    }
  }

  // Timber Room: N→Ladder Bottom, SW→Bottom of Shaft
  const timberRoom = world.getEntity(roomIds.timberRoom);
  if (timberRoom) {
    const roomTrait = timberRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.ladderBottom },
        [Direction.SOUTHWEST]: { destination: roomIds.bottomOfShaft }
      };
    }
  }

  // Bottom of Shaft: E→Machine Room, NE→Timber Room
  const bottomOfShaft = world.getEntity(roomIds.bottomOfShaft);
  if (bottomOfShaft) {
    const roomTrait = bottomOfShaft.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.machineRoom },
        [Direction.NORTHEAST]: { destination: roomIds.timberRoom }
      };
    }
  }

  // Machine Room: NW→Bottom of Shaft
  const machineRoom = world.getEntity(roomIds.machineRoom);
  if (machineRoom) {
    const roomTrait = machineRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTHWEST]: { destination: roomIds.bottomOfShaft }
      };
    }
  }
}

/**
 * Connect Coal Mine to Mirror Room (Coal Mine state)
 * Called when Mirror Room is in Coal Mine state
 */
export function connectCoalMineToMirrorRoom(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  mirrorRoomId: string
): void {
  // Cold Passage E→Mirror Room
  const coldPassage = world.getEntity(coalMineIds.coldPassage);
  if (coldPassage) {
    const roomTrait = coldPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: mirrorRoomId };
    }
  }

  // Steep Crawlway S→Mirror Room
  const steepCrawlway = world.getEntity(coalMineIds.steepCrawlway);
  if (steepCrawlway) {
    const roomTrait = steepCrawlway.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: mirrorRoomId };
    }
  }
}

/**
 * Connect Slide-3 to Cellar (one-way exit)
 */
export function connectSlideTocellar(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  cellarId: string
): void {
  const slide3 = world.getEntity(coalMineIds.slide3);
  if (slide3) {
    const roomTrait = slide3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: cellarId };
    }
  }
}

// Legacy export for backward compatibility during transition
export function connectCoalMineToDam(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  maintenanceRoomId: string
): void {
  // This connection is no longer used in the new map
  // Coal Mine now connects via Mirror Room → Cold Passage
  console.warn('connectCoalMineToDam is deprecated - Coal Mine now connects via Mirror Room');
}
