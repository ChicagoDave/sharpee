/**
 * Forest Region - Forest paths around the white house
 *
 * Includes: Forest paths (4), Clearing, Up a Tree
 * The forest surrounds the white house and provides access to the Clearing
 * where the underground grating is located.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction
} from '@sharpee/world-model';

export interface ForestRoomIds {
  forestPath1: string;  // North of North of House
  forestPath2: string;  // East of clearing
  forestPath3: string;  // West of forest path 2
  forestPath4: string;  // South of forest path 3 (maze edge)
  clearing: string;     // Has grating
  upATree: string;      // Up the tree in forest
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

  const roomIds: ForestRoomIds = {
    forestPath1: forestPath1.id,
    forestPath2: forestPath2.id,
    forestPath3: forestPath3.id,
    forestPath4: forestPath4.id,
    clearing: clearing.id,
    upATree: upATree.id
  };

  // Connect the forest rooms
  connectForestRooms(world, roomIds);

  return roomIds;
}

/**
 * Forest Path 1 - North of the house
 * "This is a path winding through a dimly lit forest. The path heads
 * north-south here. One particularly large tree with some low branches
 * stands at the side of the path."
 */
function createForestPath1(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'path', 'forest'],
    description: 'This is a path winding through a dimly lit forest. The path heads north-south here. One particularly large tree with some low branches stands at the side of the path.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * Forest Path 2 - Another section of forest
 * "This is a dimly lit forest, with large trees all around."
 */
function createForestPath2(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest',
    aliases: ['forest', 'woods', 'trees'],
    description: 'This is a dimly lit forest, with large trees all around.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Forest Path 3 - Dense forest
 * "The forest thins out, and the path becomes clearer."
 */
function createForestPath3(world: WorldModel): IFEntity {
  const room = world.createEntity('Forest Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Forest Path',
    aliases: ['forest path', 'path'],
    description: 'The forest thins out, and the path becomes clearer.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * Forest Path 4 - Edge of forest near maze
 * "You are on a twisting path through a dense forest. The path splits here."
 */
function createForestPath4(world: WorldModel): IFEntity {
  const room = world.createEntity('Twisting Path', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Twisting Path',
    aliases: ['twisting path', 'path', 'forest path'],
    description: 'You are on a twisting path through a dense forest. The path splits here.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * Clearing
 * "You are in a clearing, with a forest surrounding you on all sides.
 * A path leads south. On the ground is a pile of leaves. There is a
 * grating firmly fixed into the ground."
 */
function createClearing(world: WorldModel): IFEntity {
  const room = world.createEntity('Clearing', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Clearing',
    aliases: ['clearing', 'forest clearing'],
    description: 'You are in a clearing, with a forest surrounding you on all sides. A path leads south. On the ground is a pile of leaves.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Up a Tree
 * "You are about 10 feet above the ground nestled among some large
 * branches. The nearest branch above you is above your reach.
 * Beside you on the branch is a small bird's nest."
 */
function createUpATree(world: WorldModel): IFEntity {
  const room = world.createEntity('Up a Tree', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Up a Tree',
    aliases: ['tree', 'in tree', 'up tree'],
    description: 'You are about 10 feet above the ground nestled among some large branches. The nearest branch above you is above your reach. Beside you on the branch is a small bird\'s nest.',
    properName: true,
    article: ''
  }));

  return room;
}

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
