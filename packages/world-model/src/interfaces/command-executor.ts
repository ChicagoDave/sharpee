/**
 * Command executor interface for executing validated commands
 */

import type { SemanticEvent } from '@sharpee/core';
import type { ValidatedCommand, ExecutionError, CommandResult } from '../commands';

/**
 * Executor interface - applies business logic
 */
export interface CommandExecutor {
  /**
   * Execute validated command
   * @param command Validated command to execute
   * @returns Generated events or execution error
   */
  execute(command: ValidatedCommand): CommandResult<SemanticEvent[], ExecutionError>;
}
