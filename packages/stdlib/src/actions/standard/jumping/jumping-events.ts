/**
 * Event type definitions for the jumping action (ADR-370).
 *
 * Public interface: JumpedEventData.
 * Owner context: stdlib / standard actions / signal verbs
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when an actor jumps (a signal, like `if.event.slept`).
 */
export interface JumpedEventData {
  /** Location where the jump happened */
  location?: EntityId;

  /** Name of the location */
  locationName?: string;
}
