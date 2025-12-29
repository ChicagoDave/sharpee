/**
 * Underground Region - The Great Underground Empire
 *
 * Initial underground areas accessible from the house.
 * Includes: Cellar, Troll Room, East-West Passage, Round Room hub area, Gallery, Studio
 */

import { WorldModel, RoomTrait, RoomBehavior, Direction } from '@sharpee/world-model';

// Room creators - original
import { createCellar } from './rooms/cellar';
import { createNarrowPassage } from './rooms/narrow-passage';
import { createTrollRoom } from './rooms/troll-room';
import { createEastWestPassage } from './rooms/east-west-passage';
import { createRoundRoom } from './rooms/round-room';
import { createGallery } from './rooms/gallery';
import { createStudio } from './rooms/studio';

// Room creators - Round Room hub area
import { createNorthSouthPassage } from './rooms/north-south-passage';
import { createEngravingsCave } from './rooms/engravings-cave';
import { createGrailRoom } from './rooms/grail-room';
import { createWindingPassage } from './rooms/winding-passage';
import { createNarrowCrawlway } from './rooms/narrow-crawlway';
import { createMirrorRoom } from './rooms/mirror-room';
import { createCave } from './rooms/cave';
import { createAtlantisRoom } from './rooms/atlantis-room';
import { createChasm } from './rooms/chasm';
import { createRiddleRoom } from './rooms/riddle-room';
import { createDampCave } from './rooms/damp-cave';

export interface UndergroundRoomIds {
  // Original rooms
  cellar: string;
  trollRoom: string;
  eastWestPassage: string;
  roundRoom: string;
  narrowPassage: string;  // Connects cellar to troll room
  gallery: string;        // Art gallery with painting
  studio: string;         // Artist's studio with chimney

  // Round Room hub area
  northSouthPassage: string;
  engravingsCave: string;
  grailRoom: string;
  windingPassage: string;
  narrowCrawlway: string;
  mirrorRoom: string;
  cave: string;           // Mirror cave - leads to Hades or Atlantis
  atlantisRoom: string;
  chasm: string;          // North of N/S Passage
  riddleRoom: string;
  dampCave: string;       // Above Loud Room
}

/**
 * Create all rooms in the Underground region
 */
