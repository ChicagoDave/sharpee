/**
 * Event Factory - Type-safe semantic event creation
 *
 * @see ADR-082 for design rationale
 */

import { EventDataRegistry, EventType, MessageData } from './event-registry';
import { TypedSemanticEvent } from './typed-event';
import { ISemanticEvent } from './types';

let eventCounter = 0;

/**
 * Options for creating an event.
 */
export interface CreateEventOptions {
  /**
   * Entities involved in the event.
   */
  entities?: ISemanticEvent['entities'];

  /**
   * Tags for categorizing the event.
   */
  tags?: string[];

  /**
   * Priority of the event (higher = more important).
   */
  priority?: number;

  /**
   * Whether this event should be narrated.
   */
  narrate?: boolean;

  /**
   * Custom event ID (auto-generated if not provided).
   */
  id?: string;
}

/**
 * Create a type-safe semantic event.
 *
 * The data parameter is strictly typed based on the event type,
 * providing compile-time verification of event data.
 *
 * @example
 * ```typescript
 * // TypeScript enforces correct data shape
 * const event = createTypedEvent('query.invalid', {
 *   message: 'Invalid input',
 *   hint: 'Please try again'
 * });
 *
 * // This would be a compile error:
 * // createTypedEvent('query.invalid', { wrongField: true });
 * ```
 */
export function createTypedEvent<T extends EventType>(
  type: T,
  data: EventDataRegistry[T],
  options: CreateEventOptions = {}
): TypedSemanticEvent<T> {
  return {
    id: options.id ?? `evt-${Date.now()}-${++eventCounter}`,
    type,
    timestamp: Date.now(),
    data,
    entities: options.entities ?? {},
    tags: options.tags,
    priority: options.priority,
    narrate: options.narrate
  };
}

/**
 * Message event variant types.
 */
export type MessageVariant = 'success' | 'failure' | 'info' | 'warning' | 'debug';

/**
 * Create a message event (convenience helper).
 *
 * @example
 * ```typescript
 * const event = createMessageEvent('success', 'item_taken', {
 *   item: 'brass lantern'
 * });
 * ```
 */
export function createMessageEvent(
  variant: MessageVariant,
  messageId: string,
  params?: Record<string, unknown>,
  options?: CreateEventOptions
): TypedSemanticEvent<`message.${MessageVariant}`> {
  const type = `message.${variant}` as `message.${MessageVariant}`;
  return createTypedEvent(type, { messageId, params } as MessageData, options);
}

/**
 * Create an empty event (for events with no data).
 *
 * @example
 * ```typescript
 * const event = createEmptyEvent('platform.quit_cancelled');
 * ```
 */
export function createEmptyEvent<T extends EventType>(
  type: T,
  options?: CreateEventOptions
): TypedSemanticEvent<T> {
  return createTypedEvent(type, {} as EventDataRegistry[T], options);
}

/**
 * Reset the event counter (useful for testing).
 */
export function resetEventCounter(): void {
  eventCounter = 0;
}
