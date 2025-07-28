/**
 * Event data types for the opening action
 * 
 * These interfaces define the structure of data emitted by the opening action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.opened' event
 * 
 * Emitted when a container or door is successfully opened.
 * Contains information about what was opened and what was revealed.
 */
export interface OpenedEventData {
  /** ID of the container/door being opened */
  targetId: EntityId;
  
  /** Name of the container/door being opened */
  targetName: string;
  
  /** ID of the container/door (duplicate for backward compatibility) */
  containerId: EntityId;
  
  /** Name of the container/door (duplicate for backward compatibility) */
  containerName: string;
  
  /** Type information */
  isContainer?: boolean;
  isDoor?: boolean;
  isSupporter?: boolean;
  
  /** Contents information */
  hasContents?: boolean;
  contentsCount?: number;
  contentsIds?: EntityId[];
  
  /** Number of items revealed (for backward compatibility) */
  revealedItems?: number;
}

/**
 * Data for 'action.error' events from opening action
 */
export interface OpeningErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'      // No object specified
    | 'not_openable'   // Object can't be opened
    | 'already_open'   // Object is already open
    | 'locked'         // Object is locked
    | 'cant_reach';    // Object is out of reach
  
  /** Name of the target (when applicable) */
  item?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
