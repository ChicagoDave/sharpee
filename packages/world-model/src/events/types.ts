/**
 * Event types for the world-model event system
 *
 * Entity `on` handler types were removed in ISSUE-068.
 * For ADR-075 effect-returning story handlers, use StoryEventHandler
 * from @sharpee/event-processor.
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Game event that can be handled by the story
 */
export interface IGameEvent extends ISemanticEvent {
  type: string;
  data: Record<string, any>;
}

/**
 * Simple event handler that receives an event and optionally returns reaction events.
 *
 * Used by the engine's EventEmitter for story-level daemons and event listeners.
 */
export type SimpleEventHandler = (event: IGameEvent) => void | ISemanticEvent[];
