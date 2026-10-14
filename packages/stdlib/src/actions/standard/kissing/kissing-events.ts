/**
 * Event type definitions for the kissing action (ADR-370).
 *
 * Public interface: KissedEventData.
 * Owner context: stdlib / standard actions / social
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when something is kissed.
 */
export interface KissedEventData {
  /** The kissed entity */
  target?: EntityId;

  /** Name of the kissed entity */
  targetName?: string;

  /** Whether the kissed entity is an actor (chooses the stock line) */
  isPerson: boolean;
}
