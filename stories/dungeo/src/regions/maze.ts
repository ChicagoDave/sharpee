/**
 * Maze Region - The infamous maze of twisty little passages
 *
 * 23 rooms: Grating Room, Maze 1-15, Dead End 1-5, Cyclops Room, Treasure Room
 *
 * Entry points:
 * - Grating Room (from Clearing above via grating)
 * - Maze-1 (from Troll Room west, from Round Room southwest)
 * - Maze-9 (from Cyclops Room northeast)
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  SceneryTrait,
  OpenableTrait,
  LockableTrait,
  ContainerTrait
} from '@sharpee/world-model';

import { createIncense } from '../objects/thiefs-canvas-objects';

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

// Helper functions

function createRoom(world: WorldModel, name: string, description: string, aliases: string[] = []): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name,
    aliases,
    description,
    properName: true,
    article: 'the'
  }));
  return room;
}

function createMazeRoom(world: WorldModel, num: number): IFEntity {
  const room = world.createEntity('Maze', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Maze',
    aliases: ['maze', `maze ${num}`, `maze${num}`],
    description: 'You are in a maze of twisty little passages, all alike.',
    properName: false,
    article: 'the'
  }));
  return room;
}

function createDeadEndRoom(world: WorldModel, num: number): IFEntity {
  const room = world.createEntity(`Dead End ${num}`, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Dead End',
    aliases: ['dead end', `dead end ${num}`, `deadend${num}`],
    description: 'You have come to a dead end in the maze.',
    properName: true,
    article: 'the'
  }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createMazeRegion(world: WorldModel): MazeRoomIds {
  // === Create all rooms ===

  const gratingRoom = createRoom(world, 'Grating Room',
    'You are in a small room near the surface. A metal grating in the ceiling leads upward.',
    ['grating room', 'small room', 'room near surface']);

  const maze1 = createMazeRoom(world, 1);
  const maze2 = createMazeRoom(world, 2);
  const maze3 = createMazeRoom(world, 3);
  const maze4 = createMazeRoom(world, 4);
  const maze5 = createMazeRoom(world, 5);
  const maze6 = createMazeRoom(world, 6);
  const maze7 = createMazeRoom(world, 7);
  const maze8 = createMazeRoom(world, 8);
  const maze9 = createMazeRoom(world, 9);
  const maze10 = createMazeRoom(world, 10);
  const maze11 = createMazeRoom(world, 11);
  const maze12 = createMazeRoom(world, 12);
  const maze13 = createMazeRoom(world, 13);
  const maze14 = createMazeRoom(world, 14);
  const maze15 = createMazeRoom(world, 15);

  const deadEnd1 = createDeadEndRoom(world, 1);
  const deadEnd2 = createDeadEndRoom(world, 2);
  const deadEnd3 = createDeadEndRoom(world, 3);
  const deadEnd4 = createDeadEndRoom(world, 4);
  const deadEnd5 = createDeadEndRoom(world, 5);

  const cyclopsRoom = createRoom(world, 'Cyclops Room',
    'This room has an exit on the northwest, and a staircase leading up.',
    ['cyclops room']);

  const treasureRoom = createRoom(world, 'Treasure Room',
    'This is a large room, whose north wall is solid marble. A doorway leads south, and a narrow chimney leads up.',
    ['treasure room', 'thief lair', 'thiefs lair']);

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

  // === Set up internal maze connections ===
  connectMazeRooms(world, roomIds);

  return roomIds;
}

/**
 * Connect Maze rooms to each other
 * Based on map-connections.md from THE MAP OF DUNGEON
 */