export function createUndergroundRooms(world: WorldModel): UndergroundRoomIds {
  // Original rooms
  const cellar = createCellar(world);
  const trollRoom = createTrollRoom(world);
  const eastWestPassage = createEastWestPassage(world);
  const roundRoom = createRoundRoom(world);
  const narrowPassage = createNarrowPassage(world);
  const gallery = createGallery(world);
  const studio = createStudio(world);

  // Round Room hub area
  const northSouthPassage = createNorthSouthPassage(world);
  const engravingsCave = createEngravingsCave(world);
  const grailRoom = createGrailRoom(world);
  const windingPassage = createWindingPassage(world);
  const narrowCrawlway = createNarrowCrawlway(world);
  const mirrorRoom = createMirrorRoom(world);
  const cave = createCave(world);
  const atlantisRoom = createAtlantisRoom(world);
  const chasm = createChasm(world);
  const riddleRoom = createRiddleRoom(world);
  const dampCave = createDampCave(world);

  const roomIds: UndergroundRoomIds = {
    // Original
    cellar: cellar.id,
    trollRoom: trollRoom.id,
    eastWestPassage: eastWestPassage.id,
    roundRoom: roundRoom.id,
    narrowPassage: narrowPassage.id,
    gallery: gallery.id,
    studio: studio.id,

    // Round Room hub area
    northSouthPassage: northSouthPassage.id,
    engravingsCave: engravingsCave.id,
    grailRoom: grailRoom.id,
    windingPassage: windingPassage.id,
    narrowCrawlway: narrowCrawlway.id,
    mirrorRoom: mirrorRoom.id,
    cave: cave.id,
    atlantisRoom: atlantisRoom.id,
    chasm: chasm.id,
    riddleRoom: riddleRoom.id,
    dampCave: dampCave.id
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
  // === Original connections ===

  // Cellar connections
  // Note: S → West of Chasm is set by connectBankToUnderground
  const cellar = world.getEntity(roomIds.cellar);
  if (cellar) {
    const roomTrait = cellar.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowPassage },
        // S → West of Chasm (Bank) - connected externally
        // Up connects to Living Room (through trapdoor) - set externally
      };
    }
  }

  // Gallery connections
  // Note: N → West of Chasm, W → Bank Entrance are set by connectBankToUnderground
  const gallery = world.getEntity(roomIds.gallery);
  if (gallery) {
    const roomTrait = gallery.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.studio },
        // N → West of Chasm (Bank) - connected externally
        // W → Bank Entrance - connected externally
      };
    }
  }

  // Studio connections
  const studio = world.getEntity(roomIds.studio);
  if (studio) {
    const roomTrait = studio.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.gallery },
        // DOWN goes to Kitchen via chimney - connected externally
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
        // West leads to Maze-1 - connected externally by maze region
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

  // === Round Room hub connections (per map-connections.md) ===

  // Round Room - 8 directional exits (per map-connections.md)
  // Note: NW → Deep Canyon is set by connectDamToUnderground
  // Note: SW → Maze-1 is set by connectMazeToRoundRoom
  const roundRoom = world.getEntity(roomIds.roundRoom);
  if (roundRoom) {
    const roomTrait = roundRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.eastWestPassage },
        [Direction.NORTHEAST]: { destination: roomIds.northSouthPassage },
        [Direction.EAST]: { destination: roomIds.grailRoom },
        [Direction.SOUTHEAST]: { destination: roomIds.windingPassage },
        [Direction.SOUTH]: { destination: roomIds.engravingsCave },
        [Direction.NORTH]: { destination: roomIds.engravingsCave },  // Both S and N lead to Engravings
        // NW → Deep Canyon - connected externally by connectDamToUnderground
        // SW → Maze-1 - connected externally by connectMazeToRoundRoom
      };
    }
  }

  // North-South Passage: N→Chasm, NE→Loud Room (external), SW→Round Room
  const northSouthPassage = world.getEntity(roomIds.northSouthPassage);
  if (northSouthPassage) {
    const roomTrait = northSouthPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTHWEST]: { destination: roomIds.roundRoom },  // Opposite of NE
        [Direction.NORTH]: { destination: roomIds.chasm },
        // NE leads to Loud Room - connected externally
      };
    }
  }

  // Chasm: S→N/S Passage, E→? (per play output, E goes back to N/S Passage)
  const chasm = world.getEntity(roomIds.chasm);
  if (chasm) {
    const roomTrait = chasm.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.northSouthPassage },
        [Direction.EAST]: { destination: roomIds.northSouthPassage },
      };
    }
  }

  // Engravings Cave: N→Round Room, SE/D→Riddle Room
  const engravingsCave = world.getEntity(roomIds.engravingsCave);
  if (engravingsCave) {
    const roomTrait = engravingsCave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.roundRoom },
        [Direction.SOUTHEAST]: { destination: roomIds.riddleRoom },
        [Direction.DOWN]: { destination: roomIds.riddleRoom },
      };
    }
  }

  // Riddle Room: D→Engravings Cave, E→? (stone door when solved)
  const riddleRoom = world.getEntity(roomIds.riddleRoom);
  if (riddleRoom) {
    const roomTrait = riddleRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.engravingsCave },
        // E is blocked by stone door until riddle solved
      };
    }
  }

  // Grail Room: W→Round Room, U→Temple (external), E→Narrow Crawlway
  const grailRoom = world.getEntity(roomIds.grailRoom);
  if (grailRoom) {
    const roomTrait = grailRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.roundRoom },
        [Direction.EAST]: { destination: roomIds.narrowCrawlway },
        // UP leads to Temple - connected externally
      };
    }
  }

  // Narrow Crawlway: SW→Mirror Room, N→Grail Room
  const narrowCrawlway = world.getEntity(roomIds.narrowCrawlway);
  if (narrowCrawlway) {
    const roomTrait = narrowCrawlway.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.grailRoom },
        [Direction.SOUTHWEST]: { destination: roomIds.mirrorRoom },
        [Direction.SOUTH]: { destination: roomIds.windingPassage },
      };
    }
  }

  // Mirror Room: N→Narrow Crawlway, W→Winding Passage, E→Cave
  const mirrorRoom = world.getEntity(roomIds.mirrorRoom);
  if (mirrorRoom) {
    const roomTrait = mirrorRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowCrawlway },
        [Direction.WEST]: { destination: roomIds.windingPassage },
        [Direction.EAST]: { destination: roomIds.cave },
      };
    }
  }

  // Winding Passage: E→Mirror Room, N→Narrow Crawlway
  const windingPassage = world.getEntity(roomIds.windingPassage);
  if (windingPassage) {
    const roomTrait = windingPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.mirrorRoom },
        [Direction.NORTH]: { destination: roomIds.narrowCrawlway },
      };
    }
  }

  // Cave: W→Mirror Room, D→Hades (external, dynamic based on mirror state)
  const cave = world.getEntity(roomIds.cave);
  if (cave) {
    const roomTrait = cave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.mirrorRoom },
        // DOWN leads to Hades (even mirror rubs) or Atlantis (odd) - connected externally
      };
    }
  }

  // Atlantis Room: U→Cave, SE→Reservoir North (external)
  const atlantisRoom = world.getEntity(roomIds.atlantisRoom);
  if (atlantisRoom) {
    const roomTrait = atlantisRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.cave },
        // SE leads to Reservoir North - connected externally
      };
    }
  }

  // Damp Cave: S→Loud Room (external), E→?
  const dampCave = world.getEntity(roomIds.dampCave);
  if (dampCave) {
    const roomTrait = dampCave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // S leads to Loud Room - connected externally
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

/**
 * Connect Round Room hub to Dam region (Loud Room, Damp Cave)
 */
export function connectUndergroundToDam(
  world: WorldModel,
  undergroundIds: UndergroundRoomIds,
  loudRoomId: string
): void {
  // North-South Passage NE → Loud Room
  const northSouthPassage = world.getEntity(undergroundIds.northSouthPassage);
  if (northSouthPassage) {
    const roomTrait = northSouthPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTHEAST] = { destination: loudRoomId };
    }
  }

  // Loud Room SW → North-South Passage (based on play output)
  const loudRoom = world.getEntity(loudRoomId);
  if (loudRoom) {
    const roomTrait = loudRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTHWEST] = { destination: undergroundIds.northSouthPassage };
    }
  }

  // Damp Cave S → Loud Room
  const dampCave = world.getEntity(undergroundIds.dampCave);
  if (dampCave) {
    const roomTrait = dampCave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: loudRoomId };
    }
  }

  // Loud Room UP → Damp Cave
  if (loudRoom) {
    const roomTrait = loudRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: undergroundIds.dampCave };
    }
  }
}

