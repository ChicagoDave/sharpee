/**
 * Parser module exports
 * 
 * The parser system consists of:
 * - Vocabulary types and registry
 * - Parser interfaces and types
 * - Parser factory for language registration
 * 
 * Language-specific parsers are in separate packages:
 * - @sharpee/parser-en-us - English parser
 * - @sharpee/parser-es - Spanish parser (future)
 * - @sharpee/parser-ja - Japanese parser (future)
 */

// Types
export * from './vocabulary-types';
export * from './parser-types';
export * from './parser-internals';

// Registry
export * from './vocabulary-registry';

// Factory
export * from './parser-factory';

// Re-export commonly used items
export { vocabularyRegistry } from './vocabulary-registry';
