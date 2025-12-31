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

// Puzzle Take Card (Royal Puzzle - taking the gold card)
export * from './puzzle-take-card';

// Break (Ghost ritual - breaking the empty frame)
export * from './break';

// Burn (Ghost ritual - burning incense)
export * from './burn';

// Pray (Ghost ritual - blessing the basin)
export * from './pray';

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';
import { sayActions } from './say';
import { ringAction } from './ring';
import { pushWallActions } from './push-wall';
import { puzzleMoveAction } from './puzzle-move';
import { puzzleTakeCardAction } from './puzzle-take-card';
import { breakAction } from './break';
import { burnAction } from './burn';
import { prayAction } from './pray';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions,
  ...sayActions,
  ringAction,
  ...pushWallActions,
  puzzleMoveAction,
  puzzleTakeCardAction,
  breakAction,
  burnAction,
  prayAction
];
