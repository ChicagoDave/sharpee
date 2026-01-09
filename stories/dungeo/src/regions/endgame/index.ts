/**
 * Endgame Region - The final challenge of Zork
 *
 * Triggered from the Crypt after meeting specific conditions,
 * or accessed via INCANT cheat.
 *
 * Features:
 * - Laser puzzle (Small Room / Stone Room)
 * - Inside Mirror rotating box puzzle
 * - Dungeon Master trivia challenge
 * - Parapet dial puzzle
 * - Treasury of Zork victory room
 */

import { WorldModel, RoomTrait, Direction } from '@sharpee/world-model';

// Room creators
import { createTopOfStairs } from './rooms/top-of-stairs';
import { createStoneRoom } from './rooms/stone-room';
import { createSmallRoom } from './rooms/small-room';
import { createHallway } from './rooms/hallway';
import { createInsideMirror } from './rooms/inside-mirror';
import { createDungeonEntrance } from './rooms/dungeon-entrance';
import { createNarrowCorridor } from './rooms/narrow-corridor';
import { createEastWestCorridor } from './rooms/east-west-corridor';
import { createParapet } from './rooms/parapet';
import { createPrisonCell } from './rooms/prison-cell';
import { createTreasury } from './rooms/treasury';
import { createEntryToHades } from './rooms/entry-to-hades';
import { createLandOfDead } from './rooms/land-of-dead';
import { createTomb } from './rooms/tomb';

export interface EndgameRoomIds {
  topOfStairs: string;
  stoneRoom: string;
  smallRoom: string;
  hallway: string;
  insideMirror: string;
  dungeonEntrance: string;
  narrowCorridor: string;
  eastWestCorridor: string;
  parapet: string;
  prisonCell: string;
  treasury: string;
  entryToHades: string;
  landOfDead: string;
  tomb: string;
}

/**
 * Create all rooms in the Endgame region
 */
export function createEndgameRooms(world: WorldModel): EndgameRoomIds {
  const topOfStairs = createTopOfStairs(world);
  const stoneRoom = createStoneRoom(world);
  const smallRoom = createSmallRoom(world);
  const hallway = createHallway(world);
  const insideMirror = createInsideMirror(world);
  const dungeonEntrance = createDungeonEntrance(world);
  const narrowCorridor = createNarrowCorridor(world);
  const eastWestCorridor = createEastWestCorridor(world);
  const parapet = createParapet(world);
  const prisonCell = createPrisonCell(world);
  const treasury = createTreasury(world);
  const entryToHades = createEntryToHades(world);
  const landOfDead = createLandOfDead(world);
  const tomb = createTomb(world);

  const roomIds: EndgameRoomIds = {
    topOfStairs: topOfStairs.id,
    stoneRoom: stoneRoom.id,
    smallRoom: smallRoom.id,
    hallway: hallway.id,
    insideMirror: insideMirror.id,
    dungeonEntrance: dungeonEntrance.id,
    narrowCorridor: narrowCorridor.id,
    eastWestCorridor: eastWestCorridor.id,
    parapet: parapet.id,
    prisonCell: prisonCell.id,
    treasury: treasury.id,
    entryToHades: entryToHades.id,
    landOfDead: landOfDead.id,
    tomb: tomb.id
  };

  // Store room IDs for INCANT teleport
  world.setStateValue('endgame.topOfStairsId', roomIds.topOfStairs);
  world.setStateValue('endgame.insideMirrorId', roomIds.insideMirror);

  // Connect the endgame rooms
  connectEndgameRooms(world, roomIds);

  return roomIds;
}

/**
 * Connect Endgame rooms to each other
 */
function connectEndgameRooms(world: WorldModel, roomIds: EndgameRoomIds): void {
  // Top of Stairs
  // W → Stone Room, U → (blocked - no actual exit, just description)
  const topOfStairs = world.getEntity(roomIds.topOfStairs);
  if (topOfStairs) {
    const roomTrait = topOfStairs.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.WEST]: { destination: roomIds.stoneRoom }
      };
    }
  }

  // Stone Room
  // E → Top of Stairs, S → Small Room
  const stoneRoom = world.getEntity(roomIds.stoneRoom);
  if (stoneRoom) {
    const roomTrait = stoneRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.EAST]: { destination: roomIds.topOfStairs },
        [Direction.SOUTH]: { destination: roomIds.smallRoom }
      };
    }
  }

  // Small Room (laser beam)
  // N → Stone Room, S → Hallway
  const smallRoom = world.getEntity(roomIds.smallRoom);
  if (smallRoom) {
    const roomTrait = smallRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.stoneRoom },
        [Direction.SOUTH]: { destination: roomIds.hallway }
      };
    }
  }

  // Hallway (guardians)
  // N → Small Room, S → Dungeon Entrance, IN → Inside Mirror
  const hallway = world.getEntity(roomIds.hallway);
  if (hallway) {
    const roomTrait = hallway.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.NORTH]: { destination: roomIds.smallRoom },
        [Direction.SOUTH]: { destination: roomIds.dungeonEntrance },
        [Direction.IN]: { destination: roomIds.insideMirror }
      };
    }
  }

  // Inside Mirror
  // Exits depend on orientation and position - handled by puzzle handler
  const insideMirror = world.getEntity(roomIds.insideMirror);
  if (insideMirror) {
    const roomTrait = insideMirror.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {};
      // Dynamic exits set by inside-mirror-handler
    }
  }

  // Dungeon Entrance
  // N → (wooden door - blocked until trivia solved), S → Narrow Corridor after trivia
  const dungeonEntrance = world.getEntity(roomIds.dungeonEntrance);
  if (dungeonEntrance) {
    const roomTrait = dungeonEntrance.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        // N exit added when trivia is solved
      };
    }
  }

  // Narrow Corridor (20 points on entry)
  // S → Dungeon Entrance, N → East-West Corridor
  const narrowCorridor = world.getEntity(roomIds.narrowCorridor);
  if (narrowCorridor) {
    const roomTrait = narrowCorridor.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.dungeonEntrance },
        [Direction.NORTH]: { destination: roomIds.eastWestCorridor }
      };
    }
  }

  // East-West Corridor
  // S → Narrow Corridor, N → Parapet
  // E, W → South turns (simplified - original has more complex layout)
  const eastWestCorridor = world.getEntity(roomIds.eastWestCorridor);
  if (eastWestCorridor) {
    const roomTrait = eastWestCorridor.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.narrowCorridor },
        [Direction.NORTH]: { destination: roomIds.parapet }
      };
    }
  }

  // Parapet
  // S → East-West Corridor
  const parapet = world.getEntity(roomIds.parapet);
  if (parapet) {
    const roomTrait = parapet.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.SOUTH]: { destination: roomIds.eastWestCorridor }
      };
    }
  }

  // Prison Cell
  // Exits depend on dial setting - handled by puzzle handler
  const prisonCell = world.getEntity(roomIds.prisonCell);
  if (prisonCell) {
    const roomTrait = prisonCell.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {};
      // Dynamic exits based on dial and cell number
    }
  }

  // Treasury of Zork
  // No exits - game ends on entry
  const treasury = world.getEntity(roomIds.treasury);
  if (treasury) {
    const roomTrait = treasury.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {};
    }
  }
}

/**
 * Create endgame objects
 */
export { createEndgameObjects } from './objects';
