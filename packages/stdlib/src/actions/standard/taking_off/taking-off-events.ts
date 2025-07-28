/**
 * Event type definitions for the taking off action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is removed (taken off)
 */
export interface RemovedEventData {
  /** The item being removed */
  itemId: EntityId;
  
  /** Body part the item was worn on */
  bodyPart?: string;
  
  /** Layer number for layered clothing */
  layer?: number;
}

/**
 * Error data for taking off failures
 */
export interface TakingOffErrorData {
  reason: 'no_target' | 'not_wearing' | 'cant_remove' | 'prevents_removal';
  item?: string;
  blocking?: string;
}

/**
 * Complete event map for taking off action
 */
export interface TakingOffEventMap {
  'if.event.removed': RemovedEventData;
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
