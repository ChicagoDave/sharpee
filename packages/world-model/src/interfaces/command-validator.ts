/**
 * Command validator interface for resolving entities and checking preconditions
 */

import type { IParsedCommand, IValidatedCommand, IValidationError } from '../commands';
import type { Result } from '@sharpee/core';

/**
 * Validator interface - resolves entities and checks preconditions
 */
export interface ICommandValidator {
  /**
   * Validate parsed command against world state
   * @param command Parsed command to validate
   * @returns Validated command or validation error
   */
  validate(command: IParsedCommand): Result<IValidatedCommand, IValidationError>;
}
