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

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';
import { sayActions } from './say';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions,
  ...sayActions
];
