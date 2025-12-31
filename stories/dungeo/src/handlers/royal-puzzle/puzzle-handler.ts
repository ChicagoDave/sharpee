/**
 * Royal Puzzle Movement Handler
 *
 * Handles movement within the Room in a Puzzle using:
 * 1. ParsedCommandTransformer - intercepts GO commands when in puzzle
 * 2. Custom puzzleMove action - handles grid-based movement
 * 3. Daemons - track state and handle entry/exit
 *
 * Also handles:
 * - Entry into the puzzle (going DOWN from Puzzle Room)
 * - Exit from the puzzle (going UP when ladder is positioned)
 * - Taking the gold card when adjacent
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait, Direction, DirectionType, IParsedCommand } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext, ParsedCommandTransformer } from '@sharpee/engine';
import {
  getPuzzleState,
  canMove,
  executeMove,
  canExit,
  canPush,
  executePush,
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
  ROOM_DESCRIPTION: 'dungeo.puzzle.room_description',
  TAKE_CARD: 'dungeo.puzzle.take_card',
  CANT_TAKE_CARD: 'dungeo.puzzle.cant_take_card',
  PUSH_SUCCESS: 'dungeo.puzzle.push_success',
  PUSH_NO_WALL: 'dungeo.puzzle.push_no_wall',
  PUSH_IMMOVABLE: 'dungeo.puzzle.push_immovable',
  PUSH_NO_ROOM: 'dungeo.puzzle.push_no_room'
} as const;

// State keys for tracking puzzle state
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
 * Check if player is currently in the Room in a Puzzle
 */
function isInPuzzle(world: WorldModel): boolean {
  const roomInPuzzleId = world.getStateValue(PUZZLE_ROOM_KEY);
  if (!roomInPuzzleId) return false;

  const playerId = world.getStateValue('player.id') || 'player';
  const playerLocation = world.getLocation(playerId);

  return playerLocation === roomInPuzzleId;
}

/**
 * Map direction name to puzzle direction key
 */
function normalizeDirection(dir: string): keyof typeof DIRECTION_OFFSETS | 'up' | 'down' | null {
  const normalized = dir.toLowerCase().replace(/[^a-z]/g, '');

  const directionMap: Record<string, keyof typeof DIRECTION_OFFSETS | 'up' | 'down'> = {
    'n': 'north',
    'north': 'north',
    's': 'south',
    'south': 'south',
    'e': 'east',
    'east': 'east',
    'w': 'west',
    'west': 'west',
    'ne': 'northeast',
    'northeast': 'northeast',
    'nw': 'northwest',
    'northwest': 'northwest',
    'se': 'southeast',
    'southeast': 'southeast',
    'sw': 'southwest',
    'southwest': 'southwest',
    'u': 'up',
    'up': 'up',
    'd': 'down',
    'down': 'down'
  };

  return directionMap[normalized] || null;
}

/**
 * Handle puzzle movement - called when player tries to move in puzzle
 * Returns events to emit, or null if movement should be handled normally
 */
export function handlePuzzleMovement(
  world: WorldModel,
  direction: string
): ISemanticEvent[] | null {
  const controller = findPuzzleController(world);
  if (!controller) return null;

  const state = getPuzzleState(controller);
  if (!state.inPuzzle) return null;

  const dir = normalizeDirection(direction);
  if (!dir) return null;

  const events: ISemanticEvent[] = [];

  // Handle UP - exit attempt
  if (dir === 'up') {
    if (canExit(state)) {
      // Exit the puzzle
      state.inPuzzle = false;
      state.hasExited = true;

      // Move player to puzzle room (entrance)
      const puzzleRoomId = world.getStateValue(PUZZLE_ENTRANCE_KEY);
      const playerId = world.getStateValue('player.id') || 'player';
      if (puzzleRoomId) {
        world.moveEntity(playerId, puzzleRoomId);
      }

      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: PuzzleHandlerMessages.EXIT_PUZZLE
        },
        narrate: true
      });

      // Show puzzle room description
      if (puzzleRoomId) {
        const room = world.getEntity(puzzleRoomId);
        const identity = room?.get(IdentityTrait);
        events.push({
          id: generateEventId(),
          type: 'if.event.room.description',
          timestamp: Date.now(),
          entities: {},
          data: {
            roomId: puzzleRoomId,
            roomName: identity?.name || 'Puzzle Room',
            roomDescription: identity?.description || '',
            includeContents: true,
            verbose: true
          },
          narrate: true
        });
      }

      return events;
    } else {
      // Can't exit - ladder not in position
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: PuzzleHandlerMessages.CANT_EXIT
        },
        narrate: true
      });
      return events;
    }
  }

  // Handle DOWN - shouldn't be possible from inside
  if (dir === 'down') {
    events.push({
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PuzzleHandlerMessages.MOVE_BLOCKED,
        direction: 'down'
      },
      narrate: true
    });
    return events;
  }

  // Handle cardinal/diagonal movement
  const puzzleDir = dir as keyof typeof DIRECTION_OFFSETS;

  if (canMove(state, puzzleDir)) {
    // Execute the move
    executeMove(state, puzzleDir);

    // Emit success and new room description
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
  } else {
    // Movement blocked
    events.push({
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PuzzleHandlerMessages.MOVE_BLOCKED,
        direction: dir
      },
      narrate: true
    });
    return events;
  }
}

