/**
 * Royal Puzzle State Management
 *
 * The Royal Puzzle is an 8x8 sliding block puzzle. This module manages
 * the puzzle state including the grid, player position, and game flags.
 *
 * Grid cell values:
 *  1 = MARBLE (immovable wall)
 *  0 = EMPTY (walkable corridor)
 * -1 = SANDSTONE (pushable block)
 * -2 = LADDER (pushable block with ladder - needed for exit)
 * -3 = CARD (pushable block with gold card depression)
 *
 * From Fortran DUNGEON source (dmain.for):
 * DATA CPVEC/1,1,1,1,1,1,1,1,
 *      &1,0,-1,0,0,-1,0,1,
 *      &1,-1,0,1,0,-2,0,1,
 *      &1,0,0,0,0,1,0,1,
 *      &1,-3,0,0,-1,-1,0,1,
 *      &1,0,0,-1,0,0,0,1,
 *      &1,1,1,0,0,0,1,1,
 *      &1,1,1,1,1,1,1,1/
 */

import { WorldModel, IFEntity, EntityType, IdentityTrait } from '@sharpee/world-model';

// Cell type constants
export const MARBLE = 1;
export const EMPTY = 0;
export const SANDSTONE = -1;
export const LADDER = -2;
export const CARD_BLOCK = -3;

// Direction offsets for 8x8 grid
export const DIRECTION_OFFSETS = {
  north: -8,
  south: 8,
  east: 1,
  west: -1,
  northeast: -7,
  northwest: -9,
  southeast: 9,
  southwest: 7
} as const;

// Initial grid state (64 elements, row-major)
export const INITIAL_GRID: number[] = [
  // Row 0: all marble (boundary)
  1, 1, 1, 1, 1, 1, 1, 1,
  // Row 1: entry at 9, sandstone at 10, 13
  1, 0, -1, 0, 0, -1, 0, 1,
  // Row 2: sandstone at 17, marble at 19, ladder at 21
  1, -1, 0, 1, 0, -2, 0, 1,
  // Row 3: marble at 29
  1, 0, 0, 0, 0, 1, 0, 1,
  // Row 4: card block at 33, sandstone at 36, 37
  1, -3, 0, 0, -1, -1, 0, 1,
  // Row 5: sandstone at 43
  1, 0, 0, -1, 0, 0, 0, 1,
  // Row 6: partial marble
  1, 1, 1, 0, 0, 0, 1, 1,
  // Row 7: all marble (boundary)
  1, 1, 1, 1, 1, 1, 1, 1
];

// Entry position (player starts here after going DOWN from Puzzle Room)
export const ENTRY_POSITION = 9;

// Position where ladder must be for exit (east of entry)
export const LADDER_EXIT_POSITION = 10;

export interface RoyalPuzzleState {
  grid: number[];
  playerPos: number;
  cardTaken: boolean;
  hasExited: boolean;
  inPuzzle: boolean;
  pushCount: number;
}

/**
 * Create the puzzle state controller entity
 */
export function createPuzzleController(world: WorldModel): IFEntity {
  const controller = world.createEntity('Royal Puzzle Controller', EntityType.OBJECT);

  controller.add(new IdentityTrait({
    name: 'Royal Puzzle Controller',
    aliases: [],
    description: 'Puzzle state controller (not visible to player)',
    properName: true,
    article: 'the'
  }));

  // Initialize puzzle state
  const state: RoyalPuzzleState = {
    grid: [...INITIAL_GRID],
    playerPos: ENTRY_POSITION,
    cardTaken: false,
    hasExited: false,
    inPuzzle: false,
    pushCount: 0
  };

  (controller as any).puzzleState = state;

  return controller;
}

/**
 * Get the puzzle state from the controller
 */
export function getPuzzleState(controller: IFEntity): RoyalPuzzleState {
  return (controller as any).puzzleState;
}

/**
 * Reset the puzzle to initial state
 */
export function resetPuzzle(controller: IFEntity): void {
  const state = getPuzzleState(controller);
  state.grid = [...INITIAL_GRID];
  state.playerPos = ENTRY_POSITION;
  state.cardTaken = false;
  state.hasExited = false;
  state.inPuzzle = false;
  state.pushCount = 0;
}

/**
 * Get row from position (0-7)
 */
export function getRow(pos: number): number {
  return Math.floor(pos / 8);
}

/**
 * Get column from position (0-7)
 */
export function getCol(pos: number): number {
  return pos % 8;
}

/**
 * Check if position is valid (0-63)
 */
