/**
 * Event type definitions for the waving action (ADR-370).
 *
 * Public interface: WavedEventData.
 * Owner context: stdlib / standard actions / signal verbs
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when an actor waves — a held thing, or their hands.
 */
export interface WavedEventData {
  /** The waved thing; absent when the actor waved their hands */
  target?: EntityId;

  /** Name of the waved thing */
  targetName?: string;

  /** Location where the wave happened */
  location?: EntityId;

  /** Name of the location */
  locationName?: string;
}
