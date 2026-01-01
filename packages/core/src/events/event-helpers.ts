/**
 * Event Helpers - Type-safe event consumption utilities
 *
 * These functions help consumers safely extract typed data from events
 * without resorting to `as any` casts.
 *
 * @see ADR-082 for design rationale
 */

import { EventDataRegistry, EventType } from './event-registry';
import { ISemanticEvent } from './types';

/**
 * Check if an event is of a specific type and narrow its type.
 *
 * This is a type guard that allows TypeScript to narrow the event
 * type in conditional branches.
 *
 * @example
 * ```typescript
 * function processEvent(event: ISemanticEvent) {
 *   if (isEventType(event, 'query.invalid')) {
 *     // TypeScript knows event.data is QueryInvalidData
 *     console.log(event.data.message);
 *     console.log(event.data.hint);
 *   }
 * }
 * ```
 */
export function isEventType<T extends EventType>(
  event: ISemanticEvent,
  type: T
): event is ISemanticEvent & { type: T; data: EventDataRegistry[T] } {
  return event.type === type;
}

/**
 * Check if an event type starts with a prefix.
 *
 * Useful for handling categories of events (e.g., all message.* events).
 *
 * @example
 * ```typescript
 * if (hasEventPrefix(event, 'message.')) {
 *   // Handle any message event
 * }
 * ```
 */
export function hasEventPrefix(event: ISemanticEvent, prefix: string): boolean {
  return event.type.startsWith(prefix);
}

/**
 * Get typed event data if the event matches the expected type.
 *
 * Returns undefined if the event type doesn't match. This is the safe
 * way to extract data when you're not sure of the event type.
 *
 * @example
 * ```typescript
 * const data = getEventData(event, 'quit.confirmed');
 * if (data) {
 *   console.log(`Final score: ${data.finalScore}`);
 * }
 * ```
 */
export function getEventData<T extends EventType>(
  event: ISemanticEvent,
  expectedType: T
): EventDataRegistry[T] | undefined {
  if (event.type === expectedType) {
    return event.data as EventDataRegistry[T];
  }
  return undefined;
}

/**
 * Get event data with a fallback for missing properties.
 *
 * This is useful when you need default values for optional fields.
 *
 * @example
 * ```typescript
 * const { message, hint } = getEventDataWithDefaults(
 *   event,
 *   'query.invalid',
 *   { message: 'Invalid response.', hint: undefined }
 * );
 * ```
 */
export function getEventDataWithDefaults<T extends EventType>(
  event: ISemanticEvent,
  expectedType: T,
  defaults: EventDataRegistry[T]
): EventDataRegistry[T] {
  if (event.type === expectedType && event.data) {
    return { ...defaults, ...(event.data as EventDataRegistry[T]) };
  }
  return defaults;
}

/**
 * Assert and get typed event data.
 *
 * Throws if the event type doesn't match. Use this when you're certain
 * of the event type and want a clear error if assumptions are wrong.
 *
 * @example
 * ```typescript
 * // In a handler that only receives 'quit.confirmed' events
 * const data = requireEventData(event, 'quit.confirmed');
 * console.log(`Score: ${data.finalScore}/${data.maxScore}`);
 * ```
 */
export function requireEventData<T extends EventType>(
  event: ISemanticEvent,
  expectedType: T
): EventDataRegistry[T] {
  if (event.type !== expectedType) {
    throw new Error(
      `Expected event type '${expectedType}', got '${event.type}'`
    );
  }
  return event.data as EventDataRegistry[T];
}

/**
 * Safely access a property from event data with type inference.
 *
 * Returns undefined if the event type doesn't match or the property
 * doesn't exist.
 *
 * @example
 * ```typescript
 * const message = getEventProperty(event, 'query.invalid', 'message');
 * // message is string | undefined
 * ```
 */
export function getEventProperty<
  T extends EventType,
  K extends keyof EventDataRegistry[T]
>(
  event: ISemanticEvent,
  expectedType: T,
  property: K
): EventDataRegistry[T][K] | undefined {
  if (event.type === expectedType && event.data) {
    return (event.data as EventDataRegistry[T])[property];
  }
  return undefined;
}

/**
 * Get event data as a generic record for untyped event access.
 *
 * Use this when working with events that aren't yet in the EventDataRegistry.
 * Prefer using typed helpers (isEventType, getEventData) when the event
 * type is known.
 *
 * @example
 * ```typescript
 * const data = getUntypedEventData(event);
 * if (data.customField) {
 *   console.log(data.customField);
 * }
 * ```
 */
export function getUntypedEventData(
  event: ISemanticEvent
): Record<string, unknown> {
  if (event.data && typeof event.data === 'object') {
    return event.data as Record<string, unknown>;
  }
  return {};
}