function connectMazeRooms(world: WorldModel, roomIds: MazeRoomIds): void {
  // MAZE-1: W→Troll Room (external), E→Maze-2, S→Maze-3
  const maze1 = world.getEntity(roomIds.maze1);
  if (maze1) {
    setExits(maze1, {
      // W→Troll Room connected externally
      [Direction.EAST]: roomIds.maze2,
      [Direction.SOUTH]: roomIds.maze3,
    });
  }

  // MAZE-2: N→Maze-1, W→Maze-4, E→Dead End-1
  const maze2 = world.getEntity(roomIds.maze2);
  if (maze2) {
    setExits(maze2, {
      [Direction.NORTH]: roomIds.maze1,
      [Direction.WEST]: roomIds.maze4,
      [Direction.EAST]: roomIds.deadEnd1,
    });
  }

  // MAZE-3: S→Maze-1, N→Maze-2, E→Maze-4
  const maze3 = world.getEntity(roomIds.maze3);
  if (maze3) {
    setExits(maze3, {
      [Direction.SOUTH]: roomIds.maze1,
      [Direction.NORTH]: roomIds.maze2,
      [Direction.EAST]: roomIds.maze4,
    });
  }

  // MAZE-4: N→Maze-2, W→Maze-3, U→Maze-15
  const maze4 = world.getEntity(roomIds.maze4);
  if (maze4) {
    setExits(maze4, {
      [Direction.NORTH]: roomIds.maze2,
      [Direction.WEST]: roomIds.maze3,
      [Direction.UP]: roomIds.maze15,
    });
  }

  // MAZE-5: NE→Dead End-3, SE→Dead End-4
  const maze5 = world.getEntity(roomIds.maze5);
  if (maze5) {
    setExits(maze5, {
      [Direction.NORTHEAST]: roomIds.deadEnd3,
      [Direction.SOUTHEAST]: roomIds.deadEnd4,
    });
  }

  // MAZE-6: D→Maze-15, E→Maze-7, U→Maze-11
  const maze6 = world.getEntity(roomIds.maze6);
  if (maze6) {
    setExits(maze6, {
      [Direction.DOWN]: roomIds.maze15,
      [Direction.EAST]: roomIds.maze7,
      [Direction.UP]: roomIds.maze11,
    });
  }

  // MAZE-7: W→Maze-6
  const maze7 = world.getEntity(roomIds.maze7);
  if (maze7) {
    setExits(maze7, {
      [Direction.WEST]: roomIds.maze6,
    });
  }

  // MAZE-8: S→Dead End-3, W→Maze-9
  const maze8 = world.getEntity(roomIds.maze8);
  if (maze8) {
    setExits(maze8, {
      [Direction.SOUTH]: roomIds.deadEnd3,
      [Direction.WEST]: roomIds.maze9,
    });
  }

  // MAZE-9: S→Dead End-3, W→Maze-8, NE→Cyclops Room
  const maze9 = world.getEntity(roomIds.maze9);
  if (maze9) {
    setExits(maze9, {
      [Direction.SOUTH]: roomIds.deadEnd3,
      [Direction.WEST]: roomIds.maze8,
      [Direction.NORTHEAST]: roomIds.cyclopsRoom,
    });
  }

  // MAZE-10: N→Dead End-5, U→Maze-11, W→Maze-15
  const maze10 = world.getEntity(roomIds.maze10);
  if (maze10) {
    setExits(maze10, {
      [Direction.NORTH]: roomIds.deadEnd5,
      [Direction.UP]: roomIds.maze11,
      [Direction.WEST]: roomIds.maze15,
    });
  }

  // MAZE-11: N→Maze-6, E→Maze-12, W→Maze-10, S→Maze-14, D→Maze-13
  const maze11 = world.getEntity(roomIds.maze11);
  if (maze11) {
    setExits(maze11, {
      [Direction.NORTH]: roomIds.maze6,
      [Direction.EAST]: roomIds.maze12,
      [Direction.WEST]: roomIds.maze10,
      [Direction.SOUTH]: roomIds.maze14,
      [Direction.DOWN]: roomIds.maze13,
    });
  }

  // MAZE-12: NW→Maze-14, D→Maze-13, NE→Grating Room
  const maze12 = world.getEntity(roomIds.maze12);
  if (maze12) {
    setExits(maze12, {
      [Direction.NORTHWEST]: roomIds.maze14,
      [Direction.DOWN]: roomIds.maze13,
      [Direction.NORTHEAST]: roomIds.gratingRoom,
    });
  }

  // MAZE-13: E→Maze-11, U→Maze-12, W→Maze-14
  const maze13 = world.getEntity(roomIds.maze13);
  if (maze13) {
    setExits(maze13, {
      [Direction.EAST]: roomIds.maze11,
      [Direction.UP]: roomIds.maze12,
      [Direction.WEST]: roomIds.maze14,
    });
  }

  // MAZE-14: E→Maze-11, S→Maze-13, W→Maze-12, D→Maze-10
  const maze14 = world.getEntity(roomIds.maze14);
  if (maze14) {
    setExits(maze14, {
      [Direction.EAST]: roomIds.maze11,
      [Direction.SOUTH]: roomIds.maze13,
      [Direction.WEST]: roomIds.maze12,
      [Direction.DOWN]: roomIds.maze10,
    });
  }

  // MAZE-15: N→Maze-4, SW→Maze-6, E→Dead End-3
  const maze15 = world.getEntity(roomIds.maze15);
  if (maze15) {
    setExits(maze15, {
      [Direction.NORTH]: roomIds.maze4,
      [Direction.SOUTHWEST]: roomIds.maze6,
      [Direction.EAST]: roomIds.deadEnd3,
    });
  }

  // Dead End-1: S→Maze-2
  const deadEnd1 = world.getEntity(roomIds.deadEnd1);
  if (deadEnd1) {
    setExits(deadEnd1, {
      [Direction.SOUTH]: roomIds.maze2,
    });
  }

  // Dead End-2: S→Dead End-1
  const deadEnd2 = world.getEntity(roomIds.deadEnd2);
  if (deadEnd2) {
    setExits(deadEnd2, {
      [Direction.SOUTH]: roomIds.deadEnd1,
    });
  }

  // Dead End-3: W→Maze-15, NE→Dead End-2, E→Maze-5, S→Maze-9, U→Maze-8
  const deadEnd3 = world.getEntity(roomIds.deadEnd3);
  if (deadEnd3) {
    setExits(deadEnd3, {
      [Direction.WEST]: roomIds.maze15,
      [Direction.NORTHEAST]: roomIds.deadEnd2,
      [Direction.EAST]: roomIds.maze5,
      [Direction.SOUTH]: roomIds.maze9,
      [Direction.UP]: roomIds.maze8,
    });
  }

  // Dead End-4: N→Maze-5
  const deadEnd4 = world.getEntity(roomIds.deadEnd4);
  if (deadEnd4) {
    setExits(deadEnd4, {
      [Direction.NORTH]: roomIds.maze5,
    });
  }

  // Dead End-5: S→Maze-10
  const deadEnd5 = world.getEntity(roomIds.deadEnd5);
  if (deadEnd5) {
    setExits(deadEnd5, {
      [Direction.SOUTH]: roomIds.maze10,
    });
  }

  // Grating Room: SW→Maze-12, U→Clearing (external)
  const gratingRoom = world.getEntity(roomIds.gratingRoom);
  if (gratingRoom) {
    setExits(gratingRoom, {
      [Direction.SOUTHWEST]: roomIds.maze12,
      // UP→Clearing connected externally
    });
  }

  // Cyclops Room: SW→Maze-9, U→Treasure Room, N→Strange Passage (external)
  const cyclopsRoom = world.getEntity(roomIds.cyclopsRoom);
  if (cyclopsRoom) {
    setExits(cyclopsRoom, {
      [Direction.SOUTHWEST]: roomIds.maze9,
      [Direction.UP]: roomIds.treasureRoom,
      // N→Strange Passage connected externally
    });
  }

  // Treasure Room: D→Cyclops Room
  const treasureRoom = world.getEntity(roomIds.treasureRoom);
  if (treasureRoom) {
    setExits(treasureRoom, {
      [Direction.DOWN]: roomIds.cyclopsRoom,
    });
  }
}

