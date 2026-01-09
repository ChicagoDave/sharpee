/**
 * Temple Region - Ancient temple, Egyptian tomb, and the gates of Hades
 *
 * Features the exorcism puzzle (bell, book, candle) and several treasures.
 * Accessed from the Dam region via a passage from the Reservoir.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createTemple } from './rooms/temple';
import { createAltar } from './rooms/altar';
import { createEgyptianRoom } from './rooms/egyptian-room';
import { createTorchRoom } from './rooms/torch-room';
import { createDomeRoom } from './rooms/dome-room';
import { createNarrowCorridor } from './rooms/narrow-corridor';
import { createEntryToHades } from './rooms/entry-to-hades';
import { createLandOfDead } from './rooms/land-of-dead';
import { createTinyRoom } from './rooms/tiny-room';
import { createDrearyRoom } from './rooms/dreary-room';
import { createTomb } from './rooms/tomb';
import { createCrypt } from './rooms/crypt';

export interface TempleRoomIds {
  temple: string;
  altar: string;
  egyptianRoom: string;
  torchRoom: string;
  domeRoom: string;
  narrowCorridor: string;
  entryToHades: string;
  landOfDead: string;
  tinyRoom: string;
  drearyRoom: string;
  tomb: string;
  crypt: string;
}

/**
 * Create all rooms in the Temple region
 */
export function createTempleRooms(world: WorldModel): TempleRoomIds {
  const temple = createTemple(world);
  const altar = createAltar(world);
  const egyptianRoom = createEgyptianRoom(world);
  const torchRoom = createTorchRoom(world);
  const domeRoom = createDomeRoom(world);
  const narrowCorridor = createNarrowCorridor(world);
  const entryToHades = createEntryToHades(world);
  const landOfDead = createLandOfDead(world);
  const tinyRoom = createTinyRoom(world);
  const drearyRoom = createDrearyRoom(world);
  const tomb = createTomb(world);
  const crypt = createCrypt(world);

  const roomIds: TempleRoomIds = {
    temple: temple.id,
    altar: altar.id,
    egyptianRoom: egyptianRoom.id,
    torchRoom: torchRoom.id,
    domeRoom: domeRoom.id,
    narrowCorridor: narrowCorridor.id,
    entryToHades: entryToHades.id,
    landOfDead: landOfDead.id,
    tinyRoom: tinyRoom.id,
    drearyRoom: drearyRoom.id,
    tomb: tomb.id,
    crypt: crypt.id
  };

  // Connect the temple rooms
  connectTempleRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Temple region
 */
export { createTempleObjects } from './objects';

/**
 * Connect Temple rooms to each other
 */
function connectTempleRooms(world: WorldModel, roomIds: TempleRoomIds): void {
  // Temple - main entrance room
  const temple = world.getEntity(roomIds.temple);
  if (temple) {
    const roomTrait = temple.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.egyptianRoom },
        [Direction.EAST]: { destination: roomIds.altar },
        // North connects to Dam area - set externally
      };
    }
  }

  // Altar - ceremonial area
  const altar = world.getEntity(roomIds.altar);
  if (altar) {
    const roomTrait = altar.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.temple },
        [Direction.DOWN]: { destination: roomIds.narrowCorridor }
      };
    }
  }

  // Egyptian Room - tomb area
  const egyptianRoom = world.getEntity(roomIds.egyptianRoom);
  if (egyptianRoom) {
    const roomTrait = egyptianRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.temple },
        [Direction.EAST]: { destination: roomIds.torchRoom }
      };
    }
  }

  // Torch Room - contains ivory torch
  // Per map-connections.md: W → Tiny Room, U → Dome Room, D → North/South Passage
  // UP exit is always available (climbing the rope back up)
  // DOWN → North/South Passage is connected externally
  const torchRoom = world.getEntity(roomIds.torchRoom);
  if (torchRoom) {
    const roomTrait = torchRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.tinyRoom },
        [Direction.UP]: { destination: roomIds.domeRoom }
        // DOWN → North/South Passage is set by connectTorchRoomToUnderground()
      };
    }
  }

  // Tiny Room - west of Torch Room
  // Per map-connections.md: E → Torch Room, N → Dreary Room
  const tinyRoom = world.getEntity(roomIds.tinyRoom);
  if (tinyRoom) {
    const roomTrait = tinyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.torchRoom },
        [Direction.NORTH]: { destination: roomIds.drearyRoom }
      };
    }
  }

  // Dreary Room - north of Tiny Room, contains blue crystal sphere
  // Per map-connections.md: S → Tiny Room
  const drearyRoom = world.getEntity(roomIds.drearyRoom);
  if (drearyRoom) {
    const roomTrait = drearyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.tinyRoom }
      };
    }
  }

  // Dome Room - high ceiling, rope puzzle
  // Per map-connections.md: E → Rocky Crawl (connected externally), D → Torch Room (via rope)
  const domeRoom = world.getEntity(roomIds.domeRoom);
  if (domeRoom) {
    const roomTrait = domeRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // EAST → Rocky Crawl is set by connectTempleToUnderground()
        // DOWN → Torch Room requires rope to be tied - enabled by tie action
      };
    }
    // Store torch room ID for tie action to enable DOWN exit
    (domeRoom as any).torchRoomId = roomIds.torchRoom;
  }

  // Narrow Corridor - connects altar to Hades
  const narrowCorridor = world.getEntity(roomIds.narrowCorridor);
  if (narrowCorridor) {
    const roomTrait = narrowCorridor.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.altar },
        [Direction.SOUTH]: { destination: roomIds.entryToHades }
      };
    }
  }

  // Entry to Hades - spirits block until exorcism
  const entryToHades = world.getEntity(roomIds.entryToHades);
  if (entryToHades) {
    const roomTrait = entryToHades.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowCorridor },
        [Direction.SOUTH]: { destination: roomIds.landOfDead }
        // South is blocked by spirits initially
      };
    }
  }

  // Land of the Dead - final area of Hades
  // South leads to Tomb of the Unknown Implementer
  const landOfDead = world.getEntity(roomIds.landOfDead);
  if (landOfDead) {
    const roomTrait = landOfDead.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.entryToHades },
        [Direction.SOUTH]: { destination: roomIds.tomb }
      };
    }
  }

  // Tomb of the Unknown Implementer - contains crypt door
  // North leads to Crypt (through door), South back to Land of Dead
  const tomb = world.getEntity(roomIds.tomb);
  if (tomb) {
    const roomTrait = tomb.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.crypt },
        [Direction.SOUTH]: { destination: roomIds.landOfDead }
      };
    }
  }

  // Crypt of the Implementers - endgame trigger location
  // South leads back to Tomb (through door)
  const crypt = world.getEntity(roomIds.crypt);
  if (crypt) {
    const roomTrait = crypt.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.tomb }
      };
    }
  }
}

