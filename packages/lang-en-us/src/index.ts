/**
 * English (US) Language Package for Sharpee IF Platform
 *
 * Provides English language support including:
 * - Vocabulary (verbs, nouns, adjectives, etc.)
 * - Grammar patterns
 * - Text formatting and lemmatization
 * - Message templates
 * - Action patterns and messages
 * - NPC messages (ADR-070)
 */

export { EnglishLanguageProvider, default } from './language-provider';
export { EnglishLanguageProvider as LanguageProvider } from './language-provider'; // For convenience

// Export types that might be used by consumers
export type { VerbDefinition } from './data/verbs';

// Export grammar types and constants
export * from './grammar';

// Export action language definitions
export * from './actions';

// Export NPC language definitions (ADR-070)
export * from './npc';

// Export vocabulary data for parser use (ADR-082)
export {
  cardinalNumbers,
  ordinalNumbers,
  directionMap,
  englishWords,
  abbreviations,
  irregularPlurals
} from './data/words';
