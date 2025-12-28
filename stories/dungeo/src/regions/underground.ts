/**
 * Underground Region - The Great Underground Empire (Phase 1)
 *
 * Initial underground areas accessible from the house.
 * Includes: Cellar, Troll Room, East-West Passage, Round Room
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  RoomBehavior,
  EntityType,
  Direction
} from '@sharpee/world-model';

export interface UndergroundRoomIds {
  cellar: string;
  trollRoom: string;
  eastWestPassage: string;
  roundRoom: string;
  narrowPassage: string;  // Connects cellar to troll room
}

/**
 * Create all rooms in the Underground region (Phase 1)
 */
export function createUndergroundRooms(world: WorldModel): UndergroundRoomIds {
  const cellar = createCellar(world);
  const trollRoom = createTrollRoom(world);
  const eastWestPassage = createEastWestPassage(world);
  const roundRoom = createRoundRoom(world);
  const narrowPassage = createNarrowPassage(world);

  const roomIds: UndergroundRoomIds = {
    cellar: cellar.id,
    trollRoom: trollRoom.id,
    eastWestPassage: eastWestPassage.id,
    roundRoom: roundRoom.id,
    narrowPassage: narrowPassage.id
  };

  // Connect the underground rooms
  connectUndergroundRooms(world, roomIds);

  return roomIds;
}

/**
 * Cellar
 * "You are in a dark and damp cellar with a narrow passageway leading
 * north, and a crawlway to the south. On the west is the bottom of a
 * steep metal ramp which is unclimbable."
 */
function createCellar(world: WorldModel): IFEntity {
  const room = world.createEntity('Cellar', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,  // Dark room - needs lantern
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Cellar',
    aliases: ['cellar', 'basement'],
    description: 'You are in a dark and damp cellar with a narrow passageway leading north, and a crawlway to the south. On the west is the bottom of a steep metal ramp which is unclimbable.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Narrow Passage
 * "You are in a narrow passage connecting the cellar to the troll room."
 */
function createNarrowPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('Narrow Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Narrow Passage',
    aliases: ['narrow passage', 'passage', 'tunnel'],
    description: 'This is a narrow passage. The walls are damp and the air is stale.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Troll Room
 * "This is a small room with passages to the east and south and a
 * forbidding hole leading west. Bloodstains and deep scratches
 * (perhaps made by an axe) mar the walls."
 */
function createTrollRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Troll Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Troll Room',
    aliases: ['troll room', 'bloody room'],
    description: 'This is a small room with passages to the east and south and a forbidding hole leading west. Bloodstains and deep scratches (perhaps made by an axe) mar the walls.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * East-West Passage
 * "You are in a passage which continues to the east and west."
 */
function createEastWestPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('East-West Passage', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'East-West Passage',
    aliases: ['passage', 'e/w passage', 'ew passage'],
    description: 'You are in a passage which continues to the east and west.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Round Room
 * "This is a circular stone room with passages in all directions.
 * Several of them have unfortunately been blocked by cave-ins."
 */
function createRoundRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Round Room', EntityType.ROOM);

  room.add(new RoomTrait({
    exits: {},
    isDark: true,
    isOutdoors: false
  }));

  room.add(new IdentityTrait({
    name: 'Round Room',
    aliases: ['round room', 'circular room'],
    description: 'This is a circular stone room with passages in all directions. Several of them have unfortunately been blocked by cave-ins.',
    properName: true,
    article: 'the'
  }));

  return room;
}

/**
 * Connect Underground rooms to each other
 */
function connectUndergroundRooms(world: WorldModel, roomIds: UndergroundRoomIds): void {
  // Cellar connections
  const cellar = world.getEntity(roomIds.cellar);
  if (cellar) {
    const roomTrait = cellar.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowPassage },
        // Up connects to Living Room (through trapdoor) - set externally
      };
    }
  }

  // Narrow Passage connections
  const narrowPassage = world.getEntity(roomIds.narrowPassage);
  if (narrowPassage) {
    const roomTrait = narrowPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.cellar },
        [Direction.NORTH]: { destination: roomIds.trollRoom },
      };
    }
  }

  // Troll Room connections (troll blocks east initially)
  const trollRoom = world.getEntity(roomIds.trollRoom);
  if (trollRoom) {
    const roomTrait = trollRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.narrowPassage },
        [Direction.EAST]: { destination: roomIds.eastWestPassage },
        // West leads to forbidding hole - maybe later
      };
    }
    // Block the east exit - troll prevents passage until defeated
    RoomBehavior.blockExit(trollRoom, Direction.EAST, 'The troll blocks your way.');
  }

  // East-West Passage connections
  const eastWestPassage = world.getEntity(roomIds.eastWestPassage);
  if (eastWestPassage) {
    const roomTrait = eastWestPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.trollRoom },
        [Direction.EAST]: { destination: roomIds.roundRoom },
      };
    }
  }

  // Round Room connections
  const roundRoom = world.getEntity(roomIds.roundRoom);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.eastWestPassage },
        // Other directions blocked by cave-ins or lead elsewhere
      };
    }
  }
}

/**
 * Connect Underground to Living Room (through trapdoor)
 *
 * Note: The DOWN exit from Living Room is NOT added here - it is added
 * dynamically when the player moves the rug to reveal the trapdoor.
 * See house-interior-objects.ts for the rug's event handler.
 */
export function connectUndergroundToHouse(
  world: WorldModel,
  undergroundIds: UndergroundRoomIds,
  livingRoomId: string
): void {
  // Cellar up to Living Room (always available once you're in the cellar)
  const cellar = world.getEntity(undergroundIds.cellar);
  if (cellar) {
    const roomTrait = cellar.get(RoomTrait);
    if (roomTrait) {
      // The 'via' references the trapdoor - player must open it to go up
      roomTrait.exits[Direction.UP] = {
        destination: livingRoomId,
        via: 'trapdoor'  // Gate this exit on trapdoor being open
      };
    }
  }

  // Living Room DOWN exit is added by the rug's event handler when pushed
  // See createLivingRoomObjects() in house-interior-objects.ts
}
