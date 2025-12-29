/**
 * Volcano Region - Volcanic caverns with valuable gems
 *
 * Accessed from the Coal Mine's Bat Room. Features lava,
 * narrow ledges, and two valuable treasures.
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createVolcanoBottom } from './rooms/volcano-bottom';
import { createNarrowLedge } from './rooms/narrow-ledge';
import { createVolcanoCore } from './rooms/volcano-core';
import { createDustyRoom } from './rooms/dusty-room';
import { createVolcanoView } from './rooms/volcano-view';

export interface VolcanoRoomIds {
  volcanoBottom: string;
  narrowLedge: string;
  volcanoCore: string;
  dustyRoom: string;
  volcanoView: string;
}

/**
 * Create all rooms in the Volcano region
 */
export function createVolcanoRooms(world: WorldModel): VolcanoRoomIds {
  const volcanoBottom = createVolcanoBottom(world);
  const narrowLedge = createNarrowLedge(world);
  const volcanoCore = createVolcanoCore(world);
  const dustyRoom = createDustyRoom(world);
  const volcanoView = createVolcanoView(world);

  const roomIds: VolcanoRoomIds = {
    volcanoBottom: volcanoBottom.id,
    narrowLedge: narrowLedge.id,
    volcanoCore: volcanoCore.id,
    dustyRoom: dustyRoom.id,
    volcanoView: volcanoView.id
  };

  connectVolcanoRooms(world, roomIds);
  return roomIds;
}

export { createVolcanoObjects } from './objects';

function connectVolcanoRooms(world: WorldModel, roomIds: VolcanoRoomIds): void {
  // Volcano Bottom - entry point
  const volcanoBottom = world.getEntity(roomIds.volcanoBottom);
  if (volcanoBottom) {
    const roomTrait = volcanoBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.narrowLedge },
        // North connects to Bat Room - set externally
      };
    }
  }

  // Narrow Ledge - dangerous path
  const narrowLedge = world.getEntity(roomIds.narrowLedge);
  if (narrowLedge) {
    const roomTrait = narrowLedge.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.volcanoBottom },
        [Direction.SOUTH]: { destination: roomIds.volcanoCore }
      };
    }
  }

  // Volcano Core - center of the volcano
  const volcanoCore = world.getEntity(roomIds.volcanoCore);
  if (volcanoCore) {
    const roomTrait = volcanoCore.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowLedge },
        [Direction.EAST]: { destination: roomIds.dustyRoom },
        [Direction.UP]: { destination: roomIds.volcanoView }
      };
    }
  }

  // Dusty Room - contains emerald
  const dustyRoom = world.getEntity(roomIds.dustyRoom);
  if (dustyRoom) {
    const roomTrait = dustyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.volcanoCore }
      };
    }
  }

  // Volcano View - top with ruby
  const volcanoView = world.getEntity(roomIds.volcanoView);
  if (volcanoView) {
    const roomTrait = volcanoView.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.volcanoCore }
      };
    }
  }
}

/**
 * Connect Volcano to Coal Mine (via Bat Room)
 */
export function connectVolcanoToCoalMine(
  world: WorldModel,
  volcanoIds: VolcanoRoomIds,
  batRoomId: string
): void {
  const volcanoBottom = world.getEntity(volcanoIds.volcanoBottom);
  if (volcanoBottom) {
    const roomTrait = volcanoBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.NORTH] = { destination: batRoomId };
    }
  }

  const batRoom = world.getEntity(batRoomId);
  if (batRoom) {
    const roomTrait = batRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: volcanoIds.volcanoBottom };
    }
  }
}
