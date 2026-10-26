/**
 * Event type definitions for the consulting action (ADR-372 D4).
 *
 * Public interface: ConsultedEventData.
 * Owner context: stdlib / standard actions / reference
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when a readable thing is consulted about a topic.
 */
export interface ConsultedEventData {
  /** The thing consulted */
  sourceId: EntityId;

  /** Name of the thing consulted */
  sourceName: string;

  /** The topic as typed (verbatim free text) */
  topic?: string;

  /** The entity the topic named, when it named one in scope */
  topicEntityId?: EntityId;
}
