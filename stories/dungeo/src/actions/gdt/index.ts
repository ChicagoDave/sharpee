/**
 * GDT (Game Debugging Tool) Module
 *
 * Provides a debug interface for Project Dungeo, mimicking
 * the original 1981 Mainframe Zork GDT by Bob Supnik.
 *
 * Features:
 * - Two-letter command syntax (DA, DR, AH, etc.)
 * - Display commands to inspect game state
 * - Alter commands to modify game state
 * - Toggle commands for immortality and NPC control
 *
 * Usage:
 *   > gdt
 *   GDT> he
 *   GDT> ex
 */

// Types
export * from './types';
export * from './gdt-events';

// Context
export { createGDTContext, getGDTFlags, setGDTFlags, isGDTActive } from './gdt-context';

// Parser
export { parseGDTCommand, isGDTCommand, getValidCodes } from './gdt-parser';

// Commands
export { executeCommand, getHandler, registerHandler, getAllHandlers } from './commands';

// Actions
export { gdtAction } from './gdt-action';
export { gdtCommandAction } from './gdt-command-action';

// All actions for registration
import { gdtAction } from './gdt-action';
import { gdtCommandAction } from './gdt-command-action';

export const gdtActions = [gdtAction, gdtCommandAction];
