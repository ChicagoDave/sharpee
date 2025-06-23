/**
 * Sharpee IF Parser
 * Pattern-based parser for interactive fiction commands
 */

// Core parser exports
export { IFParserImpl, createIFParser } from './if-parser';
export { EnhancedIFParser, createEnhancedIFParser } from './enhanced-if-parser';

// Grammar exports
export * from './grammar';

// Integration exports
export * from './integration';

// Type exports
export {
  IFParser,
  ParsedIFCommand,
  ResolvedIFCommand,
  ParseResult,
  ScopeContext,
  GrammarPattern,
  ScoredMatch,
  MatchType,
  DisambiguationRequest,
  IFParserConfig,
  ScoringConfig
} from './if-parser-types';

// Language support exports
export { LanguageData, createEnglishData } from './languages/language-data';
export { 
  englishData,
  lemmatize,
  normalizePhrase,
  isDirection,
  isPronoun,
  canonicalizeAction
} from './languages/en-US';

// Useful word lists
export {
  ARTICLES,
  PREPOSITIONS,
  PRONOUNS,
  CONJUNCTIONS,
  COMMON_ADJECTIVES,
  DETERMINERS
} from './languages/en-US/dictionaries';

// Configuration helper
export { createDefaultParserConfig } from './parser-config';
