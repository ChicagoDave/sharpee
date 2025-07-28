/**
 * Event type definitions for the searching action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is searched
 */
export interface SearchedEventData {
  /** The entity that was searched */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** IDs of items found (including concealed) */
  foundItems: EntityId[];
  
  /** Names of items found */
  foundItemNames: string[];
  
  /** Whether searching the current location (no target specified) */
  searchingLocation?: boolean;
}

/**
 * Error data for searching failures
 */
export interface SearchingErrorData {
  reason: 'not_visible' | 'not_reachable' | 'container_closed';
  target?: string;
}

/**
 * Complete event map for searching action
 */
export interface SearchingEventMap {
  'if.event.searched': SearchedEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
  'action.error': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
