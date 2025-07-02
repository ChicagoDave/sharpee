/**
 * Command processing error types and result types
 */

import type { SemanticEvent } from '@sharpee/core';
import type { ParseError } from './parsed-command';
import type { ValidationError, ValidatedCommand } from './validated-command';

/**
 * Errors that can occur during execution
 */
export interface ExecutionError {
  type: 'EXECUTION_ERROR';
  code: 'HANDLER_ERROR' | 'EVENT_GENERATION_FAILED' | 'STATE_CORRUPTION';
  message: string;
  validated: ValidatedCommand;
  error?: Error;
}

/**
 * Union type for all command processing errors
 */
export type CommandError = ParseError | ValidationError | ExecutionError;

/**
 * Result type for command processing phases
 */
export type CommandResult<T, E = CommandError> = 
  | { success: true; value: T }
  | { success: false; error: E };
