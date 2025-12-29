/**
 * GDT Command Registry
 *
 * Maps two-letter command codes to their handlers.
 */

import { GDTCommandHandler, GDTCommandCode, GDTContext, GDTCommandResult } from '../types';
import { helpHandler } from './help';
import { exitHandler } from './exit';

/**
 * Registry of all GDT command handlers
 */
const handlers = new Map<GDTCommandCode, GDTCommandHandler>();

// Register Phase 1 handlers
handlers.set('HE', helpHandler);
handlers.set('EX', exitHandler);

/**
 * Get a command handler by code
 */
export function getHandler(code: GDTCommandCode): GDTCommandHandler | undefined {
  return handlers.get(code);
}

/**
 * Check if a command is implemented
 */
export function isImplemented(code: GDTCommandCode): boolean {
  return handlers.has(code);
}

/**
 * Execute a GDT command
 */
export function executeCommand(
  code: GDTCommandCode,
  context: GDTContext,
  args: string[]
): GDTCommandResult {
  const handler = handlers.get(code);

  if (!handler) {
    return {
      success: false,
      output: [`Command ${code} not yet implemented.`],
      error: 'NOT_IMPLEMENTED'
    };
  }

  return handler.execute(context, args);
}

/**
 * Get all registered handlers
 */
export function getAllHandlers(): GDTCommandHandler[] {
  return Array.from(handlers.values());
}

/**
 * Register a new command handler
 */
export function registerHandler(handler: GDTCommandHandler): void {
  handlers.set(handler.code, handler);
}

// Re-export handlers
export { helpHandler } from './help';
export { exitHandler } from './exit';
