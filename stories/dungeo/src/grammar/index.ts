/**
 * DUNGEO Grammar Extensions
 *
 * This module organizes all story-specific grammar patterns into logical groups.
 * Each grammar file handles patterns for a specific feature or puzzle area.
 */

import { GrammarBuilder } from '@sharpee/if-domain';
import type { Parser } from '@sharpee/parser-en-us';

// Import all grammar registration functions
import { registerGDTGrammar } from './gdt-grammar';
import { registerSpeechGrammar } from './speech-grammar';
import { registerPuzzleGrammar } from './puzzle-grammar';
import { registerRitualGrammar } from './ritual-grammar';
import { registerLiquidGrammar } from './liquid-grammar';
import { registerBoatGrammar } from './boat-grammar';
import { registerUtilityGrammar } from './utility-grammar';

// Re-export individual registration functions for selective use
export {
  registerGDTGrammar,
  registerSpeechGrammar,
  registerPuzzleGrammar,
  registerRitualGrammar,
  registerLiquidGrammar,
  registerBoatGrammar,
  registerUtilityGrammar
};

/**
 * Register all DUNGEO grammar patterns with the parser.
 *
 * This function registers prepositions and delegates to individual grammar
 * modules for pattern registration.
 *
 * @param parser - The parser instance to extend
 */
export function registerAllGrammar(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Register prepositions needed by puzzles
  parser.addPreposition('under');
  parser.addPreposition('beneath');

  // Register all grammar patterns by category
  registerGDTGrammar(grammar);
  registerSpeechGrammar(grammar);
  registerPuzzleGrammar(grammar);
  registerRitualGrammar(grammar);
  registerLiquidGrammar(grammar);
  registerBoatGrammar(grammar);
  registerUtilityGrammar(grammar);
}
