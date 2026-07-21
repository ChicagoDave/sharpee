/**
 * @sharpee/event-processor - Event application system
 *
 * Applies semantic events to the world model through registered handlers.
 * Bridges the gap between event-generating actions and state mutations.
 */

export * from './types.js';
export * from './processor.js';
export * from './handlers/index.js';

// Effects system (ADR-075)
export * from './effects/index.js';
export * from './handler-types.js';

// Re-export commonly used types
export { ISemanticEvent } from '@sharpee/core';
export { WorldModel, WorldChange } from '@sharpee/world-model';