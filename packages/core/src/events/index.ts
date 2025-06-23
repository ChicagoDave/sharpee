// packages/core/src/events/index.ts

/**
 * Core event system
 * 
 * Provides a generic event bus and text processing system
 * without knowledge of specific event types
 */

export * from './types';
export * from './event-system';
export * from './text-processor';
export * from './standard-events';
// message-resolver moved to stdlib (uses GameContext)
// enhanced-text-processor moved to stdlib (uses GameContext) 
// message-builder moved to stdlib (uses GameContext)
