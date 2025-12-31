/**
 * Dungeo Story Actions
 *
 * Custom actions for Project Dungeo.
 */

// GDT (Game Debugging Tool)
export * from './gdt';

// Walk Through (Bank of Zork puzzle)
export * from './walk-through';

// Say (Cyclops puzzle and general speech)
export * from './say';

// Ring (Exorcism bell)
export * from './ring';

// Push Wall (Royal Puzzle)
export * from './push-wall';

// Puzzle Move (Royal Puzzle - movement inside the grid)
export * from './puzzle-move';

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';
import { sayActions } from './say';
import { ringAction } from './ring';
import { pushWallActions } from './push-wall';
import { puzzleMoveAction } from './puzzle-move';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions,
  ...sayActions,
  ringAction,
  ...pushWallActions,
  puzzleMoveAction
];
