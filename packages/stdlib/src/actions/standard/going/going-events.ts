/**
 * Event data types for the going action
 * 
 * These interfaces define the structure of data emitted by the going action
 */

import { EntityId } from '@sharpee/core';

/**
 * Data for the 'if.event.actor_moved' event
 * 
 * Emitted when an actor moves from one room to another
 */
export interface ActorMovedEventData {
  /** Full actor snapshot (new atomic pattern) */
  actor?: any; // EntitySnapshot from snapshot-utils
  
  /** Full source room snapshot (new atomic pattern) */
  sourceRoom?: any; // RoomSnapshot from snapshot-utils
  
  /** Full destination room snapshot (new atomic pattern) */
  destinationRoom?: any; // RoomSnapshot from snapshot-utils
  
  /** The direction of movement (backward compatibility) */
  direction: string;
  
  /** The room the actor is leaving (backward compatibility) */
  fromRoom: EntityId;
  
  /** The room the actor is entering (backward compatibility) */
  toRoom: EntityId;
  
  /** The opposite direction (for arrival descriptions) */
  oppositeDirection: string;
  
  /** True if this is the first visit to the destination */
  firstVisit?: boolean;

  /** Map positioning hint from exit definition (ADR-113) */
  mapHint?: { dx?: number; dy?: number; dz?: number };
}

/**
 * Data for the 'if.event.actor_exited' event
 * 
 * Emitted when an actor leaves a room (for observers in the departure room)
 */
export interface ActorExitedEventData {
  /** The actor who is leaving */
  actorId: EntityId;
  
  /** The direction they went */
  direction: string;
  
  /** Where they're going */
  toRoom: EntityId;
}

/**
 * Data for the 'if.event.actor_entered' event
 * 
 * Emitted when an actor enters a room (for observers in the arrival room)
 */
export interface ActorEnteredEventData {
  /** The actor who is arriving */
  actorId: EntityId;
  
  /** The direction they came from */
  direction: string;
  
  /** Where they came from */
  fromRoom: EntityId;
}

/**
 * Data for 'action.error' events from going action
 */
export interface GoingErrorData {
  /** The specific error reason */
  reason: 
    | 'no_direction'          // No direction specified
    | 'not_in_room'          // Actor not in a room
    | 'no_exits'             // Room has no exits
    | 'no_exit_that_way'     // No exit in that direction
    | 'movement_blocked'      // Movement prevented by rule
    | 'door_closed'          // Door is closed
    | 'door_locked'          // Door is locked
    | 'destination_not_found' // Destination doesn't exist
    | 'too_dark'             // Too dark to move
    | 'need_light';          // Need a light source
  
  /** The attempted direction */
  direction?: string;
  
  /** Name of blocking door */
  door?: string;
  
  /** Door state information */
  isClosed?: boolean;
  isLocked?: boolean;
  
  /** Additional context for the error */
  details?: Record<string, any>;
}
