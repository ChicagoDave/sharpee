/**
 * English (US) Language Package for Sharpee IF Platform
 * 
 * Provides English language support including:
 * - Vocabulary (verbs, nouns, adjectives, etc.)
 * - Grammar patterns
 * - Text formatting and lemmatization
 * - Message templates
 * - Action patterns and messages
 */

export { EnglishLanguageProvider, default } from './language-provider';

// Export types that might be used by consumers
export type { VerbDefinition } from './data/verbs';

// Export grammar types and constants
export * from './grammar';

// Export action language definitions
export * from './actions';
