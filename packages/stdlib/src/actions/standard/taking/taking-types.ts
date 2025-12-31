/**
 * Type definitions and type guards for the taking action
 * 
 * Provides type-safe access to traits and shared data
 */

import { EntityId } from '@sharpee/core';
import { IWearableData, IFEntity } from '@sharpee/world-model';

/**
 * Type guard for wearable trait data
 * Checks for both 'worn' (internal) and 'isWorn' (accessor) properties
 */
export function isWearableTrait(trait: unknown): trait is IWearableData & { worn?: boolean } {
  if (!trait || typeof trait !== 'object') {
    return false;
  }
  
  const t = trait as any;
  // Check for either worn (internal) or isWorn (public accessor)
  return (
    ('isWorn' in t && typeof t.isWorn === 'boolean') ||
    ('worn' in t && typeof t.worn === 'boolean')
  );
}

/**
 * Type guard for container trait with capacity
 */
export interface ContainerCapacity {
  maxWeight?: number;
  maxVolume?: number;
  maxItems?: number;
}

export interface ContainerTraitData {
  capacity?: ContainerCapacity;
  isTransparent?: boolean;
  enterable?: boolean;
  allowedTypes?: string[];
  excludedTypes?: string[];
}

export function isContainerTrait(trait: unknown): trait is ContainerTraitData {
  return (
    trait !== null &&
    typeof trait === 'object' &&
    ('capacity' in trait || 'isTransparent' in trait || 'enterable' in trait)
  );
}

export function hasCapacityLimit(trait: unknown): trait is ContainerTraitData & { capacity: ContainerCapacity } {
  return (
    isContainerTrait(trait) &&
    trait.capacity !== undefined &&
    typeof trait.capacity === 'object'
  );
}

/**
 * Result of validating/executing a single entity in multi-object command
 */
export interface TakingItemResult {
  entity: IFEntity;
  success: boolean;
  error?: string;  // messageId if validation failed
  previousLocation?: EntityId;
  implicitlyRemoved?: boolean;
  wasWorn?: boolean;
}

/**
 * Typed shared data for taking action
 *
 * This interface defines all data that the taking action
 * stores in context.sharedData for communication between phases
 */
export interface TakingSharedData {
  /**
   * The location the item was in before being taken
   * Used to determine if it was in a container/supporter
   */
  previousLocation?: EntityId;

  /**
   * True if a worn item was implicitly removed before taking
   * Triggers an additional 'removed' event
   */
  implicitlyRemoved?: boolean;

  /**
   * True if the item was being worn (used with implicitlyRemoved)
   * Helps generate appropriate messages
   */
  wasWorn?: boolean;

  /**
   * For future use: track if item was locked in container
   */
  wasLocked?: boolean;

  /**
   * For future use: track if container was opened implicitly
   */
  containerOpened?: boolean;

  /**
   * Multi-object support: results for each entity
   * When set, indicates this is a multi-object command
   */
  multiObjectResults?: TakingItemResult[];
}

/**
 * Type guard to check if shared data has taking-specific fields
 */
export function isTakingSharedData(data: Record<string, any>): data is TakingSharedData {
  // We don't require all fields, just check it's an object
  // that could contain our fields
  return typeof data === 'object' && data !== null;
}

/**
 * Safely get typed shared data from context
 */
export function getTakingSharedData(context: { sharedData: Record<string, any> }): TakingSharedData {
  if (!isTakingSharedData(context.sharedData)) {
    // Initialize if needed
    context.sharedData = {};
  }
  return context.sharedData as TakingSharedData;
}

/**
 * Helper to set taking shared data with type safety
 */
export function setTakingSharedData(
  context: { sharedData: Record<string, any> },
  data: Partial<TakingSharedData>
): void {
  Object.assign(context.sharedData, data);
}