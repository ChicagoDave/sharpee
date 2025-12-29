/**
 * Well Room Region - Underground area with a deep well
 *
 * Features a well with bucket mechanism and connects
 * to the Temple region. Contains the silver chalice treasure.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createWellRoom } from './rooms/well-room';
import { createTeaRoom } from './rooms/tea-room';
import { createPostsRoom } from './rooms/posts-room';
import { createPoolRoom } from './rooms/pool-room';
import { createTinyCave } from './rooms/tiny-cave';
import { createRiddleRoom } from './rooms/riddle-room';
import { createPearlRoom } from './rooms/pearl-room';

export interface WellRoomIds {
  wellRoom: string;
  teaRoom: string;
  postsRoom: string;
  poolRoom: string;
  tinyCave: string;
  riddleRoom: string;
  pearlRoom: string;
}

/**
 * Create all rooms in the Well Room region
 */
export function createWellRoomRooms(world: WorldModel): WellRoomIds {
  const wellRoom = createWellRoom(world);
  const teaRoom = createTeaRoom(world);
  const postsRoom = createPostsRoom(world);
  const poolRoom = createPoolRoom(world);
  const tinyCave = createTinyCave(world);
  const riddleRoom = createRiddleRoom(world);
  const pearlRoom = createPearlRoom(world);

  const roomIds: WellRoomIds = {
    wellRoom: wellRoom.id,
    teaRoom: teaRoom.id,
    postsRoom: postsRoom.id,
    poolRoom: poolRoom.id,
    tinyCave: tinyCave.id,
    riddleRoom: riddleRoom.id,
    pearlRoom: pearlRoom.id
  };

  connectWellRoomRooms(world, roomIds);
  return roomIds;
}

export { createWellRoomObjects } from './objects';

function connectWellRoomRooms(world: WorldModel, roomIds: WellRoomIds): void {
  // Well Room - central hub
  const wellRoom = world.getEntity(roomIds.wellRoom);
  if (wellRoom) {
    const roomTrait = wellRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.teaRoom },
        [Direction.SOUTH]: { destination: roomIds.postsRoom },
        [Direction.EAST]: { destination: roomIds.poolRoom },
        // West connects to Temple region - set externally
      };
    }
  }

  // Tea Room
  const teaRoom = world.getEntity(roomIds.teaRoom);
  if (teaRoom) {
    const roomTrait = teaRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.wellRoom }
      };
    }
  }

  // Posts Room
  const postsRoom = world.getEntity(roomIds.postsRoom);
  if (postsRoom) {
    const roomTrait = postsRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.wellRoom },
        [Direction.EAST]: { destination: roomIds.tinyCave }
      };
    }
  }

  // Pool Room
  const poolRoom = world.getEntity(roomIds.poolRoom);
  if (poolRoom) {
    const roomTrait = poolRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.wellRoom }
      };
    }
  }

  // Tiny Cave
  const tinyCave = world.getEntity(roomIds.tinyCave);
  if (tinyCave) {
    const roomTrait = tinyCave.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.postsRoom },
        [Direction.SOUTH]: { destination: roomIds.riddleRoom }
      };
    }
  }

  // Riddle Room
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

  // Pearl Room
  const pearlRoom = world.getEntity(roomIds.pearlRoom);
  if (pearlRoom) {
    const roomTrait = pearlRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.riddleRoom }
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
  // Well Room connects west to Torch Room
  const wellRoom = world.getEntity(wellRoomIds.wellRoom);
  if (wellRoom) {
    const roomTrait = wellRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: torchRoomId };
    }
  }

  // Torch Room connects east to Well Room
  const torchRoom = world.getEntity(torchRoomId);
  if (torchRoom) {
    const roomTrait = torchRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: wellRoomIds.wellRoom };
    }
  }
}