// ============================================================================
// EXTERNAL CONNECTORS
// ============================================================================

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
 * Per map-connections.md: Troll Room S → Maze-1, Maze-1 W → Troll Room
 * The "forbidding hole leading west" is the Cellar, not the maze.
 * The "passage south" leads to the maze.
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

  // Troll Room SOUTH to Maze-1 (the "passage south")
  const trollRoom = world.getEntity(trollRoomId);
  if (trollRoom) {
    const roomTrait = trollRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: mazeIds.maze1 };
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

// ============================================================================
// OBJECTS
// ============================================================================

/**
 * Create all objects in the Maze region
 */
export function createMazeObjects(world: WorldModel, roomIds: MazeRoomIds): void {
  // Grating Room objects
  createGratingRoomObjects(world, roomIds.gratingRoom);

  // Dead End objects (skeleton, coins, key are in Dead End 1)
  createDeadEndObjects(world, roomIds.deadEnd1);

  // Treasure Room objects (Thief's lair)
  createTreasureRoomObjects(world, roomIds.treasureRoom);
}

// ============= Grating Room Objects =============

function createGratingRoomObjects(world: WorldModel, roomId: string): void {
  // Metal grating (scenery, openable, lockable)
  const grating = world.createEntity('metal grating', EntityType.SCENERY);
  grating.add(new IdentityTrait({
    name: 'metal grating',
    aliases: ['grating', 'grate', 'metal grate', 'iron grating'],
    description: 'A metal grating is set into the ceiling, leading up to the surface. It appears to be locked.',
    properName: false,
    article: 'a'
  }));
  grating.add(new SceneryTrait());
  grating.add(new OpenableTrait({ isOpen: false }));
  grating.add(new LockableTrait({
    startsLocked: true,
    isLocked: true
  }));
  world.moveEntity(grating.id, roomId);
}

