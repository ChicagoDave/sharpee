/**
 * Event type definitions for the listening action
 */

import { EntityId } from '@sharpee/core';

/**
 * Event data for when something is listened to
 */
export interface ListenedEventData {
  /** The entity that was listened to (optional) */
  target?: EntityId;
  
  /** Whether listening to the general environment */
  listeningToEnvironment?: boolean;
  
  /** Room ID when listening to environment */
  roomId?: EntityId;
  
  /** Whether the target has sound */
  hasSound?: boolean;
  
  /** Type of sound detected */
  soundType?: 'device' | 'container' | 'liquid' | 'ambient';
  
  /** IDs of sound sources in the environment */
  soundSources?: EntityId[];
  
  /** Whether target has contents (for containers) */
  hasContents?: boolean;
  
  /** Number of items in container */
  contentCount?: number;
}

/**
 * Error data for listening failures
 */
export interface ListeningErrorData {
  reason: 'not_visible';
  target?: string;
}

/**
 * Complete event map for listening action
 */
export interface ListeningEventMap {
  'if.event.listened': ListenedEventData;
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
