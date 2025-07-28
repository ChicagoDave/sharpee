/**
 * Event data types for the examining action
 * 
 * These interfaces define the structure of data emitted by the examining action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.examined' event
 * 
 * Emitted when an entity is examined. Contains comprehensive information
 * about the examined entity's traits and state.
 */
export interface ExaminedEventData {
  /** ID of the examined entity */
  targetId: EntityId;
  
  /** Name of the examined entity */
  targetName: string;
  
  /** True if examining yourself */
  self?: boolean;
  
  /** Identity trait information */
  hasDescription?: boolean;
  hasBrief?: boolean;
  
  /** Container trait information */
  isContainer?: boolean;
  hasContents?: boolean;
  contentCount?: number;
  contents?: Array<{ id: EntityId; name: string }>;
  
  /** Openable trait information */
  isOpenable?: boolean;
  isOpen?: boolean;
  
  /** Supporter trait information */
  isSupporter?: boolean;
  
  /** Switchable trait information */
  isSwitchable?: boolean;
  isOn?: boolean;
  
  /** Readable trait information */
  isReadable?: boolean;
  hasText?: boolean;
  
  /** Wearable trait information */
  isWearable?: boolean;
  isWorn?: boolean;
  
  /** Door trait information */
  isDoor?: boolean;
  
  /** Lockable trait information */
  isLockable?: boolean;
  isLocked?: boolean;
}

/**
 * Data for 'action.error' events from examining action
 */
export interface ExaminingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'     // No object specified
    | 'not_visible';  // Can't see the target
  
  /** Name of the target (when applicable) */
  target?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