/**
 * Connect Temple region to Underground
 * Per map-connections.md:
 * - Rocky Crawl E → Dome Room, Dome Room E → Rocky Crawl
 * - Rocky Crawl NW → Egyptian Room, Egyptian Room E → Rocky Crawl
 * - Torch Room D → North/South Crawlway (narrowPassage in code)
 */
export function connectTempleToUnderground(
  world: WorldModel,
  templeIds: TempleRoomIds,
  undergroundIds: { rockyCrawlId: string; narrowPassageId: string }
): void {
  // Dome Room E → Rocky Crawl
  const domeRoom = world.getEntity(templeIds.domeRoom);
  if (domeRoom) {
    const roomTrait = domeRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: undergroundIds.rockyCrawlId };
    }
  }

  // Egyptian Room E → Rocky Crawl
  const egyptianRoom = world.getEntity(templeIds.egyptianRoom);
  if (egyptianRoom) {
    const roomTrait = egyptianRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: undergroundIds.rockyCrawlId };
    }
  }

  // Rocky Crawl E → Dome Room, NW → Egyptian Room
  const rockyCrawl = world.getEntity(undergroundIds.rockyCrawlId);
  if (rockyCrawl) {
    const roomTrait = rockyCrawl.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: templeIds.domeRoom };
      roomTrait.exits[Direction.NORTHWEST] = { destination: templeIds.egyptianRoom };
    }
  }

  // Torch Room D → North/South Crawlway (narrowPassage in code)
  const torchRoom = world.getEntity(templeIds.torchRoom);
  if (torchRoom) {
    const roomTrait = torchRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.DOWN] = { destination: undergroundIds.narrowPassageId };
    }
  }

  // North/South Crawlway U → Torch Room (reverse connection)
  const narrowPassage = world.getEntity(undergroundIds.narrowPassageId);
  if (narrowPassage) {
    const roomTrait = narrowPassage.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.UP] = { destination: templeIds.torchRoom };
    }
  }
}

/**
 * Connect Temple to Dam region (via Reservoir area)
 */
export function connectTempleToDam(
  world: WorldModel,
  templeIds: TempleRoomIds,
  reservoirSouthId: string
): void {
  // Temple connects south from Reservoir South
  const temple = world.getEntity(templeIds.temple);
  if (temple) {
    const roomTrait = temple.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: reservoirSouthId };
    }
  }

  // Reservoir South connects to Temple
  const reservoirSouth = world.getEntity(reservoirSouthId);
  if (reservoirSouth) {
    const roomTrait = reservoirSouth.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: templeIds.temple };
    }
  }
}