export function isValidPosition(pos: number): boolean {
  return pos >= 0 && pos < 64;
}

/**
 * Check if moving in a direction would cross the grid boundary
 */
export function crossesBoundary(pos: number, direction: keyof typeof DIRECTION_OFFSETS): boolean {
  const col = getCol(pos);
  const row = getRow(pos);

  switch (direction) {
    case 'east':
    case 'northeast':
    case 'southeast':
      return col === 7;
    case 'west':
    case 'northwest':
    case 'southwest':
      return col === 0;
    case 'north':
      return row === 0;
    case 'south':
      return row === 7;
    default:
      return false;
  }
}

/**
 * Check if cardinal movement is valid
 */
export function canMoveCardinal(
  state: RoyalPuzzleState,
  direction: 'north' | 'south' | 'east' | 'west'
): boolean {
  if (crossesBoundary(state.playerPos, direction)) return false;

  const dest = state.playerPos + DIRECTION_OFFSETS[direction];
  if (!isValidPosition(dest)) return false;

  return state.grid[dest] === EMPTY;
}

/**
 * Check if diagonal movement is valid
 * Rule: destination must be empty AND at least one orthogonal path must be clear
 */
export function canMoveDiagonal(
  state: RoyalPuzzleState,
  direction: 'northeast' | 'northwest' | 'southeast' | 'southwest'
): boolean {
  if (crossesBoundary(state.playerPos, direction)) return false;

  const dest = state.playerPos + DIRECTION_OFFSETS[direction];
  if (!isValidPosition(dest)) return false;
  if (state.grid[dest] !== EMPTY) return false;

  // Get orthogonal components
  let horizontalOffset: number;
  let verticalOffset: number;

  switch (direction) {
    case 'northeast':
      horizontalOffset = 1;  // east
      verticalOffset = -8;   // north
      break;
    case 'northwest':
      horizontalOffset = -1; // west
      verticalOffset = -8;   // north
      break;
    case 'southeast':
      horizontalOffset = 1;  // east
      verticalOffset = 8;    // south
      break;
    case 'southwest':
      horizontalOffset = -1; // west
      verticalOffset = 8;    // south
      break;
  }

  const horizontal = state.playerPos + horizontalOffset;
  const vertical = state.playerPos + verticalOffset;

  // At least ONE orthogonal path must be clear (from Fortran source)
  const horizontalClear = isValidPosition(horizontal) && state.grid[horizontal] === EMPTY;
  const verticalClear = isValidPosition(vertical) && state.grid[vertical] === EMPTY;

  return horizontalClear || verticalClear;
}

/**
 * Check if any movement in given direction is valid
 */
export function canMove(
  state: RoyalPuzzleState,
  direction: keyof typeof DIRECTION_OFFSETS
): boolean {
  if (['north', 'south', 'east', 'west'].includes(direction)) {
    return canMoveCardinal(state, direction as 'north' | 'south' | 'east' | 'west');
  }
  return canMoveDiagonal(state, direction as 'northeast' | 'northwest' | 'southeast' | 'southwest');
}

/**
 * Execute movement (assumes canMove returned true)
 */
export function executeMove(
  state: RoyalPuzzleState,
  direction: keyof typeof DIRECTION_OFFSETS
): void {
  state.playerPos = state.playerPos + DIRECTION_OFFSETS[direction];
}

/**
 * Check if push in given direction is valid
 * Returns: 'success' | 'no-wall' | 'immovable' | 'no-room' | 'boundary'
 */
export function canPush(
  state: RoyalPuzzleState,
  direction: 'north' | 'south' | 'east' | 'west'
): 'success' | 'no-wall' | 'immovable' | 'no-room' | 'boundary' {
  const offset = DIRECTION_OFFSETS[direction];

  // Check boundary
  if (crossesBoundary(state.playerPos, direction)) {
    return 'boundary';
  }

  const target = state.playerPos + offset;
  if (!isValidPosition(target)) return 'boundary';

  const wallType = state.grid[target];

  // Empty corridor - nothing to push
  if (wallType === EMPTY) return 'no-wall';

  // Marble - immovable
  if (wallType === MARBLE) return 'immovable';

  // Pushable wall (negative values)
  // Check destination
  if (crossesBoundary(target, direction)) return 'no-room';

  const dest = target + offset;
  if (!isValidPosition(dest)) return 'no-room';
  if (state.grid[dest] !== EMPTY) return 'no-room';

  return 'success';
}

/**
 * Execute push (assumes canPush returned 'success')
 */
