/**
 * Event type definitions for the sleeping action
 */

import { type EntityId } from '@sharpee/core';

/**
 * Event data for when an actor sleeps (a signal, like `if.event.waited`).
 */
export interface SleptEventData {
  /** Number of turns that passed while sleeping */
  turnsPassed: number;
  
  /** Location where the sleeping occurred */
  location?: EntityId;
  
  /** Name of the location */
  locationName?: string;
}

/**
 * Complete event map for sleeping action
 */
export interface SleepingEventMap {
  'if.event.slept': SleptEventData;
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
