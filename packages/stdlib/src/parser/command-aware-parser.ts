/**
 * Command-Aware Parser
 * 
 * Parser adapter that uses command definitions from the command registry
 * to configure the grammar-based parser.
 */

import { IFParser, IFParserConfig } from './if-parser-types';
import { createEnhancedIFParser } from './enhanced-if-parser';
import { LanguageData } from './languages/language-data';
import { CommandRegistry, commandToGrammarPattern } from '../commands/command-registry';
import { GrammarPattern } from './grammar';

/**
 * Create a parser that uses command definitions
 */
export function createCommandAwareParser(
  config: IFParserConfig,
  languageData: LanguageData,
  commandRegistry: CommandRegistry
): IFParser {
  // Create the base enhanced parser
  const parser = createEnhancedIFParser(config, languageData);
  
  // Add grammar patterns from registered commands
  const commands = commandRegistry.getAllCommands();
  for (const command of commands) {
    const pattern = commandToGrammarPattern(command) as GrammarPattern;
    parser.addGrammar(pattern);
  }
  
  return parser;
}

/**
 * Update parser with new commands
 * 
 * This can be called when new commands are registered dynamically
 */
export function updateParserCommands(
  parser: IFParser,
  commandRegistry: CommandRegistry
): void {
  // Get current patterns to avoid duplicates
  const existingPatterns = parser.getGrammarPatterns();
  const existingActions = new Set(existingPatterns.map(p => p.action));
  
  // Add new patterns
  const commands = commandRegistry.getAllCommands();
  for (const command of commands) {
    if (!existingActions.has(command.mapsToAction)) {
      const pattern = commandToGrammarPattern(command) as GrammarPattern;
      parser.addGrammar(pattern);
    }
  }
}