/**
 * Connect Grail Room to Temple
 */
export function connectGrailRoomToTemple(
  world: WorldModel,
  undergroundIds: UndergroundRoomIds,
  templeId: string
): void {
  // Grail Room UP → Temple
  const grailRoom = world.getEntity(undergroundIds.grailRoom);
  if (grailRoom) {
    const roomTrait = grailRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: templeId };
    }
  }

  // Temple DOWN → Grail Room (updating existing Temple connection)
  const temple = world.getEntity(templeId);
  if (temple) {
    const roomTrait = temple.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: undergroundIds.grailRoom };
    }
  }
}

/**
 * Connect Cave to Hades (Entry to Hades)
 * Note: This is the default connection (even mirror rubs).
 * When mirror is rubbed odd times, this should be dynamically changed to Atlantis.
 */
export function connectCaveToHades(
  world: WorldModel,
  undergroundIds: UndergroundRoomIds,
  entryToHadesId: string
): void {
  // Cave DOWN → Entry to Hades (default)
  const cave = world.getEntity(undergroundIds.cave);
  if (cave) {
    const roomTrait = cave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: entryToHadesId };
    }
  }

  // Entry to Hades UP → Cave
  const entryToHades = world.getEntity(entryToHadesId);
  if (entryToHades) {
    const roomTrait = entryToHades.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: undergroundIds.cave };
    }
  }
}
