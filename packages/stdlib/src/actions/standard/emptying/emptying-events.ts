/**
 * Event type definitions for the emptying action (ADR-370 D6).
 *
 * Public interface: EmptiedEventData.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when a container is emptied.
 */
export interface EmptiedEventData {
  /** The emptied container */
  source: EntityId;

  /** Name of the emptied container */
  sourceName: string;

  /** Where the contents went: a container, a supporter, or the actor's location */
  destination: EntityId;

  /** Name of the destination */
  destinationName: string;

  /** True when the destination is the actor's location (bare `empty x`) */
  ontoFloor: boolean;

  /** Items moved, in listing order */
  movedIds: EntityId[];

  /** Items left in the source because the destination stopped accepting */
  unmovedIds: EntityId[];
}
