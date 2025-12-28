/**
 * White House Region - Surface area rooms around the white house
 *
 * This is the starting area of Dungeo, based on the classic Zork opening.
 * Includes: West of House, North of House, South of House, Behind House
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction
} from '@sharpee/world-model';

export interface WhiteHouseRoomIds {
  westOfHouse: string;
  northOfHouse: string;
  southOfHouse: string;
  behindHouse: string;
  // Future rooms will be added here
  forestPath?: string;
  clearing?: string;
  forestNorth?: string;
  forestSouth?: string;
  forestWest?: string;
}

/**
 * Create all rooms in the White House region
 */
export function createWhiteHouseRooms(world: WorldModel): WhiteHouseRoomIds {
  // Create all rooms first without exits
  const westOfHouse = createWestOfHouse(world);
  const northOfHouse = createNorthOfHouse(world);
  const southOfHouse = createSouthOfHouse(world);
  const behindHouse = createBehindHouse(world);

  // Store IDs
  const roomIds: WhiteHouseRoomIds = {
    westOfHouse: westOfHouse.id,
    northOfHouse: northOfHouse.id,
    southOfHouse: southOfHouse.id,
    behindHouse: behindHouse.id
  };

  // Now connect the rooms with proper exits
  connectWhiteHouseRooms(world, roomIds);

  return roomIds;
}

/**
 * West of House - The starting location
 * "You are standing in an open field west of a white house, with a boarded front door.
 * There is a small mailbox here."
 */
function createWestOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('West of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {}, // Will be set later
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'West of House',
    aliases: ['west of house', 'field', 'open field'],
    description: 'You are standing in an open field west of a white house, with a boarded front door.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * North of House
 * "You are facing the north side of a white house. There is no door here, and all the
 * windows are boarded up. To the north a narrow path winds through the trees."
 */
function createNorthOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('North of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'North of House',
    aliases: ['north of house', 'north side'],
    description: 'You are facing the north side of a white house. There is no door here, and all the windows are boarded up. To the north a narrow path winds through the trees.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * South of House
 * "You are facing the south side of a white house. There is no door here, and all the
 * windows are boarded."
 */
function createSouthOfHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('South of House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'South of House',
    aliases: ['south of house', 'south side'],
    description: 'You are facing the south side of a white house. There is no door here, and all the windows are boarded.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * Behind House
 * "You are behind the white house. A path leads into the forest to the east. In one
 * corner of the house there is a small window which is slightly ajar."
 */
function createBehindHouse(world: WorldModel): IFEntity {
  const room = world.createEntity('Behind House', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: true
  }));

  room.add(new IdentityTrait({
    name: 'Behind House',
    aliases: ['behind house', 'back of house', 'east of house'],
    description: 'You are behind the white house. A path leads into the forest to the east. In one corner of the house there is a small window which is slightly ajar.',
    properName: true,
    article: ''
  }));

  return room;
}

/**
 * Connect all White House region rooms
 */
function connectWhiteHouseRooms(world: WorldModel, roomIds: WhiteHouseRoomIds): void {
  // West of House connections
  const westOfHouse = world.getEntity(roomIds.westOfHouse);
  if (westOfHouse) {
    const roomTrait = westOfHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.northOfHouse },
        [Direction.SOUTH]: { destination: roomIds.southOfHouse },
        // West leads to forest (to be added later)
        // [Direction.WEST]: { destination: roomIds.forestPath },
        // East is blocked by the boarded front door
      };
    }
  }

  // North of House connections
  const northOfHouse = world.getEntity(roomIds.northOfHouse);
  if (northOfHouse) {
    const roomTrait = northOfHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.westOfHouse },
        [Direction.EAST]: { destination: roomIds.behindHouse },
        // North leads to forest path (to be added later)
        // [Direction.NORTH]: { destination: roomIds.forestPath },
      };
    }
  }

  // South of House connections
  const southOfHouse = world.getEntity(roomIds.southOfHouse);
  if (southOfHouse) {
    const roomTrait = southOfHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.westOfHouse },
        [Direction.EAST]: { destination: roomIds.behindHouse },
        // South leads to forest (to be added later)
        // [Direction.SOUTH]: { destination: roomIds.forestSouth },
      };
    }
  }

  // Behind House connections
  const behindHouse = world.getEntity(roomIds.behindHouse);
  if (behindHouse) {
    const roomTrait = behindHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.northOfHouse },
        [Direction.SOUTH]: { destination: roomIds.southOfHouse },
        // West would be through the window into Kitchen (to be added later)
        // [Direction.WEST]: { destination: roomIds.kitchen, requiresOpen: 'window' },
        // East leads to clearing (to be added later)
        // [Direction.EAST]: { destination: roomIds.clearing },
      };
    }
  }
}
