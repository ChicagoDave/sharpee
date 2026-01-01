/**
 * Type definitions and type guards for the dropping action
 *
 * Provides type-safe access to shared data for multi-object support
 */

import { EntityId } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';

/**
 * Result of validating/executing a single entity in multi-object command
 */
export interface DroppingItemResult {
  entity: IFEntity;
  success: boolean;
  error?: string;  // messageId if validation failed
  errorParams?: Record<string, unknown>;  // params for error message
  dropLocation?: EntityId;  // where the item was dropped to
}

/**
 * Typed shared data for dropping action
 *
 * This interface defines all data that the dropping action
 * stores in context.sharedData for communication between phases
 */
export interface DroppingSharedData {
  /**
   * Result from ActorBehavior.dropItem for single-object drops
   */
  dropResult?: {
    success: boolean;
    droppedLocation?: EntityId;
  };

  /**
   * Multi-object support: results for each entity
   * When set, indicates this is a multi-object command
   */
  multiObjectResults?: DroppingItemResult[];
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
