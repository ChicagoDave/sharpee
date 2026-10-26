/**
 * English (US) Parser for Sharpee Interactive Fiction Platform
 *
 * This package provides English-specific parsing functionality
 * for converting natural language commands into structured commands.
 */

export { EnglishParser } from './english-parser.js';
export { EnglishParser as Parser } from './english-parser.js'; // For convenience

// The English implementation of if-domain's PatternCompiler (ADR-382 D3):
// `parse` is the define(text) front end, `compile` turns parts into tokens.
export { EnglishPatternCompiler } from './english-pattern-compiler.js';

// Re-export the parser interface for type checking
export type { Parser as ParserInterface } from '@sharpee/if-domain';

// Export parse failure types for error handling
export type {
  PartialMatchFailure,
  SlotFailure,
  MatchFailureReason
} from './parse-failure.js';
export { analyzeBestFailure, bestFailure, failureOutranking } from './parse-failure.js';
export { ReadingNamer } from './reading-names.js';

// Export pronoun context types (ADR-089)
export type { EntityReference, PronounContext, RecognizedPronoun } from './pronoun-context.js';
export {
  PronounContextManager,
  getPronounContextManager,
  isRecognizedPronoun,
  RECOGNIZED_PRONOUNS,
  INANIMATE_IT,
  INANIMATE_THEM
} from './pronoun-context.js';

/**
 * Package metadata
 */
export const metadata = {
  languageCode: 'en-US',
  languageName: 'English (United States)',
  parserVersion: '1.0.0',
  supportedPatterns: [
    'VERB_ONLY',
    'VERB_NOUN',
    'VERB_PREP_NOUN',
    'VERB_NOUN_PREP_NOUN'
  ],
  features: [
    'compound-verbs',
    'articles',
    'adjectives',
    'abbreviations',
    'multi-word-nouns'
  ]
};
