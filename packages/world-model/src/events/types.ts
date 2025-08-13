/**
 * Event handler types for the event system
 */

import { SemanticEvent } from '@sharpee/core';

/**
 * Game event that can be handled by entities or the story
 */
export interface GameEvent extends SemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Entity/Story event handler function signature
 * Can return void (no response) or SemanticEvents to add to the event queue
 */
export type EntityEventHandler = (event: GameEvent) => void | SemanticEvent[];

/**
 * Collection of event handlers keyed by event type
 */
export interface EventHandlers {
  [eventType: string]: EntityEventHandler;
}

/**
 * Entity with event handling capability
 */
export interface EventCapableEntity {
  /**
   * Event handlers for this entity
   * Key is the event type (e.g., 'if.event.pushed')
   * Value is the handler function
   */
  on?: EventHandlers;
}