/**
 * @file Language Plugin Base Module
 * @description Exports base classes and types for IF language plugins
 *
 * This module provides everything needed for language packages to
 * implement IF-specific language support as plugins for StdLib.
 */
export * from './types';
export { BaseIFLanguagePlugin, messageKey, simpleMessageKey } from './if-language-plugin';
export { BaseIFParserPlugin } from './parser-plugin';
export { TokenType, POSType, PhraseType } from './types';
