/**
 * Event type definitions for the pushing action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is pushed
 */
export interface PushedEventData {
  /** The entity that was pushed */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Direction of push (optional) */
  direction?: string;
  
  /** Type of push from PushableTrait */
  pushType?: 'button' | 'heavy' | 'moveable';
  
  /** Whether the push activated something */
  activated?: boolean;
  
  /** Whether the push will toggle a switch */
  willToggle?: boolean;
  
  /** Current state of switchable */
  currentState?: boolean;
  
  /** New state after toggle */
  newState?: boolean;
  
  /** Sound made when pushed */
  sound?: string;
  
  /** Whether the object moved */
  moved?: boolean;
  
  /** Direction of movement */
  moveDirection?: string;
  
  /** Whether the object was just nudged */
  nudged?: boolean;
  
  /** Whether pushing reveals a passage */
  revealsPassage?: boolean;
  
  /** Required strength to push */
  requiresStrength?: number;
}

/**
 * Error data for pushing failures
 */
export interface PushingErrorData {
  reason: 'no_target' | 'not_visible' | 'not_reachable' | 'too_heavy' | 
          'wearing_it' | 'pushing_does_nothing' | 'fixed_in_place' | 'wont_budge';
  target?: string;
  requiresStrength?: number;
}

/**
 * Complete event map for pushing action
 */
export interface PushingEventMap {
  'if.event.pushed': PushedEventData;
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
