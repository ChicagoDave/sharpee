/**
 * Coal Mine Region - Deep underground mining area
 *
 * Accessed from the Dam region. Features the basket elevator,
 * coal-powered machine, and vampire bat.
 *
 * Rooms: Shaft Room, Drafty Room, Machine Room, Coal Mine,
 *        Timber Room, Ladder Top, Ladder Bottom, Bat Room, Gas Room
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createShaftRoom } from './rooms/shaft-room';
import { createDraftyRoom } from './rooms/drafty-room';
import { createMachineRoom } from './rooms/machine-room';
import { createCoalMine } from './rooms/coal-mine';
import { createTimberRoom } from './rooms/timber-room';
import { createLadderTop } from './rooms/ladder-top';
import { createLadderBottom } from './rooms/ladder-bottom';
import { createBatRoom } from './rooms/bat-room';
import { createGasRoom } from './rooms/gas-room';

export interface CoalMineRoomIds {
  shaftRoom: string;
  draftyRoom: string;
  machineRoom: string;
  coalMine: string;
  timberRoom: string;
  ladderTop: string;
  ladderBottom: string;
  batRoom: string;
  gasRoom: string;
}

/**
 * Create all rooms in the Coal Mine region
 */
export function createCoalMineRooms(world: WorldModel): CoalMineRoomIds {
  const shaftRoom = createShaftRoom(world);
  const draftyRoom = createDraftyRoom(world);
  const machineRoom = createMachineRoom(world);
  const coalMine = createCoalMine(world);
  const timberRoom = createTimberRoom(world);
  const ladderTop = createLadderTop(world);
  const ladderBottom = createLadderBottom(world);
  const batRoom = createBatRoom(world);
  const gasRoom = createGasRoom(world);

  const roomIds: CoalMineRoomIds = {
    shaftRoom: shaftRoom.id,
    draftyRoom: draftyRoom.id,
    machineRoom: machineRoom.id,
    coalMine: coalMine.id,
    timberRoom: timberRoom.id,
    ladderTop: ladderTop.id,
    ladderBottom: ladderBottom.id,
    batRoom: batRoom.id,
    gasRoom: gasRoom.id
  };

  // Connect the coal mine rooms
  connectCoalMineRooms(world, roomIds);

  return roomIds;
}

/**
 * Create all objects in the Coal Mine region
 */
export { createCoalMineObjects } from './objects';

/**
 * Connect Coal Mine rooms to each other
 */
function connectCoalMineRooms(world: WorldModel, roomIds: CoalMineRoomIds): void {
  // Shaft Room - top of the basket elevator
  const shaftRoom = world.getEntity(roomIds.shaftRoom);
  if (shaftRoom) {
    const roomTrait = shaftRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // DOWN via basket to Drafty Room - handled by basket mechanics later
        // West connects to Dam area - set externally
      };
    }
  }

  // Drafty Room - bottom of basket, connects to mine
  const draftyRoom = world.getEntity(roomIds.draftyRoom);
  if (draftyRoom) {
    const roomTrait = draftyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // UP via basket to Shaft Room - handled by basket mechanics
        [Direction.SOUTH]: { destination: roomIds.timberRoom },
        [Direction.EAST]: { destination: roomIds.machineRoom }
      };
    }
  }

  // Machine Room - has the coal-powered machine
  const machineRoom = world.getEntity(roomIds.machineRoom);
  if (machineRoom) {
    const roomTrait = machineRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.draftyRoom }
      };
    }
  }

  // Timber Room - mining supports
  const timberRoom = world.getEntity(roomIds.timberRoom);
  if (timberRoom) {
    const roomTrait = timberRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.draftyRoom },
        [Direction.WEST]: { destination: roomIds.coalMine },
        [Direction.SOUTH]: { destination: roomIds.ladderTop }
      };
    }
  }

  // Coal Mine - where you find coal
  const coalMine = world.getEntity(roomIds.coalMine);
  if (coalMine) {
    const roomTrait = coalMine.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.timberRoom }
      };
    }
  }

  // Ladder Top
  const ladderTop = world.getEntity(roomIds.ladderTop);
  if (ladderTop) {
    const roomTrait = ladderTop.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.timberRoom },
        [Direction.DOWN]: { destination: roomIds.ladderBottom }
      };
    }
  }

  // Ladder Bottom
  const ladderBottom = world.getEntity(roomIds.ladderBottom);
  if (ladderBottom) {
    const roomTrait = ladderBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.ladderTop },
        [Direction.SOUTH]: { destination: roomIds.gasRoom }
      };
    }
  }

  // Gas Room - danger area
  const gasRoom = world.getEntity(roomIds.gasRoom);
  if (gasRoom) {
    const roomTrait = gasRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.ladderBottom },
        [Direction.EAST]: { destination: roomIds.batRoom }
      };
    }
  }

  // Bat Room - vampire bat area
  const batRoom = world.getEntity(roomIds.batRoom);
  if (batRoom) {
    const roomTrait = batRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.gasRoom }
      };
    }
  }
}

/**
 * Connect Coal Mine to Dam region
 */
export function connectCoalMineToDam(
  world: WorldModel,
  coalMineIds: CoalMineRoomIds,
  maintenanceRoomId: string
): void {
  // Shaft Room connects to Maintenance Room in Dam
  const shaftRoom = world.getEntity(coalMineIds.shaftRoom);
  if (shaftRoom) {
    const roomTrait = shaftRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: maintenanceRoomId };
    }
  }

  // Maintenance Room connects to Shaft Room
  const maintenanceRoom = world.getEntity(maintenanceRoomId);
  if (maintenanceRoom) {
    const roomTrait = maintenanceRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: coalMineIds.shaftRoom };
    }
  }
}
