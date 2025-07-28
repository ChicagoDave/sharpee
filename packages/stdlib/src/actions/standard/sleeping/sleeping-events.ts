/**
 * Event type definitions for the sleeping action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when an actor sleeps
 */
export interface SleptEventData {
  /** Number of turns that passed while sleeping */
  turnsPassed: number;
  
  /** Location where the sleeping occurred */
  location?: EntityId;
  
  /** Name of the location */
  locationName?: string;
  
  /** Whether sleeping in a comfortable location */
  comfortable?: boolean;
  
  /** Whether the actor was exhausted */
  exhausted?: boolean;
  
  /** Whether the actor had nightmares */
  hadNightmares?: boolean;
  
  /** Whether sleep was restless */
  restless?: boolean;
  
  /** Whether sleep was peaceful */
  peaceful?: boolean;
}

/**
 * Error data for when sleeping fails
 */
export interface SleepingErrorData {
  reason: 'cant_sleep_here' | 'too_dangerous_to_sleep' | 'already_well_rested';
  location?: string;
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
