/**
 * Event data types for the opening action
 * 
 * These interfaces define the structure of data emitted by the opening action.
 * Following atomic event principles - each event represents one discrete fact.
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.opened' event
 * 
 * Emitted when a container or door is successfully opened.
 * This is the atomic fact of the state change from closed to open.
 */
export interface OpenedEventData {
  /** ID of the entity that was opened */
  targetId: EntityId;
  
  /** Name of the entity that was opened */
  targetName: string;
}

/**
 * Data for the 'if.event.revealed' event
 * 
 * Emitted for each item that becomes accessible when a container is opened.
 * One event per item to maintain atomicity.
 */
export interface RevealedEventData {
  /** ID of the item that was revealed */
  itemId: EntityId;
  
  /** Name of the item that was revealed */
  itemName: string;
  
  /** ID of the container that was opened to reveal this item */
  containerId: EntityId;
  
  /** Name of the container (for context) */
  containerName: string;
}

/**
 * Data for the 'if.event.exit_revealed' event
 * 
 * Emitted when opening a door reveals a new exit/passage.
 */
export interface ExitRevealedEventData {
  /** The direction of the revealed exit */
  direction: string;
  
  /** ID of the room the exit leads from */
  fromRoomId: EntityId;
  
  /** ID of the room the exit leads to */
  toRoomId: EntityId;
  
  /** ID of the door that was opened */
  doorId: EntityId;
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
