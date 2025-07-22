/**
 * Parser module exports
 * 
 * Parser contracts have been moved to @sharpee/if-domain.
 * This module now only re-exports from if-domain for backward compatibility.
 */

// Re-export parser and vocabulary contracts from if-domain
export {
  // Parser contracts
  Parser,
  ParserOptions,
  ParserFactory,
  BaseParser,
  Token,
  TokenCandidate,
  
  // Parser internals (for compatibility)
  CandidateCommand,
  InternalParseResult,
  ParseError,
  ParseErrorType,
  
  // Vocabulary contracts
  VocabularyEntry,
  PartOfSpeech,
  VocabularyProvider,
  VocabularyRegistry,
  vocabularyRegistry,
  VerbVocabulary,
  DirectionVocabulary,
  SpecialVocabulary,
  EntityVocabulary,
  VocabularySet,
  GrammarPattern,
  GrammarPatterns,
  GrammarPatternName,
  
  // Vocabulary adapters
  adaptVerbVocabulary,
  adaptDirectionVocabulary,
  adaptSpecialVocabulary
} from '@sharpee/if-domain';
