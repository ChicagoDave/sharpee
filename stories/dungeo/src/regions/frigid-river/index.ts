/**
 * Frigid River Region - The river and Aragain Falls
 *
 * Features the Frigid River flowing from the dam to Aragain Falls,
 * the rainbow puzzle, and the underwater city of Atlantis.
 * Accessed from the Dam region via Dam Base.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createFrigidRiver1 } from './rooms/frigid-river-1';
import { createFrigidRiver2 } from './rooms/frigid-river-2';
import { createFrigidRiver3 } from './rooms/frigid-river-3';
import { createShore } from './rooms/shore';
import { createSandyBeach } from './rooms/sandy-beach';
import { createAragainFalls } from './rooms/aragain-falls';
import { createOnTheRainbow } from './rooms/on-the-rainbow';
import { createEndOfRainbow } from './rooms/end-of-rainbow';
import { createWhiteCliffsBeach } from './rooms/white-cliffs-beach';
import { createWhiteCliffs } from './rooms/white-cliffs';
import { createRockyShore } from './rooms/rocky-shore';
import { createAtlantis } from './rooms/atlantis';
import { createCaveBehindFalls } from './rooms/cave-behind-falls';

export interface FrigidRiverRoomIds {
  frigidRiver1: string;
  frigidRiver2: string;
  frigidRiver3: string;
  shore: string;
  sandyBeach: string;
  aragainFalls: string;
  onTheRainbow: string;
  endOfRainbow: string;
  whiteCliffsBeach: string;
  whiteCliffs: string;
  rockyShore: string;
  atlantis: string;
  caveBehindFalls: string;
}

/**
 * Create all rooms in the Frigid River region
 */
export function createFrigidRiverRooms(world: WorldModel): FrigidRiverRoomIds {
  const frigidRiver1 = createFrigidRiver1(world);
  const frigidRiver2 = createFrigidRiver2(world);
  const frigidRiver3 = createFrigidRiver3(world);
  const shore = createShore(world);
  const sandyBeach = createSandyBeach(world);
  const aragainFalls = createAragainFalls(world);
  const onTheRainbow = createOnTheRainbow(world);
  const endOfRainbow = createEndOfRainbow(world);
  const whiteCliffsBeach = createWhiteCliffsBeach(world);
  const whiteCliffs = createWhiteCliffs(world);
  const rockyShore = createRockyShore(world);
  const atlantis = createAtlantis(world);
  const caveBehindFalls = createCaveBehindFalls(world);

  const roomIds: FrigidRiverRoomIds = {
    frigidRiver1: frigidRiver1.id,
    frigidRiver2: frigidRiver2.id,
    frigidRiver3: frigidRiver3.id,
    shore: shore.id,
    sandyBeach: sandyBeach.id,
    aragainFalls: aragainFalls.id,
    onTheRainbow: onTheRainbow.id,
    endOfRainbow: endOfRainbow.id,
    whiteCliffsBeach: whiteCliffsBeach.id,
    whiteCliffs: whiteCliffs.id,
    rockyShore: rockyShore.id,
    atlantis: atlantis.id,
    caveBehindFalls: caveBehindFalls.id
  };

  connectFrigidRiverRooms(world, roomIds);
  return roomIds;
}

export { createFrigidRiverObjects } from './objects';

