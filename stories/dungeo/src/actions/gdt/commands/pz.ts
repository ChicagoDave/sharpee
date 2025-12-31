/**
 * GDT Puzzle Command (PZ)
 *
 * Debug command for manipulating the Royal Puzzle state.
 * Usage:
 *   PZ          - Display current puzzle state
 *   PZ RESET    - Reset puzzle to initial state
 *   PZ ENTER    - Enter the puzzle at entry position
 *   PZ EXIT     - Set up ladder at exit position (for testing exit)
 *   PZ L <pos>  - Move ladder to position (0-63)
 *   PZ P <pos>  - Move player to position (0-63)
 *   PZ CARD     - Take the card (mark as taken)
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { IdentityTrait } from '@sharpee/world-model';
import {
  getPuzzleState,
  resetPuzzle,
  LADDER,
  SANDSTONE,
  EMPTY,
  ENTRY_POSITION,
  LADDER_EXIT_POSITION,
  RoyalPuzzleState
} from '../../../regions/royal-puzzle';

const PUZZLE_CONTROLLER_KEY = 'dungeo.royal_puzzle.controllerId';
const PUZZLE_ROOM_KEY = 'dungeo.royal_puzzle.roomInPuzzleId';

function findPuzzleController(context: GDTContext): any | undefined {
  const controllerId = context.world.getStateValue(PUZZLE_CONTROLLER_KEY);
  if (controllerId) {
    return context.world.getEntity(controllerId);
  }

  // Fallback: search for it
  const entities = context.world.getAllEntities();
  return entities.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'Royal Puzzle Controller';
  });
}

function displayState(state: RoyalPuzzleState): string[] {
  const output: string[] = [
    'Royal Puzzle State:',
    `  In Puzzle: ${state.inPuzzle}`,
    `  Player Position: ${state.playerPos} (row ${Math.floor(state.playerPos / 8)}, col ${state.playerPos % 8})`,
    `  Card Taken: ${state.cardTaken}`,
    `  Has Exited: ${state.hasExited}`,
    `  Push Count: ${state.pushCount}`,
    ''
  ];

  // Find ladder position
  const ladderPos = state.grid.indexOf(LADDER);
  output.push(`  Ladder Position: ${ladderPos >= 0 ? `${ladderPos} (row ${Math.floor(ladderPos / 8)}, col ${ladderPos % 8})` : 'N/A'}`);
  output.push(`  Exit Position: ${LADDER_EXIT_POSITION} (ladder must be here to exit)`);
  output.push(`  Entry Position: ${ENTRY_POSITION} (player must be here to exit)`);
  output.push('');

  // Display grid
  output.push('Grid (M=marble, .=empty, S=sand, L=ladder, C=card):');
  for (let row = 0; row < 8; row++) {
    let rowStr = '  ';
    for (let col = 0; col < 8; col++) {
      const pos = row * 8 + col;
      const cell = state.grid[pos];
      let char: string;
      switch (cell) {
        case 1: char = 'M'; break;  // MARBLE
        case 0: char = pos === state.playerPos ? '@' : '.'; break;  // EMPTY
        case -1: char = 'S'; break; // SANDSTONE
        case -2: char = 'L'; break; // LADDER
        case -3: char = 'C'; break; // CARD
        default: char = '?';
      }
      rowStr += char + ' ';
    }
    output.push(rowStr);
  }

  return output;
}

export const pzHandler: GDTCommandHandler = {
  code: 'PZ',
  name: 'Puzzle',
  description: 'Manipulate Royal Puzzle state for testing',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const controller = findPuzzleController(context);
    if (!controller) {
      return {
        success: false,
        output: ['Royal Puzzle controller not found.'],
        error: 'NO_CONTROLLER'
      };
    }

    const state = getPuzzleState(controller);
    const subcommand = args[0]?.toUpperCase();

    if (!subcommand) {
      // Display state
      return {
        success: true,
        output: displayState(state)
      };
    }

    switch (subcommand) {
      case 'RESET':
        resetPuzzle(controller);
        return {
          success: true,
          output: ['Puzzle reset to initial state.', ...displayState(getPuzzleState(controller))]
        };

      case 'ENTER':
        state.inPuzzle = true;
        state.playerPos = ENTRY_POSITION;
        // Move player entity to Room in a Puzzle
        const roomInPuzzleId = context.world.getStateValue(PUZZLE_ROOM_KEY);
        const player = context.world.getPlayer();
        if (roomInPuzzleId && player) {
          context.world.moveEntity(player.id, roomInPuzzleId);
        }
        return {
          success: true,
          output: ['Entered puzzle at entry position.', ...displayState(state)]
        };

      case 'EXIT':
        // Set up for successful exit: player at entry, ladder at exit position
        state.inPuzzle = true;
        state.playerPos = ENTRY_POSITION;
        // Clear any sandstone at exit position, place ladder there
        const currentLadderPos = state.grid.indexOf(LADDER);
        if (currentLadderPos >= 0) {
          state.grid[currentLadderPos] = EMPTY;  // Clear old ladder position
        }
        // Also clear the exit position if it has sandstone
        if (state.grid[LADDER_EXIT_POSITION] === SANDSTONE) {
          state.grid[LADDER_EXIT_POSITION] = LADDER;
        } else {
          state.grid[LADDER_EXIT_POSITION] = LADDER;
        }
        // Ensure player is in Room in a Puzzle
        const roomId = context.world.getStateValue(PUZZLE_ROOM_KEY);
        const p = context.world.getPlayer();
        if (roomId && p) {
          context.world.moveEntity(p.id, roomId);
        }
        return {
          success: true,
          output: ['Set up for exit: player at entry, ladder at exit position.', ...displayState(state)]
        };

      case 'L':
      case 'LADDER':
        const ladderPos = parseInt(args[1], 10);
        if (isNaN(ladderPos) || ladderPos < 0 || ladderPos >= 64) {
          return {
            success: false,
            output: ['Invalid position. Use PZ L <0-63>'],
            error: 'INVALID_POSITION'
          };
        }
        // Clear old ladder position
        const oldLadderPos = state.grid.indexOf(LADDER);
        if (oldLadderPos >= 0) {
          state.grid[oldLadderPos] = EMPTY;
        }
        // Place ladder at new position (overwrite whatever is there)
        state.grid[ladderPos] = LADDER;
        return {
          success: true,
          output: [`Ladder moved to position ${ladderPos}.`, ...displayState(state)]
        };

      case 'P':
      case 'PLAYER':
        const playerPos = parseInt(args[1], 10);
        if (isNaN(playerPos) || playerPos < 0 || playerPos >= 64) {
          return {
            success: false,
            output: ['Invalid position. Use PZ P <0-63>'],
            error: 'INVALID_POSITION'
          };
        }
        state.playerPos = playerPos;
        state.inPuzzle = true;
        return {
          success: true,
          output: [`Player moved to position ${playerPos}.`, ...displayState(state)]
        };

      case 'CARD':
        state.cardTaken = true;
        // Convert card block to sandstone
        const cardIdx = state.grid.indexOf(-3);  // CARD_BLOCK
        if (cardIdx >= 0) {
          state.grid[cardIdx] = SANDSTONE;
        }
        return {
          success: true,
          output: ['Card marked as taken.', ...displayState(state)]
        };

      default:
        return {
          success: false,
          output: [
            'Unknown subcommand. Usage:',
            '  PZ          - Display puzzle state',
            '  PZ RESET    - Reset puzzle',
            '  PZ ENTER    - Enter puzzle at entry',
            '  PZ EXIT     - Set up for exit test',
            '  PZ L <pos>  - Move ladder',
            '  PZ P <pos>  - Move player',
            '  PZ CARD     - Take card'
          ],
          error: 'UNKNOWN_SUBCOMMAND'
        };
    }
  }
};
