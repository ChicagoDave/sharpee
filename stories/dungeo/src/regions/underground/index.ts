/**
 * Underground Region - The Great Underground Empire (Phase 1)
 *
 * Initial underground areas accessible from the house.
 * Includes: Cellar, Troll Room, East-West Passage, Round Room
 */

import { WorldModel, RoomTrait, RoomBehavior, Direction } from '@sharpee/world-model';

// Room creators
import { createCellar } from './rooms/cellar';
import { createNarrowPassage } from './rooms/narrow-passage';
import { createTrollRoom } from './rooms/troll-room';
import { createEastWestPassage } from './rooms/east-west-passage';
import { createRoundRoom } from './rooms/round-room';

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
 * Create all objects in the Underground region
 */
export { createUndergroundObjects } from './objects';

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
 * See house-interior/objects for the rug's event handler.
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
  // See createLivingRoomObjects() in house-interior/objects
}