/**
 * Handle taking the gold card when adjacent
 */
export function handleTakeCard(world: WorldModel): ISemanticEvent[] | null {
  const controller = findPuzzleController(world);
  if (!controller) return null;

  const state = getPuzzleState(controller);
  if (!state.inPuzzle) return null;

  const events: ISemanticEvent[] = [];

  if (isAdjacentToCard(state)) {
    // Take the card
    takeCard(state);

    // Add card to player inventory
    const cardId = world.getStateValue(GOLD_CARD_KEY);
    const playerId = world.getStateValue('player.id') || 'player';
    if (cardId && playerId) {
      world.moveEntity(cardId, playerId);
    }

    events.push({
      id: generateEventId(),
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: PuzzleHandlerMessages.TAKE_CARD
      },
      narrate: true
    });

    // Also emit a taken event for scoring
    events.push({
      id: generateEventId(),
      type: 'if.event.taken',
      timestamp: Date.now(),
      entities: { target: cardId || 'gold-card' },
      data: {
        targetId: cardId,
        targetName: 'gold card'
      },
      narrate: false
    });

    return events;
  }

  return null; // Let normal TAKE action handle it (or fail)
}

/**
 * Create the puzzle movement command transformer
 *
 * This intercepts GO/movement commands when player is in the puzzle
 * and handles them using puzzle grid logic instead of room exits.
 */
export function createPuzzleCommandTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Check if we're in the puzzle
    if (!isInPuzzle(world)) {
      return parsed;
    }

    // Check if this is a GO/movement command
    const actionId = parsed.action?.toLowerCase();
    if (actionId !== 'go' && actionId !== 'going' && actionId !== 'if.action.going') {
      return parsed;
    }

    // Get the direction from extras or direct object
    let direction: string | undefined;

    if (parsed.extras?.direction) {
      direction = String(parsed.extras.direction);
    } else if (parsed.structure?.directObject?.head) {
      direction = parsed.structure.directObject.head;
    }

    if (!direction) {
      return parsed;
    }

    // Mark this command to be handled by puzzle logic
    // We use a special action ID that the engine will recognize
    return {
      ...parsed,
      action: 'dungeo.puzzle.move',
      extras: {
        ...parsed.extras,
        direction,
        originalAction: actionId,
        isPuzzleMove: true
      }
    };
  };
}

/**
 * Initialize puzzle entry when descending into puzzle
 */
function initializePuzzleEntry(controller: any): void {
  const state = getPuzzleState(controller);
  state.inPuzzle = true;
  state.playerPos = ENTRY_POSITION;
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
  /**
   * Daemon: Handle entry into the puzzle
   */
  const entryDaemon: Daemon = {
    id: 'dungeo-royal-puzzle-entry',
    name: 'Royal Puzzle Entry',
    priority: 80,

    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue('dungeo.royal_puzzle.prevLocation');
      const puzzleRoomId = context.world.getStateValue(PUZZLE_ENTRANCE_KEY);
      const roomInPuzzleId = context.world.getStateValue(PUZZLE_ROOM_KEY);

      return prevLocation === puzzleRoomId && context.playerLocation === roomInPuzzleId;
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
    priority: -100,

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
 * Store puzzle room IDs in world state for handlers to access
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
