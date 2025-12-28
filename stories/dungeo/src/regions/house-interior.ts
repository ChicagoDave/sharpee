/**
 * House Interior Region - Rooms inside the white house
 *
 * Includes: Kitchen, Living Room, Attic
 * These form the initial indoor area before descending into the GUE.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction
} from '@sharpee/world-model';

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
 * Kitchen
 * "You are in the kitchen of the white house. A table seems to have been
 * used recently for the preparation of food. A passage leads to the west,
 * and a dark staircase can be seen leading upward. To the east is a small
 * window which is open. On the table is an elongated brown sack, smelling
 * of hot peppers. A clear glass bottle is sitting on the table. The glass
 * bottle contains: A quantity of water"
 */
function createKitchen(world: WorldModel): IFEntity {
  const room = world.createEntity('Kitchen', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Kitchen',
    aliases: ['kitchen', 'white house kitchen'],
    description: 'You are in the kitchen of the white house. A table seems to have been used recently for the preparation of food. A passage leads to the west, and a dark staircase can be seen leading upward. To the east is a small window which is open.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Living Room
 * "You are in the living room. There is a doorway to the east, a wooden
 * door with strange gothic lettering to the west, which appears to be
 * nailed shut, a trophy case, and a large oriental rug in the center of
 * the room. Above the trophy case hangs an elvish sword of great antiquity.
 * A battery-powered brass lantern is on the trophy case."
 */
function createLivingRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Living Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Living Room',
    aliases: ['living room', 'front room', 'lounge'],
    description: 'You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Attic
 * "This is the attic. The only exit is a stairway leading down. A large
 * coil of rope is lying in the corner. On a table is a nasty-looking knife."
 */
function createAttic(world: WorldModel): IFEntity {
  const room = world.createEntity('Attic', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: false,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Attic',
    aliases: ['attic', 'loft'],
    description: 'This is the attic. The only exit is a stairway leading down. A large coil of rope is lying in the corner. On a table is a nasty-looking knife.',
    properName: true,
    article: 'the'
  }));

  return room;
}

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
