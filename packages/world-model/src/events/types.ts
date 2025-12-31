/**
 * Event handler types for the event system
 *
 * Note: ADR-075 effect-returning handlers are defined in @sharpee/event-processor.
 * This file contains basic event types used by world-model.
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Game event that can be handled by entities or the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Legacy handler signature for entity event handlers
 * These handlers directly mutate world state and return events.
 *
 * Note: For ADR-075 effect-returning handlers, use StoryEventHandler
 * from @sharpee/event-processor
 */
export type LegacyEntityEventHandler = (event: IGameEvent, world?: any) => void | ISemanticEvent[];

/**
 * Simple event handler that only receives the event (no world access)
 * Used for story-level daemons and event listeners
 */
export type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];

/**
 * Collection of event handlers keyed by event type
 */
export interface IEventHandlers {
  [eventType: string]: LegacyEntityEventHandler | LegacyEntityEventHandler[];
}

/**
 * Entity with event handling capability
 */
export interface IEventCapableEntity {
  /**
   * Event handlers for this entity
   * Key is the event type (e.g., 'if.event.pushed')
   * Value is a handler function or array of handlers
   */
  on?: IEventHandlers;
}