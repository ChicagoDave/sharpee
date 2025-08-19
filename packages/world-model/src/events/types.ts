/**
 * Event handler types for the event system
 */

import { ISemanticEvent } from '@sharpee/core';

/**
 * Game event that can be handled by entities or the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Entity/Story event handler function signature
 * Can return void (no response) or SemanticEvents to add to the event queue
 */
export type EntityEventHandler = (event: IGameEvent) => void | ISemanticEvent[];

/**
 * Collection of event handlers keyed by event type
 */
export interface IEventHandlers {
  [eventType: string]: EntityEventHandler;
}

/**
 * Entity with event handling capability
 */
export interface IEventCapableEntity {
  /**
   * Event handlers for this entity
   * Key is the event type (e.g., 'if.event.pushed')
   * Value is the handler function
   */
  on?: IEventHandlers;
}