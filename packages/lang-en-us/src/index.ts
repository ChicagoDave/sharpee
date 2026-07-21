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

export { EnglishLanguageProvider, default } from './language-provider.js';
export { EnglishLanguageProvider as LanguageProvider } from './language-provider.js'; // For convenience

// Export types that might be used by consumers
export type { VerbDefinition } from './data/verbs.js';
// The declared-verb contract, consumed by the ADR-230 D4 verb-reachability gate.
export { englishVerbs } from './data/verbs.js';

// Export grammar types and constants
export * from './grammar.js';

// Export action language definitions
export * from './actions/index.js';

// Export NPC language definitions (ADR-070)
export * from './npc/index.js';

// Export perspective placeholder resolution (ADR-089)
export * from './perspective/index.js';

// Export formatter system (ADR-095)

// Export the English Assembler — phrase-tree realization (ADR-192)
export * from './assembler/index.js';

// Export the phrase-template parser (ADR-192)
export * from './parser/index.js';

// English grammar helpers (ADR-190): pluralization + count-word spelling
export { pluralize } from './pluralize.js';
export { countWord } from './number-words.js';

// Export vocabulary data for parser use (ADR-082)
export {
  cardinalNumbers,
  ordinalNumbers,
  directionMap,
  englishWords,
  abbreviations,
  irregularPlurals
} from './data/words.js';

// Export parser error messages (Phase 1.2 recommendations)
export { parserErrors, getParserErrorMessage } from './data/messages.js';

// Export spatial sound prose defaults (ADR-172)
export {
  soundMessages,
  soundMessageId,
  soundFallbackMessageId,
  type SoundMessageId,
  type RenderableAudibilityTier,
} from './sound-messages.js';
