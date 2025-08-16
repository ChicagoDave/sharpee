// packages/core/src/events/event-system.ts

import { ISemanticEvent } from './types';
import { EntityId } from '../types/entity';
import { ISemanticEventSource, createSemanticEventSource } from './semantic-event-source';

/**
 * Create a new semantic event
 */
export function createEvent(
  type: string,
  payload?: Record<string, unknown>,
  entities?: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
  },
  metadata?: {
    tags?: string[];
    priority?: number;
    narrate?: boolean;
    source?: string;
    sessionId?: string;
    [key: string]: unknown;
  }
): ISemanticEvent {
  // Extract values from metadata
  const tags = metadata?.tags || [];
  const priority = metadata?.priority ?? 0;
  const narrate = metadata?.narrate ?? true;
  
  // Clean metadata for storage (remove known properties)
  const cleanMetadata = metadata ? { ...metadata } : undefined;
  if (cleanMetadata) {
    delete cleanMetadata.tags;
    delete cleanMetadata.priority;
    delete cleanMetadata.narrate;
  }
  
  const event: ISemanticEvent = {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    entities: entities || {},
    payload: payload || {},
    tags,
    priority,
    narrate
  };
  
  // Add metadata if provided (excluding extracted properties)
  if (cleanMetadata && Object.keys(cleanMetadata).length > 0) {
    (event as any).metadata = cleanMetadata;
  }
  
  // Add legacy data property for backwards compatibility
  if (payload) {
    (event as any).data = payload;
  }
  
  return event;
}

// Event source implementation moved to semantic-event-source.ts
// Re-export for backwards compatibility
export { SemanticEventSourceImpl as EventSourceImpl } from './semantic-event-source';

// Counter for ensuring unique IDs even with same timestamp
let eventCounter = 0;

/**
 * Generate a unique ID for an event
 */
function generateEventId(): string {
  // Use the expected format: evt_timestamp_random
  // Increment counter and reset if it gets too large
  eventCounter = (eventCounter + 1) % 10000;
  
  // Use both random and counter for better uniqueness
  const random = Math.floor(Math.random() * 1000);
  const unique = random + (eventCounter * 1000);
  
  return `evt_${Date.now()}_${unique}`;
}

/**
 * Create a new event source
 * @deprecated Use createSemanticEventSource from './semantic-event-source'
 */
export function createEventSource(): ISemanticEventSource {
  return createSemanticEventSource();
}
