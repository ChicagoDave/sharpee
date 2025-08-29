/**
 * Event type definitions for the entering action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when an actor enters something
 */
export interface EnteredEventData {
  /** The entity being entered */
  targetId: EntityId;
  
  /** Location the actor was in before entering */
  fromLocation?: EntityId;
  
  /** Preposition used ('in' or 'on') */
  preposition: 'in' | 'on';
}

/**
 * Error data for entering failures
 */
export interface EnteringErrorData {
  reason: 'no_target' | 'not_enterable' | 'already_inside' | 
          'container_closed' | 'too_full' | 'cant_enter';
  place?: string;
  container?: string;
  occupants?: number;
  max?: number;
}

/**
 * Complete event map for entering action
 */
export interface EnteringEventMap {
  'if.event.entered': EnteredEventData;
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
