/**
 * Event type definitions for the climbing action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when an actor climbs
 */
export interface ClimbedEventData {
  /** Direction of climbing (up/down) if directional */
  direction?: string;
  
  /** Target object being climbed if object climbing */
  targetId?: EntityId;
  
  /** Method of climbing ('directional' or 'onto') */
  method: 'directional' | 'onto';
  
  /** Destination room ID if directional climbing */
  destinationId?: EntityId;
}

/**
 * Error data for climbing failures
 */
export interface ClimbingErrorData {
  reason: 'no_target' | 'not_climbable' | 'cant_go_that_way' | 
          'already_there' | 'too_high' | 'too_dangerous';
  object?: string;
  direction?: string;
  place?: string;
}

/**
 * Complete event map for climbing action
 */
export interface ClimbingEventMap {
  'if.event.climbed': ClimbedEventData;
  'if.event.moved': {
    direction: string;
    fromRoom: EntityId;
    toRoom: EntityId;
    method: string;
  };
  'if.event.entered': {
    targetId: EntityId;
    method: string;
    preposition: string;
  };
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
