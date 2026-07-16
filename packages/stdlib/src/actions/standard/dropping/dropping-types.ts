/**
 * Type definitions and type guards for the dropping action
 *
 * Provides type-safe access to shared data for multi-object support
 */

import { EntityId } from '@sharpee/core';

/**
 * Per-item mutation scratch for dropping one entity. For a single-object
 * command this lives on the action's sharedData; for a multi-object
 * command each item gets its own copy via the lifecycle engine's per-item
 * `itemData` (ADR-228 D4).
 */
export interface DroppingItemScratch {
  /** Where the item was dropped to */
  dropLocation?: EntityId;
}

/**
 * Typed shared data for dropping action
 *
 * This interface defines all data that the dropping action
 * stores in context.sharedData for communication between phases.
 * Interceptor and multi-object state live in the lifecycle engine's
 * reserved sharedData slots (ADR-228), not here.
 */
export interface DroppingSharedData extends DroppingItemScratch {
  /**
   * Result from ActorBehavior.dropItem for single-object drops
   */
  dropResult?: {
    success: boolean;
    droppedLocation?: EntityId;
  };
}

/**
 * Type guard to check if shared data has dropping-specific fields
 */
export function isDroppingSharedData(data: Record<string, any>): data is DroppingSharedData {
  return typeof data === 'object' && data !== null;
}

/**
 * Safely get typed shared data from context
 */
export function getDroppingSharedData(context: { sharedData: Record<string, any> }): DroppingSharedData {
  if (!isDroppingSharedData(context.sharedData)) {
    context.sharedData = {};
  }
  return context.sharedData as DroppingSharedData;
}
