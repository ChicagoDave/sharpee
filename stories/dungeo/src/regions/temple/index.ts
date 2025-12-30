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
    drearyRoom: drearyRoom.id
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
  // Per map-connections.md: W → Tiny Room, D → North/South Passage (external)
  // Note: Current S → Dome Room is kept for now; map shows D → Torch Room from Dome
  const torchRoom = world.getEntity(roomIds.torchRoom);
  if (torchRoom) {
    const roomTrait = torchRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.tinyRoom },
        [Direction.SOUTH]: { destination: roomIds.domeRoom }
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
  const domeRoom = world.getEntity(roomIds.domeRoom);
  if (domeRoom) {
    const roomTrait = domeRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.torchRoom }
        // DOWN requires rope to be tied
      };
    }
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
  const landOfDead = world.getEntity(roomIds.landOfDead);
  if (landOfDead) {
    const roomTrait = landOfDead.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.entryToHades }
      };
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
