/**
 * Royal Puzzle Movement Handler
 *
 * Handles movement within the Room in a Puzzle using daemons.
 * When player tries to move while in the puzzle, intercept and
 * use puzzle state logic instead of normal room exits.
 *
 * Also handles:
 * - Entry into the puzzle (going DOWN from Puzzle Room)
 * - Exit from the puzzle (going UP when ladder is positioned)
 * - Taking the gold card when adjacent
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';
import {
  getPuzzleState,
  canMove,
  executeMove,
  canExit,
  isAdjacentToCard,
  takeCard,
  getPuzzleDescription,
  ENTRY_POSITION,
  RoyalPuzzleState,
  DIRECTION_OFFSETS
} from '../../regions/royal-puzzle';

export const PuzzleHandlerMessages = {
  ENTER_PUZZLE: 'dungeo.puzzle.enter',
  EXIT_PUZZLE: 'dungeo.puzzle.exit',
  CANT_EXIT: 'dungeo.puzzle.cant_exit',
  MOVE_BLOCKED: 'dungeo.puzzle.move_blocked',
  MOVE_SUCCESS: 'dungeo.puzzle.move_success',
  ROOM_DESCRIPTION: 'dungeo.puzzle.room_description'
} as const;

// State key for tracking puzzle state
const PUZZLE_CONTROLLER_KEY = 'dungeo.royal_puzzle.controllerId';
const PUZZLE_ROOM_KEY = 'dungeo.royal_puzzle.roomInPuzzleId';
const PUZZLE_ENTRANCE_KEY = 'dungeo.royal_puzzle.puzzleRoomId';
const GOLD_CARD_KEY = 'dungeo.royal_puzzle.goldCardId';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `royal-puzzle-${Date.now()}-${++eventCounter}`;
}

/**
 * Find the puzzle controller entity
 */
function findPuzzleController(world: WorldModel): any | undefined {
  const controllerId = world.getStateValue(PUZZLE_CONTROLLER_KEY);
  if (controllerId) {
    return world.getEntity(controllerId);
  }

  // Fallback: search for it
  const entities = world.getAllEntities();
  return entities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Royal Puzzle Controller';
  });
}

/**
 * Check if a room is the Room in a Puzzle
 */
function isRoomInPuzzle(world: WorldModel, roomId: string): boolean {
  const room = world.getEntity(roomId);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  return identity?.name === 'Room in a Puzzle';
}

/**
 * Get the Room in a Puzzle ID
 */
function getRoomInPuzzleId(world: WorldModel): string | undefined {
  const cachedId = world.getStateValue(PUZZLE_ROOM_KEY);
  if (cachedId) return cachedId;

  const entities = world.getAllEntities();
  const room = entities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Room in a Puzzle';
  });

  if (room) {
    world.setStateValue(PUZZLE_ROOM_KEY, room.id);
    return room.id;
  }
  return undefined;
}

/**
 * Get the Puzzle Room (entrance) ID
 */
function getPuzzleRoomId(world: WorldModel): string | undefined {
  const cachedId = world.getStateValue(PUZZLE_ENTRANCE_KEY);
  if (cachedId) return cachedId;

  const entities = world.getAllEntities();
  const room = entities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Puzzle Room';
  });

  if (room) {
    world.setStateValue(PUZZLE_ENTRANCE_KEY, room.id);
    return room.id;
  }
  return undefined;
}

/**
 * Initialize puzzle state when entering
 */
function initializePuzzleEntry(controller: any): void {
  const state = getPuzzleState(controller);
  state.inPuzzle = true;
  state.playerPos = ENTRY_POSITION;
}

/**
 * Handle exiting the puzzle
 */
function handlePuzzleExit(controller: any): void {
  const state = getPuzzleState(controller);
  state.inPuzzle = false;
  state.hasExited = true;
}

/**
 * Register Royal Puzzle handling daemons
 */
export function registerRoyalPuzzleHandler(
  scheduler: ISchedulerService,
  puzzleRoomIds: {
    puzzleRoom: string;
    roomInPuzzle: string;
    puzzleController: string;
    goldCard: string;
  }
): void {
  // Cache IDs in world state (set when world is initialized)
  // This will be done in story index

  /**
   * Daemon: Handle entry into the puzzle
   *
   * When player goes DOWN from Puzzle Room to Room in a Puzzle,
   * initialize the puzzle state.
   */
  const entryDaemon: Daemon = {
    id: 'dungeo-royal-puzzle-entry',
    name: 'Royal Puzzle Entry',
    priority: 80, // Run early

    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue('dungeo.royal_puzzle.prevLocation');
      const puzzleRoomId = context.world.getStateValue(PUZZLE_ENTRANCE_KEY);

      // Check if player just moved from Puzzle Room to Room in a Puzzle
      return prevLocation === puzzleRoomId &&
             context.playerLocation === context.world.getStateValue(PUZZLE_ROOM_KEY);
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world } = context;
      const events: ISemanticEvent[] = [];

      const controller = findPuzzleController(world);
      if (!controller) return events;

      // Initialize puzzle state
      initializePuzzleEntry(controller);

      // Emit entry message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: PuzzleHandlerMessages.ENTER_PUZZLE
        },
        narrate: true
      });

      // Emit room description
      const state = getPuzzleState(controller);
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: PuzzleHandlerMessages.ROOM_DESCRIPTION,
          text: getPuzzleDescription(state)
        },
        narrate: true
      });

      return events;
    }
  };

  /**
   * Daemon: Track previous location
   */
  const trackingDaemon: Daemon = {
    id: 'dungeo-royal-puzzle-tracking',
    name: 'Royal Puzzle Location Tracking',
    priority: -100, // Run at end of turn

    condition: (_context: SchedulerContext): boolean => true,

    run: (context: SchedulerContext): ISemanticEvent[] => {
      context.world.setStateValue('dungeo.royal_puzzle.prevLocation', context.playerLocation);
      return [];
    }
  };

  scheduler.registerDaemon(entryDaemon);
  scheduler.registerDaemon(trackingDaemon);
}

/**
 * Store puzzle room IDs in world state for daemons to access
 */
export function initializePuzzleState(
  world: WorldModel,
  puzzleRoomIds: {
    puzzleRoom: string;
    roomInPuzzle: string;
    puzzleController: string;
    goldCard: string;
  }
): void {
  world.setStateValue(PUZZLE_CONTROLLER_KEY, puzzleRoomIds.puzzleController);
  world.setStateValue(PUZZLE_ROOM_KEY, puzzleRoomIds.roomInPuzzle);
  world.setStateValue(PUZZLE_ENTRANCE_KEY, puzzleRoomIds.puzzleRoom);
  world.setStateValue(GOLD_CARD_KEY, puzzleRoomIds.goldCard);
}
