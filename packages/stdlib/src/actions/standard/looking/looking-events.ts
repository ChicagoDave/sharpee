/**
 * Event type definitions for the looking action
 * @module
 */

export interface LookedEventData {
  /** ID of the actor looking */
  actorId: string;
  /** ID of the location being looked at */
  locationId: string;
  /** Name of the location for display */
  locationName: string;
  /** Whether the location is dark */
  isDark: boolean;
  /** Timestamp of when the look occurred */
  timestamp: number;
}

export interface RoomDescriptionEventData {
  /** ID of the room being described */
  roomId: string;
  /** Whether to include contents in description */
  includeContents: boolean;
  /** Whether to use verbose description */
  verbose: boolean;
  /** Timestamp of description */
  timestamp: number;
}

export interface ListContentsEventData {
  /** IDs of all visible items */
  items: string[];
  /** Names of all visible items */
  itemNames: string[];
  /** IDs of visible NPCs */
  npcs: string[];
  /** IDs of visible containers */
  containers: string[];
  /** IDs of visible supporters */
  supporters: string[];
  /** IDs of other visible items */
  other: string[];
  /** Context of the listing (e.g., 'room') */
  context: string;
  /** Timestamp of listing */
  timestamp: number;
}

export interface LookingEventMap {
  'if.event.looked': LookedEventData;
  'if.event.room.description': RoomDescriptionEventData;
  'if.event.list.contents': ListContentsEventData;
}
