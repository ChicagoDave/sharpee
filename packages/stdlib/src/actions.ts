/**
 * Actions module - exports all standard IF actions
 * 
 * This module exports both command definitions and action executors
 * for all standard Interactive Fiction actions.
 */

// Import all actions
import { closingCommand, closingAction } from './actions/closing';
import { droppingCommand, droppingAction } from './actions/dropping';
import { examiningCommand, examiningAction } from './actions/examining';
import { goingCommand, goingAction } from './actions/going';
import { inventoryCommand, inventoryAction } from './actions/inventory';
import { lookingCommand, lookingAction } from './actions/looking';
import { openingCommand, openingAction } from './actions/opening';
import { removingCommand, removingAction } from './actions/removing';
import { takingCommand, takingAction } from './actions/taking';
import { unlockingCommand, unlockingAction } from './actions/unlocking';
import { wearingCommand, wearingAction } from './actions/wearing';

// Export all command definitions
export const standardCommands = [
  closingCommand,
  droppingCommand,
  examiningCommand,
  goingCommand,
  inventoryCommand,
  lookingCommand,
  openingCommand,
  removingCommand,
  takingCommand,
  unlockingCommand,
  wearingCommand
];

// Export all action executors
export const standardActions = [
  closingAction,
  droppingAction,
  examiningAction,
  goingAction,
  inventoryAction,
  lookingAction,
  openingAction,
  removingAction,
  takingAction,
  unlockingAction,
  wearingAction
];

// Re-export individual modules for direct access
export * from './actions/closing';
export * from './actions/dropping';
export * from './actions/examining';
export * from './actions/going';
export * from './actions/inventory';
export * from './actions/looking';
export * from './actions/opening';
export * from './actions/removing';
export * from './actions/taking';
export * from './actions/unlocking';
export * from './actions/wearing';

// Export types
export * from './actions/types';
