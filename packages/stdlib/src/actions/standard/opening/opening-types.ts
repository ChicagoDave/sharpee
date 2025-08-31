/**
 * Type definitions for the opening action's shared data
 */

import { IOpenResult } from '@sharpee/world-model';

/**
 * Data shared between execute and report phases of the opening action
 */
export interface OpeningSharedData {
  /**
   * Result from the OpenableBehavior.open() call
   * Contains success status, custom messages, and other metadata
   */
  openResult?: IOpenResult;
  
  /**
   * Whether this is the first time opening this object
   * Used for special first-time reveal messages
   */
  isFirstOpen?: boolean;
  
  /**
   * Custom message to use instead of default
   * Can come from the entity's properties
   */
  customMessage?: string;
}

/**
 * Type guard to check if sharedData contains opening data
 */
export function hasOpeningData(data: Record<string, any>): data is OpeningSharedData {
  return 'openResult' in data;
}

/**
 * Helper to get typed opening data from context
 */
export function getOpeningData(context: { sharedData: Record<string, any> }): OpeningSharedData {
  return context.sharedData as OpeningSharedData;
}