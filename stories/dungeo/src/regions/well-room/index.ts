/**
 * Well Room Region - Underground area with bucket/well puzzle
 *
 * Features a well with bucket mechanism connecting Well Bottom to Top of Well.
 * Contains the silver chalice treasure and the Robot NPC.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createTopOfWell } from './rooms/top-of-well';
import { createWellBottom } from './rooms/well-bottom';
import { createTeaRoom } from './rooms/tea-room';
import { createPostsRoom } from './rooms/posts-room';
import { createPoolRoom } from './rooms/pool-room';
import { createTinyCave } from './rooms/tiny-cave';
import { createRiddleRoom } from './rooms/riddle-room';
import { createPearlRoom } from './rooms/pearl-room';
import { createLowRoom } from './rooms/low-room';
import { createMachineRoomWell } from './rooms/machine-room-well';
import { createDingyCloset } from './rooms/dingy-closet';

export interface WellRoomIds {
  topOfWell: string;
  wellBottom: string;
  teaRoom: string;
  postsRoom: string;
  poolRoom: string;
  tinyCave: string;
  riddleRoom: string;
  pearlRoom: string;
  lowRoom: string;
  machineRoomWell: string;
  dingyCloset: string;
  /** @deprecated Use topOfWell instead */
  wellRoom: string;
}

/**
 * Create all rooms in the Well Room region
 */
export function createWellRoomRooms(world: WorldModel): WellRoomIds {
  const topOfWell = createTopOfWell(world);
  const wellBottom = createWellBottom(world);
  const teaRoom = createTeaRoom(world);
  const postsRoom = createPostsRoom(world);
  const poolRoom = createPoolRoom(world);
  const tinyCave = createTinyCave(world);
  const riddleRoom = createRiddleRoom(world);
  const pearlRoom = createPearlRoom(world);
  const lowRoom = createLowRoom(world);
  const machineRoomWell = createMachineRoomWell(world);
  const dingyCloset = createDingyCloset(world);

  const roomIds: WellRoomIds = {
    topOfWell: topOfWell.id,
    wellBottom: wellBottom.id,
    teaRoom: teaRoom.id,
    postsRoom: postsRoom.id,
    poolRoom: poolRoom.id,
    tinyCave: tinyCave.id,
    riddleRoom: riddleRoom.id,
    pearlRoom: pearlRoom.id,
    lowRoom: lowRoom.id,
    machineRoomWell: machineRoomWell.id,
    dingyCloset: dingyCloset.id,
    // Backwards compatibility
    wellRoom: topOfWell.id
  };

  connectWellRoomRooms(world, roomIds);
  return roomIds;
}

export { createWellRoomObjects } from './objects';

function connectWellRoomRooms(world: WorldModel, roomIds: WellRoomIds): void {
  // Top of Well - east to Tea Room
  // Note: DOWN to Well Bottom is handled by bucket mechanics, not a normal exit
  const topOfWell = world.getEntity(roomIds.topOfWell);
  if (topOfWell) {
    const roomTrait = topOfWell.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.teaRoom }
      };
    }
  }

  // Well Bottom - west to Pearl Room
  // Note: UP to Top of Well is handled by bucket mechanics, not a normal exit
  const wellBottom = world.getEntity(roomIds.wellBottom);
  if (wellBottom) {
    const roomTrait = wellBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.pearlRoom }
      };
    }
  }

  // Tea Room - connects to Top of Well, Low Room, Pool Room
  const teaRoom = world.getEntity(roomIds.teaRoom);
  if (teaRoom) {
    const roomTrait = teaRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.topOfWell },
        [Direction.NORTHWEST]: { destination: roomIds.lowRoom },
        [Direction.EAST]: { destination: roomIds.poolRoom }
      };
    }
  }

  // Pool Room - west to Tea Room
  const poolRoom = world.getEntity(roomIds.poolRoom);
  if (poolRoom) {
    const roomTrait = poolRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.teaRoom }
      };
    }
  }

  // Low Room - southeast to Tea Room, east to Machine Room
  const lowRoom = world.getEntity(roomIds.lowRoom);
  if (lowRoom) {
    const roomTrait = lowRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTHEAST]: { destination: roomIds.teaRoom },
        [Direction.EAST]: { destination: roomIds.machineRoomWell }
      };
    }
  }

  // Machine Room (well area) - west to Low Room, south to Dingy Closet
  const machineRoomWell = world.getEntity(roomIds.machineRoomWell);
  if (machineRoomWell) {
    const roomTrait = machineRoomWell.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.lowRoom },
        [Direction.SOUTH]: { destination: roomIds.dingyCloset }
      };
    }
  }

  // Dingy Closet - north to Machine Room
  const dingyCloset = world.getEntity(roomIds.dingyCloset);
  if (dingyCloset) {
    const roomTrait = dingyCloset.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.machineRoomWell }
      };
    }
  }

  // Posts Room - This room may not be canonical; keeping for now
  // Connects south to Tiny Cave
  const postsRoom = world.getEntity(roomIds.postsRoom);
  if (postsRoom) {
    const roomTrait = postsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.tinyCave }
      };
    }
  }

  // Tiny Cave - north to Posts Room, south to Riddle Room
  const tinyCave = world.getEntity(roomIds.tinyCave);
  if (tinyCave) {
    const roomTrait = tinyCave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.postsRoom },
        [Direction.SOUTH]: { destination: roomIds.riddleRoom }
      };
    }
  }

  // Riddle Room - north to Tiny Cave, east to Pearl Room
  const riddleRoom = world.getEntity(roomIds.riddleRoom);
  if (riddleRoom) {
    const roomTrait = riddleRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.tinyCave },
        [Direction.EAST]: { destination: roomIds.pearlRoom }
      };
    }
  }

  // Pearl Room - west to Riddle Room, east to Well Bottom
  const pearlRoom = world.getEntity(roomIds.pearlRoom);
  if (pearlRoom) {
    const roomTrait = pearlRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.riddleRoom },
        [Direction.EAST]: { destination: roomIds.wellBottom }
      };
    }
  }
}

/**
 * Connect Well Room region to Temple (via Torch Room)
 */
export function connectWellRoomToTemple(
  world: WorldModel,
  wellRoomIds: WellRoomIds,
  torchRoomId: string
): void {
  // Posts Room connects west to Torch Room (keeping existing connection pattern)
  const postsRoom = world.getEntity(wellRoomIds.postsRoom);
  if (postsRoom) {
    const roomTrait = postsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: torchRoomId };
    }
  }

  // Torch Room connects east to Posts Room
  const torchRoom = world.getEntity(torchRoomId);
  if (torchRoom) {
    const roomTrait = torchRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: wellRoomIds.postsRoom };
    }
  }
}
