/**
 * Dungeo Story Actions
 *
 * Custom actions for Project Dungeo.
 */

// GDT (Game Debugging Tool)
export * from './gdt';

// All custom actions for registration
import { gdtActions } from './gdt';

export const customActions = [
  ...gdtActions
];
