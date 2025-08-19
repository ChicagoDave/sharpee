/**
 * Event Adapter - Converts between SemanticEvent and SequencedEvent
 */

import { ISemanticEvent } from '@sharpee/core';
import { SequencedEvent } from './types';

/**
 * Convert a SemanticEvent to a SequencedEvent
 */
export function toSequencedEvent(
  event: ISemanticEvent, 
  turn: number, 
  sequence: number
): SequencedEvent {
  return {
    type: event.type,
    data: event.data,
    metadata: event.metadata,
    sequence,
    timestamp: new Date(event.timestamp),
    turn,
    scope: determineScope(event),
    source: event.id
  };
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
 */
export function toSemanticEvent(event: SequencedEvent): ISemanticEvent {
  return {
    id: event.source || `${event.turn}-${event.sequence}`,
    type: event.type,
    timestamp: event.timestamp.getTime(),
    data: event.data,
    metadata: event.metadata,
    entities: {} // Engine should populate this based on context
  };
}