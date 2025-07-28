/**
 * Event type definitions for the exiting action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when an actor exits something
 */
export interface ExitedEventData {
  /** Location the actor is exiting from */
  fromLocation: EntityId;
  
  /** Location the actor is exiting to */
  toLocation: EntityId;
  
  /** Preposition used ('out of', 'off', 'from under', etc.) */
  preposition: string;
}

/**
 * Error data for exiting failures
 */
export interface ExitingErrorData {
  reason: 'already_outside' | 'container_closed' | 'cant_exit' | 'nowhere_to_go';
  container?: string;
  place?: string;
}

/**
 * Complete event map for exiting action
 */
export interface ExitingEventMap {
  'if.event.exited': ExitedEventData;
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
