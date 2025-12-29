/**
 * Dungeo Story Actions
 *
 * Custom actions for Project Dungeo.
 */

// GDT (Game Debugging Tool)
export * from './gdt';

// Walk Through (Bank of Zork puzzle)
export * from './walk-through';

// All custom actions for registration
import { gdtActions } from './gdt';
import { walkThroughActions } from './walk-through';

export const customActions = [
  ...gdtActions,
  ...walkThroughActions
];
