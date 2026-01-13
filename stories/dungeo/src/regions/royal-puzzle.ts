/**
 * Royal Puzzle Region
 *
 * 3 rooms: Square Room, Puzzle Room, Room in a Puzzle
 *
 * The Royal Puzzle is an 8x8 sliding block puzzle, one of the most
 * challenging puzzles in Mainframe Zork. The player must push sandstone
 * walls to reach the gold card treasure and then position a ladder
 * to escape.
 *
 * Entry path:
 * - Treasure Room (maze) → E → Square Room → D → Puzzle Room → D → Room in a Puzzle
 *
 * The puzzle mechanics are handled by:
 * - Puzzle state functions in this file
 * - Event handlers in the main game setup (for intercepting movement)
 * - PUSH WALL action in stories/dungeo/src/actions/push-wall/
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  ReadableTrait
} from '@sharpee/world-model';

export interface RoyalPuzzleRoomIds {
  squareRoom: string;
  puzzleRoom: string;
  roomInPuzzle: string;
  puzzleController: string;
  goldCard: string;
  warningNote: string;
}

// ============================================================================
// PUZZLE STATE - Cell type constants and grid management
// ============================================================================

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
// From Fortran DUNGEON source (dmain.for)
const INITIAL_GRID: number[] = [
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

// ============================================================================
// PUZZLE STATE FUNCTIONS
// ============================================================================

function createPuzzleController(world: WorldModel): IFEntity {
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

export function getPuzzleState(controller: IFEntity): RoyalPuzzleState {
  return (controller as any).puzzleState;
}

export function resetPuzzle(controller: IFEntity): void {
  const state = getPuzzleState(controller);
  state.grid = [...INITIAL_GRID];
  state.playerPos = ENTRY_POSITION;
  state.cardTaken = false;
  state.hasExited = false;
  state.inPuzzle = false;
  state.pushCount = 0;
}

function getRow(pos: number): number {
  return Math.floor(pos / 8);
}

function getCol(pos: number): number {
  return pos % 8;
}

function isValidPosition(pos: number): boolean {
  return pos >= 0 && pos < 64;
}

function crossesBoundary(pos: number, direction: keyof typeof DIRECTION_OFFSETS): boolean {
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

function canMoveCardinal(
  state: RoyalPuzzleState,
  direction: 'north' | 'south' | 'east' | 'west'
): boolean {
  if (crossesBoundary(state.playerPos, direction)) return false;

  const dest = state.playerPos + DIRECTION_OFFSETS[direction];
  if (!isValidPosition(dest)) return false;

  return state.grid[dest] === EMPTY;
}

function canMoveDiagonal(
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

export function canMove(
  state: RoyalPuzzleState,
  direction: keyof typeof DIRECTION_OFFSETS
): boolean {
  if (['north', 'south', 'east', 'west'].includes(direction)) {
    return canMoveCardinal(state, direction as 'north' | 'south' | 'east' | 'west');
  }
  return canMoveDiagonal(state, direction as 'northeast' | 'northwest' | 'southeast' | 'southwest');
}

export function executeMove(
  state: RoyalPuzzleState,
  direction: keyof typeof DIRECTION_OFFSETS
): void {
  state.playerPos = state.playerPos + DIRECTION_OFFSETS[direction];
}

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

export function canExit(state: RoyalPuzzleState): boolean {
  // Must be at entry position
  if (state.playerPos !== ENTRY_POSITION) return false;

  // Ladder must be at exit position (east of entry)
  return state.grid[LADDER_EXIT_POSITION] === LADDER;
}

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

export function takeCard(state: RoyalPuzzleState): void {
  // Find and convert the card block
  const cardIndex = state.grid.indexOf(CARD_BLOCK);
  if (cardIndex !== -1) {
    state.grid[cardIndex] = SANDSTONE;
    state.cardTaken = true;
  }
}

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

function formatDirectionList(directions: string[]): string {
  if (directions.length === 0) return 'nowhere';
  if (directions.length === 1) return directions[0];
  if (directions.length === 2) return `${directions[0]} and ${directions[1]}`;
  return directions.slice(0, -1).join(', ') + ', and ' + directions[directions.length - 1];
}

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

// ============================================================================
// ROOM CREATION
// ============================================================================

function createRoom(world: WorldModel, name: string, description: string, aliases: string[] = [], isDark: boolean = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
  room.add(new IdentityTrait({
    name,
    aliases,
    description,
    properName: true,
    article: 'the'
  }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createRoyalPuzzleRegion(world: WorldModel): RoyalPuzzleRoomIds {
  // === Create all rooms ===

  const squareRoom = createRoom(world, 'Square Room',
    'This is a small square room, with passages leading west and down.',
    ['square room', 'small square room']);

  const puzzleRoom = createRoom(world, 'Puzzle Room',
    'This is a small room with a hole in the floor. Through the hole, you can see a sandstone room below.',
    ['puzzle room', 'royal puzzle entrance', 'puzzle entrance']);

  // The puzzle room itself is always lit (like the original game)
  const roomInPuzzle = createRoom(world, 'Room in a Puzzle',
    'You are in a maze of sandstone walls.',
    ['room in puzzle', 'puzzle room', 'sandstone room'],
    false);  // lit

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

function connectRoyalPuzzleRooms(world: WorldModel, roomIds: RoyalPuzzleRoomIds): void {
  // Square Room: D → Puzzle Room
  const squareRoom = world.getEntity(roomIds.squareRoom);
  if (squareRoom) {
    setExits(squareRoom, {
      [Direction.DOWN]: roomIds.puzzleRoom
      // W → Treasure Room connected externally
    });
  }

  // Puzzle Room: U → Square Room, D → Room in a Puzzle
  const puzzleRoom = world.getEntity(roomIds.puzzleRoom);
  if (puzzleRoom) {
    setExits(puzzleRoom, {
      [Direction.UP]: roomIds.squareRoom,
      [Direction.DOWN]: roomIds.roomInPuzzle
    });
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

// ============================================================================
// EXTERNAL CONNECTOR
// ============================================================================

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

// ============================================================================
// OBJECTS
// ============================================================================

function createGoldCard(world: WorldModel): IFEntity {
  // NOTE: This "gold card" does NOT exist in 1981 MDL.
  // In MDL, the CARD is a warning note about explosives (not a treasure).
  // The treasure in the safe is the CROWN (Lord Dimwit's crown).
  // Keeping this as a non-treasure item for now.
  const card = world.createEntity('gold card', EntityType.ITEM);

  card.add(new IdentityTrait({
    name: 'gold card',
    aliases: ['card', 'royal card', 'gold', 'golden card'],
    description: 'This is an ornate gold card, beautifully embossed with the royal crest of the Great Underground Empire.',
    properName: false,
    article: 'a',
    weight: 2
  }));

  // NOT a treasure - this item doesn't exist in 1981 MDL
  // TODO: Replace with Crown treasure from MDL

  return card;
}

function createWarningNote(world: WorldModel, puzzleRoomId: string): IFEntity {
  const note = world.createEntity('warning note', EntityType.ITEM);

  note.add(new IdentityTrait({
    name: 'warning note',
    aliases: ['note', 'warning', 'small note'],
    description: 'This is a small yellowed note with faded writing.',
    properName: false,
    article: 'a',
    weight: 2
  }));

  note.add(new ReadableTrait({
    text: `Warning:

The Royal Puzzle is dangerous. Many who have entered
have never returned, trapped forever within its confines.
If you do enter, be warned: there is only one way out,
and that requires pushing the sandstone walls.

The treasure within is yours for the taking, but only
if you can find your way back.`
  }));

  // Place in Puzzle Room
  world.moveEntity(note.id, puzzleRoomId);

  return note;
}

function createRoyalPuzzleObjects(
  world: WorldModel,
  roomIds: { puzzleRoom: string; roomInPuzzle: string }
): { goldCard: IFEntity; warningNote: IFEntity } {
  const goldCard = createGoldCard(world);
  const warningNote = createWarningNote(world, roomIds.puzzleRoom);

  // Place card in the Room in a Puzzle so it's in scope for entity resolution.
  // The puzzle handler controls when it can actually be taken (only when adjacent).
  world.moveEntity(goldCard.id, roomIds.roomInPuzzle);

  return { goldCard, warningNote };
}
