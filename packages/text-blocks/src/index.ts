/**
 * @sharpee/text-blocks
 *
 * Pure interfaces for structured text output in Sharpee IF platform.
 *
 * This package contains only TypeScript interfaces and type guards -
 * no runtime dependencies. It defines the contract between TextService
 * and clients (CLI, React, etc.).
 *
 * @packageDocumentation
 * @see ADR-096: Text Service Architecture
 * @see ADR-091: Text Decorations
 */

// Core types
export type { TextContent, IDecoration, ITextBlock } from './types.js';

// Constants
export { CORE_DECORATION_TYPES, CORE_BLOCK_KEYS } from './types.js';

// Alias for text-service compatibility
export { CORE_BLOCK_KEYS as BLOCK_KEYS } from './types.js';

// Type guards and utilities
export {
  isDecoration,
  isTextBlock,
  hasKeyPrefix,
  isStatusBlock,
  isRoomBlock,
  isActionBlock,
  extractPlainText,
} from './guards.js';

// Block key prefixes for routing
export const BLOCK_KEY_PREFIXES = {
  STATUS: 'status.',
  ROOM: 'room.',
  ACTION: 'action.',
} as const;
