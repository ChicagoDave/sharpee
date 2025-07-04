/**
 * Command processor interface for the complete command pipeline
 */

import type { SemanticEvent } from '@sharpee/core';
import type { CommandError, CommandResult } from '../commands';

/**
 * Combined command processor using all three phases
 */
export interface CommandProcessor {
  /**
   * Process raw input through all phases
   * @param input Raw text input
   * @returns Generated events or appropriate error
   */
  process(input: string): Promise<CommandResult<SemanticEvent[], CommandError>>;
}
