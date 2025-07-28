/**
 * Utilities for creating standardized event data
 * 
 * These are helpers that actions can use if they want to follow
 * common patterns, but they're entirely optional.
 */

import { IFEntity } from '@sharpee/world-model';
import { EntityId } from '@sharpee/core';

/**
 * Create standard target data from an entity
 */
export function createTargetData(entity: IFEntity) {
  return {
    targetId: entity.id,
    targetName: entity.name
  };
}

/**
 * Create standard object data from an entity
 */
export function createObjectData(entity: IFEntity) {
  return {
    targetId: entity.id,
    targetName: entity.name,
    objectId: entity.id,
    objectName: entity.name
  };
}

/**
 * Create standard container data from an entity
 */
export function createContainerData(entity: IFEntity) {
  return {
    containerId: entity.id,
    containerName: entity.name
  };
}

/**
 * Create standard location data from an entity
 */
export function createLocationData(entity: IFEntity) {
  return {
    locationId: entity.id,
    locationName: entity.name
  };
}

/**
 * Helper to convert entity array to ID array
 */
export function entitiesToIds(entities: IFEntity[]): EntityId[] {
  return entities.map(e => e.id);
}

/**
 * Helper to convert entity array to name array
 */
export function entitiesToNames(entities: IFEntity[]): string[] {
  return entities.map(e => e.name);
}

/**
 * Create movement data from two locations
 */
export function createMovementData(from: IFEntity, to: IFEntity) {
  return {
    fromLocationId: from.id,
    fromLocationName: from.name,
    toLocationId: to.id,
    toLocationName: to.name
  };
}
