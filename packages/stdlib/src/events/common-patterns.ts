/**
 * Common event data patterns for IF actions
 * 
 * These are optional base interfaces that actions can extend
 * if they want to follow common patterns. Actions are free
 * to define their own structures.
 */

import { EntityId } from '@sharpee/core';

/**
 * Common pattern for events that involve a target entity
 */
export interface TargetedEventData {
  targetId: EntityId;
  targetName: string;
}

/**
 * Common pattern for events that involve object manipulation
 */
export interface ObjectEventData extends TargetedEventData {
  objectId: EntityId;
  objectName: string;
}

/**
 * Common pattern for location-based events
 */
export interface LocationEventData {
  locationId: EntityId;
  locationName: string;
}

/**
 * Common pattern for events involving containers/supporters
 */
export interface ContainerContextData {
  containerId?: EntityId;
  containerName?: string;
  isContainer?: boolean;
  isSupporter?: boolean;
}

/**
 * Common pattern for movement between locations
 */
export interface MovementData {
  fromLocationId: EntityId;
  fromLocationName: string;
  toLocationId: EntityId;
  toLocationName: string;
}

/**
 * Guidelines for event data design:
 * 
 * 1. Entity references should use IDs (stable, unique)
 * 2. Include human-readable names when needed for messages
 * 3. Use consistent naming patterns:
 *    - `${entity}Id` for entity IDs
 *    - `${entity}Name` for entity names
 *    - `is${Property}` for boolean flags
 *    - `has${Property}` for existence checks
 * 4. Keep event data focused on what happened, not how to display it
 */
