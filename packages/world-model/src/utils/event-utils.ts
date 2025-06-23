/**
 * Event creation utilities for world-model
 * 
 * Provides helpers for creating properly-formed SemanticEvents
 */

import { SemanticEvent, createEvent as coreCreateEvent } from '@sharpee/core';
import { EntityId } from '@sharpee/core';

/**
 * Create a semantic event with world-model specific defaults
 * 
 * This wraps the core createEvent to provide consistent event creation
 * across all world-model behaviors.
 */
export function createWorldEvent(
  type: string,
  payload?: Record<string, unknown>,
  entities?: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
    others?: EntityId[];
  }
): SemanticEvent {
  return coreCreateEvent(type, payload, entities);
}

/**
 * Create an action failed event
 */
export function createActionFailedEvent(
  action: string,
  reason: string,
  entities: {
    actor?: EntityId;
    target?: EntityId;
    instrument?: EntityId;
    location?: EntityId;
  },
  customMessage?: string
): SemanticEvent {
  const payload: Record<string, unknown> = {
    action,
    reason
  };
  
  if (customMessage) {
    payload.customMessage = customMessage;
  }
  
  return createWorldEvent('action_failed', payload, entities);
}
