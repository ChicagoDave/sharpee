/**
 * Event handler types for the event system
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '../world';

/**
 * Game event that can be handled by entities or the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Entity event handler function signature
 * Receives the event and the world model for state access
 * Can return void (no response) or SemanticEvents to add to the event queue
 */
export type EntityEventHandler = (event: IGameEvent, world: WorldModel) => void | ISemanticEvent[];

/**
 * Simple event handler that only receives the event (no world access)
 * Used for story-level daemons and event listeners
 */
export type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];

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