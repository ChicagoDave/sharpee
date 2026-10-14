/**
 * Event type definitions for the asking-for action (ADR-372 D3).
 *
 * Public interface: AskedForEventData.
 * Owner context: stdlib / standard actions / social
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when a person is asked for a thing.
 */
export interface AskedForEventData {
  /** The person asked */
  recipientId: EntityId;

  /** Name of the person asked */
  recipientName: string;

  /** The thing asked for */
  itemId: EntityId;

  /** Name of the thing asked for */
  itemName: string;
}
