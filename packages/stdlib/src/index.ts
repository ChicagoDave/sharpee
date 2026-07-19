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

export * from './actions/index.js';
// Commands are now in language-specific packages like @sharpee/lang-en-us
// Language providers are now in language-specific packages like @sharpee/lang-en-us
// Messages are handled by language providers
export * from './events/index.js';
export * from './parser/index.js';
export * from './validation/index.js';
export * from './vocabulary/index.js';
export * from './capabilities/index.js';
export * from './query-handlers/index.js';
export * from './scope/index.js';
export * from './services/index.js';
export * from './npc/index.js';
export * from './combat/index.js';
export * from './death/index.js';
export * from './chains/index.js';
export * from './inference/index.js';
export * from './utils/index.js';
export * from './channels/index.js';
