/**
 * Parser interface for converting text input to parsed commands
 */

import type { IParsedCommand, IParseError, CommandResult } from '../commands';

/**
 * Parser interface - pure syntax, no world knowledge
 */
export interface IParser {
  /**
   * Parse input text into structured command
   * @param input Raw text input
   * @returns Parsed command or parse error
   */
  parse(input: string): CommandResult<IParsedCommand, IParseError>;
}
