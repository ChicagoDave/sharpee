/**
 * Command validator interface for resolving entities and checking preconditions
 */

import type { ParsedCommand, ValidatedCommand, ValidationError } from '../commands';
import type { Result } from '@sharpee/core';

/**
 * Validator interface - resolves entities and checks preconditions
 */
export interface CommandValidator {
  /**
   * Validate parsed command against world state
   * @param command Parsed command to validate
   * @returns Validated command or validation error
   */
  validate(command: ParsedCommand): Result<ValidatedCommand, ValidationError>;
}
