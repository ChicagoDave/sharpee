/**
 * Standard Interactive Fiction actions
 * 
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */

export * from './taking';
export * from './dropping';
export * from './examining';
export * from './opening';
export * from './going';
export * from './looking';
export * from './inventory';

// Import all actions for easy registration
import { takingAction } from './taking';
import { droppingAction } from './dropping';
import { examiningAction } from './examining';
import { openingAction } from './opening';
import { goingAction } from './going';
import { lookingAction } from './looking';
import { inventoryAction } from './inventory';

export const standardActions = [
  takingAction,
  droppingAction,
  examiningAction,
  openingAction,
  goingAction,
  lookingAction,
  inventoryAction
];