export function executePush(
  state: RoyalPuzzleState,
  direction: 'north' | 'south' | 'east' | 'west'
): void {
  const offset = DIRECTION_OFFSETS[direction];
  const target = state.playerPos + offset;
  const dest = target + offset;

  // Move wall to destination
  state.grid[dest] = state.grid[target];
  // Clear target position
  state.grid[target] = EMPTY;
  // Move player into target position
  state.playerPos = target;
  // Increment push count
  state.pushCount++;
}

/**
 * Check if player can exit the puzzle (go UP)
 */
export function canExit(state: RoyalPuzzleState): boolean {
  // Must be at entry position
  if (state.playerPos !== ENTRY_POSITION) return false;

  // Ladder must be at exit position (east of entry)
  return state.grid[LADDER_EXIT_POSITION] === LADDER;
}

/**
 * Check if player is adjacent to the card block (can take card)
 */
export function isAdjacentToCard(state: RoyalPuzzleState): boolean {
  if (state.cardTaken) return false;

  // Check all 4 cardinal directions for card block
  for (const dir of ['north', 'south', 'east', 'west'] as const) {
    if (crossesBoundary(state.playerPos, dir)) continue;

    const adjacent = state.playerPos + DIRECTION_OFFSETS[dir];
    if (isValidPosition(adjacent) && state.grid[adjacent] === CARD_BLOCK) {
      return true;
    }
  }
  return false;
}

/**
 * Take the card (converts card block to regular sandstone)
 */
export function takeCard(state: RoyalPuzzleState): void {
  // Find and convert the card block
  const cardIndex = state.grid.indexOf(CARD_BLOCK);
  if (cardIndex !== -1) {
    state.grid[cardIndex] = SANDSTONE;
    state.cardTaken = true;
  }
}

/**
 * Get available directions from current position
 */
export function getAvailableDirections(state: RoyalPuzzleState): string[] {
  const directions: string[] = [];

  for (const dir of Object.keys(DIRECTION_OFFSETS) as (keyof typeof DIRECTION_OFFSETS)[]) {
    if (canMove(state, dir)) {
      directions.push(dir);
    }
  }

  // Check for UP exit
  if (canExit(state)) {
    directions.push('up');
  }

  return directions;
}

/**
 * Check if ladder is visible from current position (adjacent)
 */
export function isLadderVisible(state: RoyalPuzzleState): boolean {
  for (const dir of ['north', 'south', 'east', 'west'] as const) {
    if (crossesBoundary(state.playerPos, dir)) continue;

    const adjacent = state.playerPos + DIRECTION_OFFSETS[dir];
    if (isValidPosition(adjacent) && state.grid[adjacent] === LADDER) {
      return true;
    }
  }
  return false;
}

/**
 * Generate description for current puzzle position
 */
export function getPuzzleDescription(state: RoyalPuzzleState): string {
  const parts: string[] = ['You are in a maze of sandstone walls.'];

  const available = getAvailableDirections(state);
  if (available.length > 0) {
    const directionNames = available.map(d => {
      switch (d) {
        case 'north': return 'north';
        case 'south': return 'south';
        case 'east': return 'east';
        case 'west': return 'west';
        case 'northeast': return 'northeast';
        case 'northwest': return 'northwest';
        case 'southeast': return 'southeast';
        case 'southwest': return 'southwest';
        case 'up': return 'up';
        default: return d;
      }
    });
    parts.push(`Passages lead ${formatDirectionList(directionNames)}.`);
  }

  // Special descriptions
  if (state.playerPos === ENTRY_POSITION) {
    if (canExit(state)) {
      parts.push('Above you is a hole in the ceiling. A wooden ladder on the eastern wall reaches up to it.');
    } else {
      parts.push('Above you is a hole in the ceiling, but there is no way to reach it.');
    }
  }

  if (isLadderVisible(state) && state.playerPos !== ENTRY_POSITION) {
    parts.push('One of the sandstone walls has a wooden ladder attached to it.');
  }

  if (isAdjacentToCard(state)) {
    parts.push('Set into one wall is a small depression. Within it rests a gold card, embossed with the royal crest.');
  }

  return parts.join(' ');
}

function formatDirectionList(directions: string[]): string {
  if (directions.length === 0) return 'nowhere';
  if (directions.length === 1) return directions[0];
  if (directions.length === 2) return `${directions[0]} and ${directions[1]}`;
  return directions.slice(0, -1).join(', ') + ', and ' + directions[directions.length - 1];
}
