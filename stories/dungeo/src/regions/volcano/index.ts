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
import { createWideLedge } from './rooms/wide-ledge';
import { createVolcanoCore } from './rooms/volcano-core';
import { createDustyRoom } from './rooms/dusty-room';
import { createVolcanoView } from './rooms/volcano-view';
import { createLavaRoom } from './rooms/lava-room';
import { createRubyRoom } from './rooms/ruby-room';
import { createLibrary } from './rooms/library';

export interface VolcanoRoomIds {
  volcanoBottom: string;
  narrowLedge: string;
  wideLedge: string;
  volcanoCore: string;
  dustyRoom: string;
  volcanoView: string;
  lavaRoom: string;
  rubyRoom: string;
  library: string;
}

/**
 * Create all rooms in the Volcano region
 */
export function createVolcanoRooms(world: WorldModel): VolcanoRoomIds {
  const volcanoBottom = createVolcanoBottom(world);
  const narrowLedge = createNarrowLedge(world);
  const wideLedge = createWideLedge(world);
  const volcanoCore = createVolcanoCore(world);
  const dustyRoom = createDustyRoom(world);
  const volcanoView = createVolcanoView(world);
  const lavaRoom = createLavaRoom(world);
  const rubyRoom = createRubyRoom(world);
  const library = createLibrary(world);

  const roomIds: VolcanoRoomIds = {
    volcanoBottom: volcanoBottom.id,
    narrowLedge: narrowLedge.id,
    wideLedge: wideLedge.id,
    volcanoCore: volcanoCore.id,
    dustyRoom: dustyRoom.id,
    volcanoView: volcanoView.id,
    lavaRoom: lavaRoom.id,
    rubyRoom: rubyRoom.id,
    library: library.id
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

  // Lava Room: S → Volcano Bottom, E → Ruby Room
  const lavaRoom = world.getEntity(roomIds.lavaRoom);
  if (lavaRoom) {
    const roomTrait = lavaRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.volcanoBottom },
        [Direction.EAST]: { destination: roomIds.rubyRoom },
      };
    }
  }

  // Ruby Room: W → Lava Room
  // S → Glacier Room (dam region) is connected externally
  const rubyRoom = world.getEntity(roomIds.rubyRoom);
  if (rubyRoom) {
    const roomTrait = rubyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.lavaRoom },
      };
    }
  }

  // Narrow Ledge (Volcano Ledge lower) - dangerous path
  // E → Library, S → Volcano Core, DOWN → Volcano Bottom
  const narrowLedge = world.getEntity(roomIds.narrowLedge);
  if (narrowLedge) {
    const roomTrait = narrowLedge.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.volcanoBottom },
        [Direction.SOUTH]: { destination: roomIds.volcanoCore },
        [Direction.EAST]: { destination: roomIds.library }
      };
    }
  }

  // Library - contains purple book with stamp
  // W → Narrow Ledge
  const library = world.getEntity(roomIds.library);
  if (library) {
    const roomTrait = library.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.narrowLedge }
      };
    }
  }

  // Wide Ledge (Volcano Ledge upper)
  // W → Volcano Core, E → Dusty Room
  const wideLedge = world.getEntity(roomIds.wideLedge);
  if (wideLedge) {
    const roomTrait = wideLedge.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.volcanoCore },
        [Direction.EAST]: { destination: roomIds.dustyRoom }
      };
    }
  }

  // Volcano Core - center of the volcano
  // N → Narrow Ledge, E → Wide Ledge, UP → Volcano View
  const volcanoCore = world.getEntity(roomIds.volcanoCore);
  if (volcanoCore) {
    const roomTrait = volcanoCore.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.narrowLedge },
        [Direction.EAST]: { destination: roomIds.wideLedge },
        [Direction.UP]: { destination: roomIds.volcanoView }
      };
    }
  }

  // Dusty Room - contains emerald
  // W → Wide Ledge
  const dustyRoom = world.getEntity(roomIds.dustyRoom);
  if (dustyRoom) {
    const roomTrait = dustyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.wideLedge }
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
 * Connect Ruby Room to Glacier Room (dam region)
 *
 * Per map-connections.md:
 * - Ruby Room S → Glacier Room
 * - Glacier Room W → Ruby Room
 */
export function connectVolcanoToGlacier(
  world: WorldModel,
  volcanoIds: VolcanoRoomIds,
  glacierRoomId: string
): void {
  // Ruby Room S → Glacier Room
  const rubyRoom = world.getEntity(volcanoIds.rubyRoom);
  if (rubyRoom) {
    const roomTrait = rubyRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.SOUTH] = { destination: glacierRoomId };
    }
  }

  // Glacier Room W → Ruby Room
  const glacierRoom = world.getEntity(glacierRoomId);
  if (glacierRoom) {
    const roomTrait = glacierRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: volcanoIds.rubyRoom };
    }
  }
}
