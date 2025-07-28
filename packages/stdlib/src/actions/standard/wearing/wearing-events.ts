/**
 * Event type definitions for the wearing action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is worn
 */
export interface WornEventData {
  /** The item being worn */
  itemId: EntityId;
  
  /** Body part the item is worn on */
  bodyPart?: string;
  
  /** Layer number for layered clothing */
  layer?: number;
}

/**
 * Event data for implicit taking before wearing
 */
export interface ImplicitTakenEventData {
  /** Whether this was implicit */
  implicit: boolean;
  
  /** Name of item taken */
  item: string;
}

/**
 * Error data for wearing failures
 */
export interface WearingErrorData {
  reason: 'no_target' | 'not_wearable' | 'not_held' | 'already_wearing' | 
          'cant_wear_that' | 'hands_full';
  item?: string;
}

/**
 * Complete event map for wearing action
 */
export interface WearingEventMap {
  'if.event.worn': WornEventData;
  'if.event.taken': ImplicitTakenEventData;
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