// ============= Dead End Objects =============

function createDeadEndObjects(world: WorldModel, roomId: string): void {
  // Skeleton (scenery - dead adventurer)
  const skeleton = world.createEntity('skeleton', EntityType.SCENERY);
  skeleton.add(new IdentityTrait({
    name: 'skeleton',
    aliases: ['skeleton', 'bones', 'remains', 'adventurer skeleton', 'dead adventurer'],
    description: 'A skeleton lies here, the remains of some unfortunate adventurer who lost their way in this maze long ago.',
    properName: false,
    article: 'a'
  }));
  skeleton.add(new SceneryTrait());
  world.moveEntity(skeleton.id, roomId);

  // Bag of coins (treasure)
  const bag = world.createEntity('bag of coins', EntityType.CONTAINER);
  bag.add(new IdentityTrait({
    name: 'leather bag of coins',
    aliases: ['bag', 'leather bag', 'bag of coins', 'coins', 'coin bag'],
    description: 'A leather bag containing a quantity of coins of various denominations.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  bag.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
  // Mark as treasure
  (bag as any).isTreasure = true;
  (bag as any).treasureId = 'bag-of-coins';
  (bag as any).treasureValue = 10;        // Take value
  (bag as any).trophyCaseValue = 5;       // Additional case value
  world.moveEntity(bag.id, roomId);

  // Skeleton key (tool for unlocking grating)
  const key = world.createEntity('skeleton key', EntityType.ITEM);
  key.add(new IdentityTrait({
    name: 'skeleton key',
    aliases: ['key', 'skeleton key', 'rusty key', 'old key'],
    description: 'An old skeleton key, probably dropped by the unfortunate adventurer whose remains lie nearby.',
    properName: false,
    article: 'a',
    weight: 25
  }));
  // Mark the key as being able to unlock the grating
  (key as any).unlocksId = 'metal grating';
  world.moveEntity(key.id, roomId);

  // Incense - ADR-078 ghost ritual puzzle
  // The skeleton was a devotee who died with this incense
  const incense = createIncense(world);
  world.moveEntity(incense.id, roomId);
}

// ============= Treasure Room Objects =============

function createTreasureRoomObjects(world: WorldModel, roomId: string): void {
  // Chalice (treasure - 10 take + 10 case = 20 total)
  // This is the thief's lair, where he stashes his stolen treasures
  const chalice = world.createEntity('chalice', EntityType.ITEM);
  chalice.add(new IdentityTrait({
    name: 'chalice',
    aliases: ['chalice', 'golden chalice', 'cup', 'goblet', 'ornate chalice'],
    description: 'An ornate golden chalice encrusted with precious gems. It gleams magnificently even in the dim light.',
    properName: false,
    article: 'a',
    weight: 40
  }));
  // Treasure scoring
  (chalice as any).isTreasure = true;
  (chalice as any).treasureId = 'chalice';
  (chalice as any).treasureValue = 10;  // Take value
  (chalice as any).trophyCaseValue = 10;  // Additional case value
  world.moveEntity(chalice.id, roomId);
}
