/**
 * Event Adapter - Converts between SemanticEvent and SequencedEvent
 * 
 * This adapter handles:
 * - Event normalization for consistent structure
 * - Legacy event migration for backward compatibility
 * - Event enrichment pipeline for adding metadata
 */

import { ISemanticEvent } from '@sharpee/core';
import { SequencedEvent } from './types';

/**
 * Event normalization - ensures consistent event structure
 */
export function normalizeEvent(event: ISemanticEvent): ISemanticEvent {
  // Ensure event has required fields
  const normalized: ISemanticEvent = {
    id: event.id || generateEventId(),
    type: event.type,
    timestamp: event.timestamp || Date.now(),
    entities: event.entities || {},
    data: event.data,
    tags: event.tags,
    priority: event.priority,
    narrate: event.narrate
  };

  // Preserve platform event properties
  if ('requiresClientAction' in event && (event as any).requiresClientAction) {
    (normalized as any).requiresClientAction = true;
  }
  if ('payload' in event) {
    (normalized as any).payload = (event as any).payload;
  }

  // Normalize event type to lowercase with dots
  // But skip underscore replacement for platform events (they use underscores in type names)
  if (!normalized.type.startsWith('platform.')) {
    normalized.type = normalized.type.toLowerCase().replace(/_/g, '.');
  } else {
    normalized.type = normalized.type.toLowerCase();
  }

  // Ensure entities object has proper structure
  if (!normalized.entities) {
    normalized.entities = {};
  }

  return normalized;
}

/**
 * Handle legacy events that use old structure
 */
export function migrateLegacyEvent(event: any): ISemanticEvent {
  // Check if this is a legacy event (has payload instead of data)
  if ('payload' in event && !('data' in event)) {
    // Migrate payload to data
    event.data = event.payload;
    delete event.payload;
  }

  // Check if this is a legacy event with metadata
  if ('metadata' in event) {
    // Merge metadata into data if needed
    if (event.data && typeof event.data === 'object') {
      event.data = { ...event.data, ...event.metadata };
    } else {
      event.data = event.metadata;
    }
    delete event.metadata;
  }

  // Handle old entity references
  if (event.actorId && !event.entities?.actor) {
    event.entities = event.entities || {};
    event.entities.actor = event.actorId;
    delete event.actorId;
  }

  if (event.targetId && !event.entities?.target) {
    event.entities = event.entities || {};
    event.entities.target = event.targetId;
    delete event.targetId;
  }

  return event as ISemanticEvent;
}

/**
 * Event enrichment pipeline - adds additional metadata
 */
export function enrichEvent(
  event: ISemanticEvent, 
  context?: {
    turn?: number;
    playerId?: string;
    locationId?: string;
  }
): ISemanticEvent {
  const enriched = { ...event };

  // Add context information if not present
  if (context) {
    // Add turn information to data
    if (context.turn !== undefined && enriched.data && typeof enriched.data === 'object') {
      enriched.data = { ...enriched.data, turn: context.turn };
    }

    // Add player as actor if not specified
    if (context.playerId && !enriched.entities.actor) {
      enriched.entities.actor = context.playerId;
    }

    // Add location if not specified
    if (context.locationId && !enriched.entities.location) {
      enriched.entities.location = context.locationId;
    }
  }

  // Add default tags based on event type
  if (!enriched.tags) {
    enriched.tags = [];
  }

  // Add category tags
  if (enriched.type.startsWith('action.')) {
    if (!enriched.tags.includes('action')) {
      enriched.tags.push('action');
    }
  } else if (enriched.type.startsWith('system.')) {
    if (!enriched.tags.includes('system')) {
      enriched.tags.push('system');
    }
  } else if (enriched.type.startsWith('game.')) {
    if (!enriched.tags.includes('game')) {
      enriched.tags.push('game');
    }
  }

  return enriched;
}

/**
 * Process an event through the full pipeline
 */
export function processEvent(
  event: any,
  context?: {
    turn?: number;
    playerId?: string;
    locationId?: string;
  }
): ISemanticEvent {
  // Step 1: Handle legacy format
  const migrated = migrateLegacyEvent(event);
  
  // Step 2: Normalize structure
  const normalized = normalizeEvent(migrated);
  
  // Step 3: Enrich with context
  const enriched = enrichEvent(normalized, context);
  
  return enriched;
}

/**
 * Convert a SemanticEvent to a SequencedEvent
 */
export function toSequencedEvent(
  event: ISemanticEvent, 
  turn: number, 
  sequence: number
): SequencedEvent {
  // Process the event through pipeline first
  const processed = processEvent(event, { turn });

  return {
    type: processed.type,
    data: processed.data,
    sequence,
    timestamp: new Date(processed.timestamp),
    turn,
    scope: determineScope(processed),
    source: processed.id
  };
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine the scope of an event
 */
function determineScope(event: ISemanticEvent): 'turn' | 'global' | 'system' {
  // Platform events are system scope
  if (event.type.startsWith('platform.')) {
    return 'system';
  }
  
  // Error events are turn scope
  if (event.type === 'action.error') {
    return 'turn';
  }
  
  // Most events are turn scope by default
  return 'turn';
}

/**
 * Convert a SequencedEvent back to a SemanticEvent (for processing)
 * Preserves platform event properties (requiresClientAction, payload) if present
 */
export function toSemanticEvent(event: SequencedEvent): ISemanticEvent {
  const base: ISemanticEvent = {
    id: event.source || `${event.turn}-${event.sequence}`,
    type: event.type,
    timestamp: event.timestamp.getTime(),
    data: event.data,
    entities: {} // Engine should populate this based on context
  };

  // Preserve platform event properties
  if ('requiresClientAction' in event && (event as any).requiresClientAction) {
    (base as any).requiresClientAction = true;
  }
  if ('payload' in event) {
    (base as any).payload = (event as any).payload;
  }

  return base;
}