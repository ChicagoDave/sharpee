/**
 * Event type definitions for the waking action (P-15, GH #362).
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when an actor wakes (a signal, like `if.event.waited`).
 */
export interface WokenEventData {
  /** Location where the waking occurred */
  location?: EntityId;

  /** Name of the location */
  locationName?: string;
}

/**
 * Complete event map for waking action
 */
export interface WakingEventMap {
  'if.event.woken': WokenEventData;
}
