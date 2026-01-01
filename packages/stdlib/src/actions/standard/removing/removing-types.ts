/**
 * Type definitions for the removing action
 *
 * Provides type-safe access to shared data for multi-object support
 */

import { IFEntity, IRemoveItemResult, IRemoveItemFromSupporterResult, ITakeItemResult } from '@sharpee/world-model';

/**
 * Result of validating/executing a single entity in multi-object command
 */
export interface RemovingItemResult {
  entity: IFEntity;
  success: boolean;
  error?: string;  // messageId if validation failed
  errorParams?: Record<string, unknown>;
  removeResult?: IRemoveItemResult | IRemoveItemFromSupporterResult | null;
  takeResult?: ITakeItemResult;
}

/**
 * Typed shared data for removing action
 */
export interface RemovingSharedData {
  removeResult?: IRemoveItemResult | IRemoveItemFromSupporterResult | null;
  takeResult?: ITakeItemResult;

  /**
   * Multi-object support: results for each entity
   * When set, indicates this is a multi-object command
   */
  multiObjectResults?: RemovingItemResult[];
}

/**
 * Safely get typed shared data from context
 */
export function getRemovingSharedData(context: { sharedData: Record<string, any> }): RemovingSharedData {
  if (typeof context.sharedData !== 'object' || context.sharedData === null) {
    context.sharedData = {};
  }
  return context.sharedData as RemovingSharedData;
}
