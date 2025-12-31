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

// Puzzle Take Card Blocked (Royal Puzzle - can't reach card)
export * from './puzzle-take-card-blocked';

// Puzzle Look (Royal Puzzle - dynamic room description)
export * from './puzzle-look';

// Break (Ghost ritual - breaking the empty frame)
export * from './break';

// Burn (Ghost ritual - burning incense)
export * from './burn';

// Pray (Ghost ritual - blessing the basin)
export * from './pray';

// Incant (Endgame cheat command)
export * from './incant';

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';
import { sayActions } from './say';
import { ringAction } from './ring';
import { pushWallActions } from './push-wall';
import { puzzleMoveAction } from './puzzle-move';
import { puzzleTakeCardAction } from './puzzle-take-card';
import { puzzleTakeCardBlockedAction } from './puzzle-take-card-blocked';
import { puzzleLookAction } from './puzzle-look';
import { breakAction } from './break';
import { burnAction } from './burn';
import { prayAction } from './pray';
import { incantAction } from './incant';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions,
  ...sayActions,
  ringAction,
  ...pushWallActions,
  puzzleMoveAction,
  puzzleTakeCardAction,
  puzzleTakeCardBlockedAction,
  puzzleLookAction,
  breakAction,
  burnAction,
  prayAction,
  incantAction
];
