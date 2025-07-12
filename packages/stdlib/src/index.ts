/**
 * @sharpee/stdlib - Standard library for Sharpee IF Platform
 * 
 * This package provides:
 * - Standard action implementations
 * - Command pattern definitions for parsing
 * - Command syntax definitions for help
 * - Language provider interface for text generation
 * - Parser and validation components
 * 
 * All state changes go through events - no direct mutations
 */

export * from './actions';
export * from './commands';
export * from './language';
// Messages are handled by language providers - see language/if-language-provider.ts
// Events use the core event system from @sharpee/core
export * from './parser';
export * from './validation';
export * from './vocabulary';
