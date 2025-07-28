/**
 * Event type definitions for the waiting action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when an actor waits
 */
export interface WaitedEventData {
  /** Number of turns that passed while waiting */
  turnsPassed: number;
  
  /** Location where the waiting occurred */
  location?: EntityId;
  
  /** Name of the location */
  locationName?: string;
  
  /** Number of consecutive waits */
  waitCount?: number;
  
  /** ID of any pending timed event */
  pendingEvent?: string;
}

/**
 * Complete event map for waiting action
 */
export interface WaitingEventMap {
  'if.event.waited': WaitedEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