function connectFrigidRiverRooms(world: WorldModel, roomIds: FrigidRiverRoomIds): void {
  // Frigid River 1 - connects from Dam Base (set externally)
  const frigidRiver1 = world.getEntity(roomIds.frigidRiver1);
  if (frigidRiver1) {
    const roomTrait = frigidRiver1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.frigidRiver2 },
        [Direction.WEST]: { destination: roomIds.shore },
        // North connects to Dam Base - set externally
      };
    }
  }

  // Frigid River 2
  const frigidRiver2 = world.getEntity(roomIds.frigidRiver2);
  if (frigidRiver2) {
    const roomTrait = frigidRiver2.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.frigidRiver1 },
        [Direction.SOUTH]: { destination: roomIds.frigidRiver3 },
        [Direction.WEST]: { destination: roomIds.sandyBeach }
      };
    }
  }

  // Frigid River 3 - near the falls
  const frigidRiver3 = world.getEntity(roomIds.frigidRiver3);
  if (frigidRiver3) {
    const roomTrait = frigidRiver3.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.frigidRiver2 },
        [Direction.SOUTH]: { destination: roomIds.aragainFalls },
        [Direction.EAST]: { destination: roomIds.whiteCliffsBeach }
      };
    }
  }

  // Shore
  const shore = world.getEntity(roomIds.shore);
  if (shore) {
    const roomTrait = shore.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.frigidRiver1 },
        [Direction.SOUTH]: { destination: roomIds.sandyBeach }
      };
    }
  }

  // Sandy Beach
  const sandyBeach = world.getEntity(roomIds.sandyBeach);
  if (sandyBeach) {
    const roomTrait = sandyBeach.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.shore },
        [Direction.EAST]: { destination: roomIds.frigidRiver2 }
      };
    }
  }

  // Aragain Falls - rainbow exits added dynamically when rainbow is solid
  const aragainFalls = world.getEntity(roomIds.aragainFalls);
  if (aragainFalls) {
    const roomTrait = aragainFalls.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.frigidRiver3 },
        // West to rainbow - added dynamically by wave action when rainbow is solid
        // Going south over the falls is death - not connected
      };
      roomTrait.blockedExits = {
        [Direction.WEST]: 'The rainbow is beautiful, but it looks far too insubstantial to walk on.'
      };
    }
  }

  // On the Rainbow - exits set, but room only reachable when rainbow is solid
  const onTheRainbow = world.getEntity(roomIds.onTheRainbow);
  if (onTheRainbow) {
    const roomTrait = onTheRainbow.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.aragainFalls },
        [Direction.WEST]: { destination: roomIds.endOfRainbow }
      };
    }
  }

  // End of Rainbow - exits set, but room only reachable when rainbow is solid
  const endOfRainbow = world.getEntity(roomIds.endOfRainbow);
  if (endOfRainbow) {
    const roomTrait = endOfRainbow.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.onTheRainbow }
      };
    }
  }

  // White Cliffs Beach
  const whiteCliffsBeach = world.getEntity(roomIds.whiteCliffsBeach);
  if (whiteCliffsBeach) {
    const roomTrait = whiteCliffsBeach.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.frigidRiver3 },
        [Direction.UP]: { destination: roomIds.whiteCliffs }
      };
    }
  }

  // White Cliffs
  const whiteCliffs = world.getEntity(roomIds.whiteCliffs);
  if (whiteCliffs) {
    const roomTrait = whiteCliffs.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.whiteCliffsBeach }
      };
    }
  }

  // Rocky Shore - below the falls
  const rockyShore = world.getEntity(roomIds.rockyShore);
  if (rockyShore) {
    const roomTrait = rockyShore.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.caveBehindFalls },
        [Direction.DOWN]: { destination: roomIds.atlantis }
      };
    }
  }

  // Cave Behind Falls
  const caveBehindFalls = world.getEntity(roomIds.caveBehindFalls);
  if (caveBehindFalls) {
    const roomTrait = caveBehindFalls.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.rockyShore }
      };
    }
  }

  // Atlantis
  const atlantis = world.getEntity(roomIds.atlantis);
  if (atlantis) {
    const roomTrait = atlantis.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.rockyShore }
      };
    }
  }
}

/**
 * Connect Frigid River to Dam region (via Dam Base)
 */
export function connectFrigidRiverToDam(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  damBaseId: string
): void {
  // Frigid River 1 connects north to Dam Base
  const frigidRiver1 = world.getEntity(frigidRiverIds.frigidRiver1);
  if (frigidRiver1) {
    const roomTrait = frigidRiver1.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: damBaseId };
    }
  }

  // Dam Base connects south to Frigid River
  const damBase = world.getEntity(damBaseId);
  if (damBase) {
    const roomTrait = damBase.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: frigidRiverIds.frigidRiver1 };
    }
  }
}

/**
 * Connect End of Rainbow to Canyon Bottom (Forest region)
 * Per map: End of Rainbow SE → Canyon Bottom, Canyon Bottom N → End of Rainbow
 */
export function connectRainbowToCanyon(
  world: WorldModel,
  frigidRiverIds: FrigidRiverRoomIds,
  canyonBottomId: string
): void {
  // End of Rainbow SE → Canyon Bottom
  const endOfRainbow = world.getEntity(frigidRiverIds.endOfRainbow);
  if (endOfRainbow) {
    const roomTrait = endOfRainbow.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTHEAST] = { destination: canyonBottomId };
    }
  }

  // Canyon Bottom N → End of Rainbow
  const canyonBottom = world.getEntity(canyonBottomId);
  if (canyonBottom) {
    const roomTrait = canyonBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: frigidRiverIds.endOfRainbow };
    }
  }
}
