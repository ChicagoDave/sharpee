/**
 * Command processing error types and result types
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { IParseError } from './parsed-command';
import type { IValidationError, IValidatedCommand } from './validated-command';

/**
 * Errors that can occur during execution
 */
export interface IExecutionError {
  type: 'EXECUTION_ERROR';
  code: 'HANDLER_ERROR' | 'EVENT_GENERATION_FAILED' | 'STATE_CORRUPTION';
  message: string;
  validated: IValidatedCommand;
  error?: Error;
}

/**
 * Union type for all command processing errors
 */
export type CommandError = IParseError | IValidationError | IExecutionError;

/**
 * Result type for command processing phases
 */
export type CommandResult<T, E = CommandError> = 
  | { success: true; value: T }
  | { success: false; error: E };
