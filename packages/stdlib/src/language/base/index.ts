/**
 * @file Language Plugin Base Module
 * @description Exports base classes and types for IF language plugins
 * 
 * This module provides everything needed for language packages to
 * implement IF-specific language support as plugins for StdLib.
 */

// Export all types
export * from './types';

// Export base classes
export { BaseIFLanguagePlugin, messageKey, simpleMessageKey } from './if-language-plugin';
export { BaseIFParserPlugin } from './parser-plugin';

// Re-export useful enums for convenience
export { TokenType, POSType, PhraseType } from './types';
