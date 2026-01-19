/**
 * Event Adapter - Converts between SemanticEvent and SequencedEvent
 *
 * This adapter handles:
 * - Event normalization for consistent structure
 * - Event enrichment pipeline for adding metadata
 */

import { ISemanticEvent } from '@sharpee/core';
import { SequencedEvent } from './types';

/**
 * Event normalization - ensures consistent event structure
 * Preserves all original properties (including requiresClientAction for platform events)
 */
export function normalizeEvent(event: ISemanticEvent): ISemanticEvent {
  const normalized: ISemanticEvent = {
    ...(event as any),  // Preserve all original properties (e.g., requiresClientAction)
    id: event.id || generateEventId(),
    type: event.type.toLowerCase(),
    timestamp: event.timestamp || Date.now(),
    entities: event.entities || {},
    data: event.data,
    tags: event.tags,
    priority: event.priority,
    narrate: event.narrate
  };

  return normalized;
}

/**
 * Event enrichment pipeline - adds additional metadata
 */
export function enrichEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  const enriched = { ...event };

  if (context) {
    // Add turn information to data
    if (context.turn !== undefined && enriched.data && typeof enriched.data === 'object') {
      enriched.data = { ...enriched.data, turn: context.turn };
    }

    // Add player as actor if not specified
    if (context.playerId && !enriched.entities.actor) {
      enriched.entities = { ...enriched.entities, actor: context.playerId };
    }

    // Add location if not specified
    if (context.locationId && !enriched.entities.location) {
      enriched.entities = { ...enriched.entities, location: context.locationId };
    }
  }

  // Add default tags based on event type
  if (!enriched.tags) {
    enriched.tags = [];
  }

  // Add category tags
  if (enriched.type.startsWith('action.') && !enriched.tags.includes('action')) {
    enriched.tags = [...enriched.tags, 'action'];
  } else if (enriched.type.startsWith('system.') && !enriched.tags.includes('system')) {
    enriched.tags = [...enriched.tags, 'system'];
  } else if (enriched.type.startsWith('game.') && !enriched.tags.includes('game')) {
    enriched.tags = [...enriched.tags, 'game'];
  }

  return enriched;
}

/**
 * Event processing context for enrichment
 */
export interface EventProcessingContext {
  turn?: number;
  playerId?: string;
  locationId?: string;
}

/**
 * Process an event through the pipeline.
 *
 * Pipeline stages:
 * 1. Normalization (ensure required fields, lowercase type)
 * 2. Enrichment (add turn info, default entities)
 */
export function processEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  const normalized = normalizeEvent(event);
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
  if (event.type.startsWith('platform.')) {
    return 'system';
  }
  if (event.type === 'action.error') {
    return 'turn';
  }
  return 'turn';
}

/**
 * Convert a SequencedEvent back to a SemanticEvent
 * Preserves all original properties (including requiresClientAction for platform events)
 */
export function toSemanticEvent(event: SequencedEvent): ISemanticEvent {
  return {
    ...(event as any),  // Preserve all original properties (e.g., requiresClientAction, payload)
    id: event.source || `${event.turn}-${event.sequence}`,
    type: event.type,
    timestamp: event.timestamp.getTime(),
    data: event.data,
    entities: (event as any).entities || {}
  };
}
