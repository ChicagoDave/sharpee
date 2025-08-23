/**
 * Event data types for the dropping action
 * 
 * These interfaces define the structure of data emitted by the dropping action
 */

import { EntityId, EntitySnapshot } from '@sharpee/core';

/**
 * Data for the 'if.event.dropped' event
 * 
 * Emitted when an item is successfully dropped
 */
export interface DroppedEventData {
  /** ID of the item that was dropped */
  item: EntityId;
  
  /** Name of the item */
  itemName: string;
  
  /** Where the item was dropped (entity ID) */
  toLocation: EntityId;
  
  /** Name of the location */
  toLocationName: string;
  
  /** True if dropped in a room */
  toRoom?: boolean;
  
  /** True if dropped in a container */
  toContainer?: boolean;
  
  /** True if dropped on a supporter */
  toSupporter?: boolean;

  // Atomic event snapshots
  /** Complete snapshot of the item after dropping */
  itemSnapshot?: EntitySnapshot;
  
  /** Complete snapshot of the actor after dropping */
  actorSnapshot?: EntitySnapshot;
  
  /** Complete snapshot of the location where item was dropped */
  locationSnapshot?: EntitySnapshot;
}

/**
 * Data for 'action.error' events from dropping action
 * 
 * Different error reasons have different data requirements
 */
export interface DroppingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_target'           // No object specified
    | 'not_held'            // Not carrying the item
    | 'still_worn'          // Item is being worn
    | 'container_not_open'  // Container is closed
    | 'container_full'      // Container has no space
    | 'cant_drop_here';     // Location won't accept drops
  
  /** Name of the item (when applicable) */
  item?: string;
  
  /** Name of the container (for container-related errors) */
  container?: string;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
