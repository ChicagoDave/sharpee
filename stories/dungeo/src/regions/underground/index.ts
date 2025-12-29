/**
 * Underground Region - The Great Underground Empire (Phase 1)
 *
 * Initial underground areas accessible from the house.
 * Includes: Cellar, Troll Room, East-West Passage, Round Room, Gallery, Studio
 */

import { WorldModel, RoomTrait, RoomBehavior, Direction } from '@sharpee/world-model';

// Room creators
import { createCellar } from './rooms/cellar';
import { createNarrowPassage } from './rooms/narrow-passage';
import { createTrollRoom } from './rooms/troll-room';
import { createEastWestPassage } from './rooms/east-west-passage';
import { createRoundRoom } from './rooms/round-room';
import { createGallery } from './rooms/gallery';
import { createStudio } from './rooms/studio';

export interface UndergroundRoomIds {
  cellar: string;
  trollRoom: string;
  eastWestPassage: string;
  roundRoom: string;
  narrowPassage: string;  // Connects cellar to troll room
  gallery: string;        // Art gallery with painting
  studio: string;         // Artist's studio with chimney
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
  const gallery = createGallery(world);
  const studio = createStudio(world);

  const roomIds: UndergroundRoomIds = {
    cellar: cellar.id,
    trollRoom: trollRoom.id,
    eastWestPassage: eastWestPassage.id,
    roundRoom: roundRoom.id,
    narrowPassage: narrowPassage.id,
    gallery: gallery.id,
    studio: studio.id
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
        [Direction.WEST]: { destination: roomIds.gallery },
        // Up connects to Living Room (through trapdoor) - set externally
      };
    }
  }

  // Gallery connections
  const gallery = world.getEntity(roomIds.gallery);
  if (gallery) {
    const roomTrait = gallery.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.cellar },
        [Direction.NORTH]: { destination: roomIds.studio },
      };
    }
  }

  // Studio connections
  const studio = world.getEntity(roomIds.studio);
  if (studio) {
    const roomTrait = studio.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.gallery },
        // UP goes to Kitchen via chimney - connected externally
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
 * Connect Studio to Kitchen via chimney
 *
 * Note: The chimney is one-way - you can slide DOWN from Studio to Kitchen,
 * but Kitchen's UP exit remains pointing to the Attic (via stairs).
 * This matches the original Zork behavior.
 */
export function connectStudioToKitchen(
  world: WorldModel,
  undergroundIds: UndergroundRoomIds,
  kitchenId: string
): void {
  // Studio down to Kitchen via chimney (one-way)
  const studio = world.getEntity(undergroundIds.studio);
  if (studio) {
    const roomTrait = studio.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: kitchenId };
    }
  }
  // Kitchen UP remains pointing to Attic - don't override it
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
