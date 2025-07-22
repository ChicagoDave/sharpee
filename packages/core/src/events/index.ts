// packages/core/src/events/index.ts

/**
 * Core event system
 * 
 * Provides a generic event bus and text processing system
 * without knowledge of specific event types
 */

// Export types first
export * from './types';
export * from './standard-events';
export * from './system-event';
export * from './platform-events';

// Export event sources with specific names to avoid conflicts
export {
  GenericEventSource,
  SimpleEventSource,
  createEventSource as createGenericEventSource
} from './event-source';

export {
  SemanticEventSource,
  SemanticEventSourceImpl,
  createSemanticEventSource
} from './semantic-event-source';

// Export from event-system
export {
  createEvent,
  EventSourceImpl,
  createEventSource
} from './event-system';
// message-resolver moved to stdlib (uses GameContext)
// enhanced-text-processor moved to stdlib (uses GameContext) 
// message-builder moved to stdlib (uses GameContext)
