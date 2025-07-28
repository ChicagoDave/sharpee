/**
 * Event data types for the taking action
 * 
 * These interfaces define the structure of data emitted by the taking action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.taken' event
 * 
 * Emitted when an item is successfully taken
 */
export interface TakenEventData {
  /** The name of the item that was taken */
  item: string;
  
  /** Where the item was taken from (entity ID) */
  fromLocation?: EntityId;
  
  /** Name of container/supporter it was taken from */
  container?: string;
  
  /** True if taken from a container */
  fromContainer?: boolean;
  
  /** True if taken from a supporter */  
  fromSupporter?: boolean;
}

/**
 * Data for 'action.error' events from taking action
 * 
 * Different error reasons have different data requirements
 */
export interface TakingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'           // No object specified
    | 'cant_take_self'      // Trying to take yourself
    | 'already_have'        // Already carrying the item
    | 'cant_take_room'      // Trying to take a room
    | 'fixed_in_place'      // Item is scenery/fixed
    | 'container_full'      // Inventory is full
    | 'too_heavy'           // Item is too heavy
    | 'cant_reach';         // Item is not reachable
  
  /** Name of the item (when applicable) */
  item?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}

/**
 * Data for the 'if.event.removed' event
 * 
 * Emitted when a worn item is implicitly removed before being taken
 */
export interface RemovedEventData {
  /** Whether this removal was implicit (part of another action) */
  implicit: boolean;
  
  /** The item that was removed */
  item?: string;
}
