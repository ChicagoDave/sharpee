/**
 * Event handler types for the event system
 *
 * ADR-075: Entity handlers receive read-only WorldQuery and return Effect[]
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { WorldQuery } from './effects/world-query';
import type { Effect } from './effects/types';

/**
 * Game event that can be handled by entities or the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Entity event handler function signature (ADR-075)
 *
 * Handlers receive:
 * - event: The game event to handle
 * - query: Read-only access to world state
 *
 * Handlers return Effect[] - intents that EffectProcessor validates and applies
 */
export type EntityEventHandler = (event: IGameEvent, query: WorldQuery) => Effect[];

/**
 * Legacy handler signature for backward compatibility during migration
 * These handlers directly mutate world state (old pattern) and return events.
 * @deprecated Use EntityEventHandler with Effect[] return type
 */
export type LegacyEntityEventHandler = (event: IGameEvent, world?: any) => void | ISemanticEvent[];

/**
 * Simple event handler that only receives the event (no world access)
 * Used for story-level daemons and event listeners
 * @deprecated Use StoryEventHandler instead
 */
export type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];

/**
 * Story-level event handler (ADR-075)
 * Receives read-only WorldQuery and returns Effect[]
 */
export type StoryEventHandler = (event: IGameEvent, query: WorldQuery) => Effect[];

/**
 * Any event handler type (for migration period)
 * Supports both ADR-075 Effect-returning handlers and legacy handlers
 */
export type AnyEventHandler = EntityEventHandler | LegacyEntityEventHandler;

/**
 * Collection of event handlers keyed by event type
 * ADR-075: Supports multiple handlers per event type
 * During migration, supports both Effect-returning and legacy handlers
 */
export interface IEventHandlers {
  [eventType: string]: AnyEventHandler | AnyEventHandler[];
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
