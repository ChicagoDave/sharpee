/**
 * Royal Puzzle Region
 *
 * The Royal Puzzle is an 8x8 sliding block puzzle, one of the most
 * challenging puzzles in Mainframe Zork. The player must push sandstone
 * walls to reach the gold card treasure and then position a ladder
 * to escape.
 *
 * Entry path:
 * - Treasure Room (maze) → E → Square Room → D → Puzzle Room → D → Room in a Puzzle
 *
 * Rooms:
 * - Square Room: Transition from Treasure Room
 * - Puzzle Room: Entry chamber above the puzzle
 * - Room in a Puzzle: Virtual room inside the 8x8 grid
 *
 * The puzzle mechanics are handled by:
 * - puzzle-state.ts: Grid state and movement/push logic
 * - Event handlers in the main game setup (for intercepting movement)
 * - PUSH WALL action in stories/dungeo/src/actions/push-wall/
 */

import { WorldModel, RoomTrait, Direction, IFEntity } from '@sharpee/world-model';

// Room creators
import { createSquareRoom } from './rooms/square-room';
import { createPuzzleRoom } from './rooms/puzzle-room';
import { createRoomInPuzzle } from './rooms/room-in-puzzle';

// Puzzle state
import { createPuzzleController } from './puzzle-state';

// Objects
import { createRoyalPuzzleObjects } from './objects';

export interface RoyalPuzzleRoomIds {
  squareRoom: string;
  puzzleRoom: string;
  roomInPuzzle: string;
  puzzleController: string;
  goldCard: string;
  warningNote: string;
}

/**
 * Create all rooms in the Royal Puzzle region
 */
export function createRoyalPuzzleRooms(world: WorldModel): RoyalPuzzleRoomIds {
  const squareRoom = createSquareRoom(world);
  const puzzleRoom = createPuzzleRoom(world);
  const roomInPuzzle = createRoomInPuzzle(world);
  const puzzleController = createPuzzleController(world);

  const roomIds: RoyalPuzzleRoomIds = {
    squareRoom: squareRoom.id,
    puzzleRoom: puzzleRoom.id,
    roomInPuzzle: roomInPuzzle.id,
    puzzleController: puzzleController.id,
    goldCard: '', // Set after creating objects
    warningNote: ''
  };

  // Create objects
  const objects = createRoyalPuzzleObjects(world, {
    puzzleRoom: puzzleRoom.id,
    roomInPuzzle: roomInPuzzle.id
  });
  roomIds.goldCard = objects.goldCard.id;
  roomIds.warningNote = objects.warningNote.id;

  // Connect rooms within the region
  connectRoyalPuzzleRooms(world, roomIds);

  return roomIds;
}

/**
 * Connect rooms within the Royal Puzzle region
 */
function connectRoyalPuzzleRooms(world: WorldModel, roomIds: RoyalPuzzleRoomIds): void {
  // Square Room: D → Puzzle Room
  const squareRoom = world.getEntity(roomIds.squareRoom);
  if (squareRoom) {
    const roomTrait = squareRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.DOWN]: { destination: roomIds.puzzleRoom }
        // W → Treasure Room connected externally
      };
    }
  }

  // Puzzle Room: U → Square Room, D → Room in a Puzzle
  const puzzleRoom = world.getEntity(roomIds.puzzleRoom);
  if (puzzleRoom) {
    const roomTrait = puzzleRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits = {
        [Direction.UP]: { destination: roomIds.squareRoom },
        [Direction.DOWN]: { destination: roomIds.roomInPuzzle }
      };
    }
  }

  // Room in a Puzzle: exits are dynamic, but UP leads back to Puzzle Room
  // (only when ladder is positioned correctly - handled by puzzle mechanics)
  // The room starts with no static exits; movement is handled by event handlers
  const roomInPuzzle = world.getEntity(roomIds.roomInPuzzle);
  if (roomInPuzzle) {
    const roomTrait = roomInPuzzle.get(RoomTrait);
    if (roomTrait) {
      // No static exits - all handled dynamically
      roomTrait.exits = {};
    }
  }
}

/**
 * Connect Royal Puzzle region to Treasure Room (maze region)
 *
 * Per map-connections.md:
 * - Treasure Room E → Square Room
 * - Square Room W → Treasure Room
 */
export function connectRoyalPuzzleToTreasureRoom(
  world: WorldModel,
  royalPuzzleIds: RoyalPuzzleRoomIds,
  treasureRoomId: string
): void {
  // Square Room W → Treasure Room
  const squareRoom = world.getEntity(royalPuzzleIds.squareRoom);
  if (squareRoom) {
    const roomTrait = squareRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.WEST] = { destination: treasureRoomId };
    }
  }

  // Treasure Room E → Square Room
  const treasureRoom = world.getEntity(treasureRoomId);
  if (treasureRoom) {
    const roomTrait = treasureRoom.get(RoomTrait);
    if (roomTrait) {
      roomTrait.exits[Direction.EAST] = { destination: royalPuzzleIds.squareRoom };
    }
  }
}

// Re-export puzzle state utilities for use by handlers
export {
  getPuzzleState,
  resetPuzzle,
  canMove,
  executeMove,
  canPush,
  executePush,
  canExit,
  isAdjacentToCard,
  takeCard,
  getAvailableDirections,
  getPuzzleDescription,
  isLadderVisible,
  DIRECTION_OFFSETS,
  ENTRY_POSITION,
  LADDER_EXIT_POSITION,
  RoyalPuzzleState,
  // Cell type constants
  MARBLE,
  EMPTY,
  SANDSTONE,
  LADDER,
  CARD_BLOCK
} from './puzzle-state';
