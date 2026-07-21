/**
 * Type definitions for the removing action
 *
 * Provides type-safe access to shared data for multi-object support
 */

import { IRemoveItemResult, IRemoveItemFromSupporterResult, ITakeItemResult } from '@sharpee/world-model';

/**
 * Per-item mutation scratch for removing one entity. For a single-object
 * command this lives on the action's sharedData; for a multi-object
 * command each item gets its own copy via the lifecycle engine's per-item
 * `itemData` (ADR-228 D4).
 */
export interface RemovingItemScratch {
  removeResult?: IRemoveItemResult | IRemoveItemFromSupporterResult | null;
  takeResult?: ITakeItemResult;
}

/**
 * Typed shared data for removing action.
 * Interceptor and multi-object state live in the lifecycle engine's
 * reserved sharedData slots (ADR-228), not here.
 */
export interface RemovingSharedData extends RemovingItemScratch {}

/**
 * Safely get typed shared data from context
 */
export function getRemovingSharedData(context: { sharedData: Record<string, any> }): RemovingSharedData {
  if (typeof context.sharedData !== 'object' || context.sharedData === null) {
    context.sharedData = {};
  }
  return context.sharedData as RemovingSharedData;
}
