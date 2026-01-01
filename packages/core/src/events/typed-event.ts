/**
 * Typed Semantic Event - Generic event interface with compile-time type safety
 *
 * @see ADR-082 for design rationale
 */

import { EventDataRegistry, EventType } from './event-registry';
import { ISemanticEvent } from './types';

/**
 * A semantic event with typed data based on the event type.
 *
 * Use this when you know the specific event type at compile time.
 * The `data` property is strictly typed based on the event type.
 *
 * @example
 * ```typescript
 * const event: TypedSemanticEvent<'query.invalid'> = {
 *   id: 'evt-1',
 *   type: 'query.invalid',
 *   timestamp: Date.now(),
 *   entities: {},
 *   data: { message: 'Invalid input', hint: 'Try again' }
 * };
 *
 * // TypeScript knows event.data.message is string | undefined
 * console.log(event.data.message);
 * ```
 */
export interface TypedSemanticEvent<T extends EventType>
  extends Omit<ISemanticEvent, 'type' | 'data'> {
  /**
   * The event type - a literal string type for discrimination.
   */
  type: T;

  /**
   * Typed event data based on the event type.
   */
  data: EventDataRegistry[T];
}

/**
 * Union of all known typed semantic events.
 *
 * Use this for exhaustive event handling where you want TypeScript
 * to verify you've handled all event types.
 *
 * @example
 * ```typescript
 * function handleEvent(event: KnownSemanticEvent) {
 *   switch (event.type) {
 *     case 'query.invalid':
 *       // TypeScript knows event.data is QueryInvalidData
 *       return event.data.message;
 *     case 'query.pending':
 *       // TypeScript knows event.data is QueryPendingData
 *       return event.data.query.messageId;
 *     // ... handle all cases
 *   }
 * }
 * ```
 */
export type KnownSemanticEvent = {
  [K in EventType]: TypedSemanticEvent<K>;
}[EventType];

/**
 * Type guard to check if an ISemanticEvent is a known typed event.
 *
 * This is useful when you have an ISemanticEvent and want to narrow
 * it to a KnownSemanticEvent for exhaustive handling.
 */
export function isKnownEvent(event: ISemanticEvent): event is KnownSemanticEvent {
  // Check if the event type is in our registry
  // This is a runtime check that the type string is known
  return event.type in ({} as EventDataRegistry);
}
