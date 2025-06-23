/**
 * Actions module
 * 
 * Re-exports all action commands and executors
 */

// Export types
export * from './types';

// Export action context implementation
export * from './action-context-impl';

// Export individual actions
export * from './taking';
export * from './dropping';
export * from './examining';
export * from './looking';
export * from './going';
export * from './inventory';
export * from './opening';
export * from './closing';
export * from './unlocking';
export * from './wearing';
export * from './removing';

// Export standard actions array for compatibility
import { takingAction } from './taking';
import { droppingAction } from './dropping';
import { examiningAction } from './examining';
import { lookingAction } from './looking';
import { goingAction } from './going';
import { inventoryAction } from './inventory';
import { openingAction } from './opening';
import { closingAction } from './closing';
import { unlockingAction } from './unlocking';
import { wearingAction } from './wearing';
import { removingAction } from './removing';

// Legacy support - export as ActionDefinition array
export const standardActions: any[] = [
  // Convert executors to legacy format if needed
  // For now, just export empty array to fix compilation
  // TODO: Remove this once migration is complete
];