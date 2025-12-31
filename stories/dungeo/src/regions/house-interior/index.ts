/**
 * House Interior Region - Rooms inside the white house
 *
 * Includes: Kitchen, Living Room, Attic
 * These form the initial indoor area before descending into the GUE.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createKitchen } from './rooms/kitchen';
import { createLivingRoom } from './rooms/living-room';
import { createAttic } from './rooms/attic';

export interface HouseInteriorRoomIds {
  kitchen: string;
  livingRoom: string;
  attic: string;
}

/**
 * Create all rooms in the House Interior region
 */
export function createHouseInteriorRooms(world: WorldModel): HouseInteriorRoomIds {
  const kitchen = createKitchen(world);
  const livingRoom = createLivingRoom(world);
  const attic = createAttic(world);

  const roomIds: HouseInteriorRoomIds = {
    kitchen: kitchen.id,
    livingRoom: livingRoom.id,
    attic: attic.id
  };

  // Connect the interior rooms
  connectHouseInteriorRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the House Interior region
 */
export { createHouseInteriorObjects } from './objects';

/**
 * Connect House Interior rooms
 */
function connectHouseInteriorRooms(world: WorldModel, roomIds: HouseInteriorRoomIds): void {
  // Kitchen connections
  const kitchen = world.getEntity(roomIds.kitchen);
  if (kitchen) {
    const roomTrait = kitchen.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.livingRoom },
        [Direction.UP]: { destination: roomIds.attic },
        // East leads to Behind House (through window) - connected externally
        // Down leads to Cellar - to be added later
      };
    }
  }

  // Living Room connections
  const livingRoom = world.getEntity(roomIds.livingRoom);
  if (livingRoom) {
    const roomTrait = livingRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.kitchen },
        // West is nailed shut (trophy case area)
        // Down through trapdoor - to be added when trapdoor implemented
      };
    }
  }

  // Attic connections
  const attic = world.getEntity(roomIds.attic);
  if (attic) {
    const roomTrait = attic.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.kitchen },
      };
    }
  }
}

/**
 * Connect House Interior to White House exterior
 * Call this after both regions are created
 */
export function connectHouseInteriorToExterior(
  world: WorldModel,
  interiorIds: HouseInteriorRoomIds,
  behindHouseId: string
): void {
  // Kitchen to Behind House (through window)
  const kitchen = world.getEntity(interiorIds.kitchen);
  if (kitchen) {
    const roomTrait = kitchen.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: behindHouseId };
    }
  }

  // Behind House to Kitchen (through window)
  const behindHouse = world.getEntity(behindHouseId);
  if (behindHouse) {
    const roomTrait = behindHouse.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: interiorIds.kitchen };
    }
  }
}
