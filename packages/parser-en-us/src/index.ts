/**
 * English (US) Parser for Sharpee Interactive Fiction Platform
 * 
 * This package provides English-specific parsing functionality
 * for converting natural language commands into structured commands.
 */

export { EnglishParser } from './english-parser';
export { EnglishParser as Parser } from './english-parser'; // For convenience

// Re-export the parser interface for type checking
export type { Parser as ParserInterface } from '@sharpee/if-domain';

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
    'VERB_NOUN_PREP_NOUN',
    'DIRECTION_ONLY'
  ],
  features: [
    'compound-verbs',
    'articles',
    'adjectives',
    'abbreviations',
    'multi-word-nouns'
  ]
};
