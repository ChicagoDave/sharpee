// packages/core/src/events/index.ts

/**
 * Core event system
 *
 * Provides a generic event bus and text processing system
 * without knowledge of specific event types
 */

// Export types first
export * from './types.js';
export * from './standard-events.js';
export * from './system-event.js';
export * from './platform-events.js';
export * from './game-events.js';

// Export typed event system (ADR-082)
export * from './event-registry.js';
export * from './typed-event.js';
export * from './event-factory.js';
export * from './event-helpers.js';

// Export event sources with specific names to avoid conflicts
export {
  IGenericEventSource,
  SimpleEventSource,
  createEventSource as createGenericEventSource
} from './event-source.js';

export {
  ISemanticEventSource,
  SemanticEventSourceImpl,
  createSemanticEventSource
} from './semantic-event-source.js';

// Export from event-system
export {
  createEvent,
  EventSourceImpl,
  createEventSource
} from './event-system.js';

// message-resolver moved to stdlib (uses GameContext)
// enhanced-text-processor moved to stdlib (uses GameContext) 
// message-builder moved to stdlib (uses GameContext)
