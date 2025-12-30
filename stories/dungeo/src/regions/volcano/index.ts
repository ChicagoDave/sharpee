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
import { createLavaRoom } from './rooms/lava-room';
import { createSmallChamber } from './rooms/small-chamber';

export interface VolcanoRoomIds {
  volcanoBottom: string;
  narrowLedge: string;
  volcanoCore: string;
  dustyRoom: string;
  volcanoView: string;
  lavaRoom: string;
  smallChamber: string;
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
  const lavaRoom = createLavaRoom(world);
  const smallChamber = createSmallChamber(world);

  const roomIds: VolcanoRoomIds = {
    volcanoBottom: volcanoBottom.id,
    narrowLedge: narrowLedge.id,
    volcanoCore: volcanoCore.id,
    dustyRoom: dustyRoom.id,
    volcanoView: volcanoView.id,
    lavaRoom: lavaRoom.id,
    smallChamber: smallChamber.id
  };

  connectVolcanoRooms(world, roomIds);
  return roomIds;
}

export { createVolcanoObjects } from './objects';

function connectVolcanoRooms(world: WorldModel, roomIds: VolcanoRoomIds): void {
  // Volcano Bottom - entry point
  // N → Lava Room, UP → Narrow Ledge
  const volcanoBottom = world.getEntity(roomIds.volcanoBottom);
  if (volcanoBottom) {
    const roomTrait = volcanoBottom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.lavaRoom },
        [Direction.UP]: { destination: roomIds.narrowLedge },
      };
    }
  }

  // Lava Room: S → Volcano Bottom, E → Small Chamber
  const lavaRoom = world.getEntity(roomIds.lavaRoom);
  if (lavaRoom) {
    const roomTrait = lavaRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.volcanoBottom },
        [Direction.EAST]: { destination: roomIds.smallChamber },
      };
    }
  }

  // Small Chamber: W → Lava Room
  // S → Glacier Room (dam region) is connected externally
  const smallChamber = world.getEntity(roomIds.smallChamber);
  if (smallChamber) {
    const roomTrait = smallChamber.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.lavaRoom },
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
 * Connect Small Chamber to Glacier Room (dam region)
 *
 * Per map-connections.md:
 * - Small Chamber S → Glacier Room
 * - Glacier Room W → Small Chamber
 */
export function connectVolcanoToGlacier(
  world: WorldModel,
  volcanoIds: VolcanoRoomIds,
  glacierRoomId: string
): void {
  // Small Chamber S → Glacier Room
  const smallChamber = world.getEntity(volcanoIds.smallChamber);
  if (smallChamber) {
    const roomTrait = smallChamber.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: glacierRoomId };
    }
  }

  // Glacier Room W → Small Chamber
  const glacierRoom = world.getEntity(glacierRoomId);
  if (glacierRoom) {
    const roomTrait = glacierRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: volcanoIds.smallChamber };
    }
  }
}
