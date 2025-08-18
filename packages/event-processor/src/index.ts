/**
 * @sharpee/event-processor - Event application system
 * 
 * Applies semantic events to the world model through registered handlers.
 * Bridges the gap between event-generating actions and state mutations.
 */

export * from './types';
export * from './processor';
export * from './handlers';

// Re-export commonly used types
export { ISemanticEvent } from '@sharpee/core';
export { WorldModel, WorldChange } from '@sharpee/world-model';