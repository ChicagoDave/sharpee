/**
 * Event type definitions for the talking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when someone talks to an NPC
 */
export interface TalkedEventData {
  /** The target being talked to */
  target: EntityId;
  
  /** Name of the target */
  targetName: string;
  
  /** Current conversation state */
  conversationState?: string;
  
  /** Whether the NPC has topics to discuss */
  hasTopics?: boolean;
  
  /** Whether this is the first meeting */
  firstMeeting?: boolean;
}

/**
 * Error data for talking failures
 */
export interface TalkingErrorData {
  reason: 'no_target' | 'not_visible' | 'too_far' | 'not_actor' | 
          'self' | 'not_available';
  target?: string;
}

/**
 * Complete event map for talking action
 */
export interface TalkingEventMap {
  'if.event.talked': TalkedEventData;
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
