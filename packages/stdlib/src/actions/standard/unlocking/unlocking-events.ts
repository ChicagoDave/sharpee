/**
 * Event data types for the unlocking action
 * 
 * These interfaces define the structure of data emitted by the unlocking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.unlocked' event
 * 
 * Emitted when a container or door is successfully unlocked.
 * Contains information about what was unlocked and with which key.
 */
export interface UnlockedEventData {
  /** ID of the container/door being unlocked */
  targetId: EntityId;
  
  /** Name of the container/door being unlocked */
  targetName: string;
  
  /** ID of the container/door (duplicate for backward compatibility) */
  containerId: EntityId;
  
  /** Name of the container/door (duplicate for backward compatibility) */
  containerName: string;
  
  /** Type information */
  isContainer?: boolean;
  isDoor?: boolean;
  
  /** Key information */
  keyId?: EntityId;
  keyName?: string;
  requiresKey?: boolean;
  
  /** State after unlocking */
  hasContents?: boolean;
  contentsCount?: number;
  contentsIds?: EntityId[];
  
  /** Effects */
  sound?: string;
  willAutoOpen?: boolean;
}

/**
 * Data for 'action.error' events from unlocking action
 */
export interface UnlockingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'          // No object specified
    | 'not_lockable'       // Object can't be locked/unlocked
    | 'no_key'             // Key required but not specified
    | 'wrong_key'          // Wrong key for this lock
    | 'already_unlocked'   // Object is already unlocked
    | 'key_not_held'       // Don't have the specified key
    | 'still_locked'       // Failed to unlock (generic)
    | 'cant_reach';        // Object is out of reach
  
  /** Name of the target (when applicable) */
  item?: string;
  
  /** Name of the key (when applicable) */
  key?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
