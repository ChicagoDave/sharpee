/**
 * Event data types for the locking action
 * 
 * These interfaces define the structure of data emitted by the locking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.locked' event
 * 
 * Emitted when a container or door is successfully locked.
 * Contains information about what was locked and with which key.
 */
export interface LockedEventData {
  /** ID of the container/door being locked */
  targetId: EntityId;
  
  /** Name of the container/door being locked */
  targetName: string;
  
  /** ID of the key used (if any) */
  keyId?: EntityId;
  
  /** Name of the key used (if any) */
  keyName?: string;
  
  /** Type information */
  isContainer?: boolean;
  isDoor?: boolean;
  
  /** Sound effect (if configured) */
  sound?: string;
}

/**
 * Data for 'action.error' events from locking action
 */
export interface LockingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'        // No object specified
    | 'not_lockable'     // Object can't be locked
    | 'no_key'           // Key required but not specified
    | 'wrong_key'        // Wrong key for this lock
    | 'already_locked'   // Object is already locked
    | 'not_closed'       // Can't lock something that's open
    | 'key_not_held'     // Don't have the specified key
    | 'cant_reach';      // Object is out of reach
  
  /** Name of the target (when applicable) */
  item?: string;
  
  /** Name of the key (when applicable) */
  key?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
