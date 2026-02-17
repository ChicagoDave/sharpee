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
import { ParsedCommandTransformer } from '@sharpee/engine';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import {
  getPuzzleState,
  canMove,
  executeMove,
  canExit,
  canPush,
  executePush,
  isAtCardPosition,
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

  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);

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
      const player = world.getPlayer();
      if (puzzleRoomId && player) {
        world.moveEntity(player.id, puzzleRoomId);
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

    // Emit room description with direct message (uses message fallback)
    events.push({
      id: generateEventId(),
      type: 'action.success',
      timestamp: Date.now(),
      entities: {},
      data: {
        actionId: 'dungeo.puzzle.move',
        messageId: 'puzzle_move_description',  // Not registered, so message field is used
        message: getPuzzleDescription(state)
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

  if (isAtCardPosition(state)) {
    // Take the card
    takeCard(state);

    // Add card to player inventory and award take points
    const cardId = world.getStateValue(GOLD_CARD_KEY);
    const player = world.getPlayer();
    if (cardId && player) {
      world.moveEntity(cardId, player.id);

      // Award OFVAL points (same as stdlib taking action does)
      const cardEntity = world.getEntity(cardId);
      if (cardEntity) {
        const identity = cardEntity.get(IdentityTrait);
        if (identity?.points) {
          world.awardScore(cardId, identity.points, identity.name ?? 'gold card');
        }
      }
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
 * Check if the command is trying to take the gold card
 */
function isTakingCard(parsed: IParsedCommand): boolean {
  const rawInput = parsed.rawInput?.toLowerCase() || '';
  const directObj = parsed.structure?.directObject?.head?.toLowerCase() || '';

  // Check if taking something card-related
  const cardTerms = ['card', 'gold card', 'golden card', 'royal card'];

  // Check direct object
  if (cardTerms.some(term => directObj.includes(term.split(' ')[0]))) {
    return true;
  }

  // Check raw input for "take card", "get card", "take gold card", etc.
  if (rawInput.includes('card')) {
    return true;
  }

  return false;
}

/**
 * Create the puzzle command transformer
 *
 * This intercepts commands when player is in the puzzle:
 * 1. GO/movement commands - handled using puzzle grid logic
 * 2. TAKE CARD commands - handled by puzzle take card logic when adjacent
 */
export function createPuzzleCommandTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Check if we're in the puzzle
    if (!isInPuzzle(world)) {
      return parsed;
    }

    const actionId = parsed.action?.toLowerCase();

    // Handle LOOK commands - show dynamic puzzle description
    if (actionId === 'look' || actionId === 'looking' || actionId === 'if.action.looking') {
      return {
        ...parsed,
        action: 'dungeo.puzzle.look',
        extras: {
          ...parsed.extras,
          originalAction: actionId,
          isPuzzleLook: true
        }
      };
    }

    // Handle TAKE commands for the card
    if (actionId === 'take' || actionId === 'taking' || actionId === 'if.action.taking' || actionId === 'get') {
      if (isTakingCard(parsed)) {
        // Check if adjacent to card
        const controller = findPuzzleController(world);
        if (controller) {
          const state = getPuzzleState(controller);
          if (state.cardTaken) {
            // Card already taken - let normal TAKE fail
            return parsed;
          }
          if (isAtCardPosition(state)) {
            // Redirect to puzzle take card action
            // Clear directObject so validator doesn't try to resolve "card" entity
            return {
              ...parsed,
              action: 'dungeo.puzzle.take_card',
              structure: { ...parsed.structure, directObject: undefined },
              extras: {
                ...parsed.extras,
                originalAction: actionId,
                isPuzzleTakeCard: true
              }
            };
          } else {
            // Not at card position - redirect to blocking action
            // Clear directObject so validator doesn't try to resolve "card" entity
            return {
              ...parsed,
              action: 'dungeo.puzzle.take_card_blocked',
              structure: { ...parsed.structure, directObject: undefined },
              extras: {
                ...parsed.extras,
                originalAction: actionId,
                isPuzzleTakeCardBlocked: true
              }
            };
          }
        }
      }
      // Not taking card - let normal TAKE handle it
      return parsed;
    }

    // Handle GO/movement commands
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

      // Emit room description with direct message (uses message fallback)
      const state = getPuzzleState(controller);
      events.push({
        id: generateEventId(),
        type: 'action.success',
        timestamp: Date.now(),
        entities: {},
        data: {
          actionId: 'dungeo.puzzle.entry',
          messageId: 'puzzle_entry_description',  // Not registered, so message field is used
          message: getPuzzleDescription(state)
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
