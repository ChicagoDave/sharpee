/**
 * Command executor interface for executing validated commands
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { IValidatedCommand, IExecutionError, CommandResult } from '../commands';

/**
 * Executor interface - applies business logic
 */
export interface ICommandExecutor {
  /**
   * Execute validated command
   * @param command Validated command to execute
   * @returns Generated events or execution error
   */
  execute(command: IValidatedCommand): CommandResult<ISemanticEvent[], IExecutionError>;
}
