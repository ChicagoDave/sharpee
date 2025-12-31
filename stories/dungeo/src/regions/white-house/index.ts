/**
 * White House Region - Surface area rooms around the white house
 *
 * This is the starting area of Dungeo, based on the classic Zork opening.
 * Includes: West of House, North of House, South of House, Behind House
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createWestOfHouse } from './rooms/west-of-house';
import { createNorthOfHouse } from './rooms/north-of-house';
import { createSouthOfHouse } from './rooms/south-of-house';
import { createBehindHouse } from './rooms/behind-house';

export interface WhiteHouseRoomIds {
  westOfHouse: string;
  northOfHouse: string;
  southOfHouse: string;
  behindHouse: string;
}

/**
 * Create all rooms in the White House region
 */
export function createWhiteHouseRooms(world: WorldModel): WhiteHouseRoomIds {
  const westOfHouse = createWestOfHouse(world);
  const northOfHouse = createNorthOfHouse(world);
  const southOfHouse = createSouthOfHouse(world);
  const behindHouse = createBehindHouse(world);

  const roomIds: WhiteHouseRoomIds = {
    westOfHouse: westOfHouse.id,
    northOfHouse: northOfHouse.id,
    southOfHouse: southOfHouse.id,
    behindHouse: behindHouse.id
  };

  // Connect rooms within this region
  connectWhiteHouseRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the White House region
 */
export { createWhiteHouseObjects } from './objects';

/**
 * Connect White House region rooms to each other
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
        // West leads to forest (connected externally)
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
        // North leads to forest path (connected externally)
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
        // South leads to forest (connected externally)
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
        // West through the window into Kitchen (connected externally)
        // East leads to clearing (connected externally)
      };
    }
  }
}
