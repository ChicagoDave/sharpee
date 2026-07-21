/**
 * Type definitions for the putting action
 *
 * Provides type-safe access to shared data for multi-object support
 */

import { IAddItemResult, IAddItemToSupporterResult } from '@sharpee/world-model';

/**
 * Per-item mutation scratch for putting one entity. For a single-object
 * command this lives on the action's sharedData; for a multi-object
 * command each item gets its own copy via the lifecycle engine's per-item
 * `itemData` (ADR-228 D4).
 */
export interface PuttingItemScratch {
  targetPreposition?: 'in' | 'on';
  putResult?: IAddItemResult | IAddItemToSupporterResult;
}

/**
 * Typed shared data for putting action.
 * Interceptor and multi-object state live in the lifecycle engine's
 * reserved sharedData slots (ADR-228), not here.
 */
export interface PuttingSharedData extends PuttingItemScratch {}

/**
 * Safely get typed shared data from context
 */
export function getPuttingSharedData(context: { sharedData: Record<string, any> }): PuttingSharedData {
  if (typeof context.sharedData !== 'object' || context.sharedData === null) {
    context.sharedData = {};
  }
  return context.sharedData as PuttingSharedData;
}
