/**
 * @sharpee/stdlib - Standard library for Sharpee IF Platform
 * 
 * This package provides:
 * - Standard action implementations
 * - Command pattern definitions for parsing
 * - Command syntax definitions for help
 * - Language provider interface for text generation
 * - Parser and validation components
 * - Standard capability schemas
 * 
 * All state changes go through events - no direct mutations
 */

export * from './actions';
// Commands are now in language-specific packages like @sharpee/lang-en-us
// Language providers are now in language-specific packages like @sharpee/lang-en-us
// Messages are handled by language providers
export * from './events';
export * from './parser';
export * from './validation';
export * from './vocabulary';
export * from './capabilities';
export * from './query-handlers';
export * from './scope';
export * from './services';
export * from './npc';
export * from './combat';
export * from './chains';
