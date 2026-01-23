/**
 * Room Info Action Types
 *
 * Message IDs and action constants for ROOM, RNAME, and OBJECTS commands.
 */

export const ROOM_ACTION_ID = 'dungeo.action.room';
export const RNAME_ACTION_ID = 'dungeo.action.rname';
export const OBJECTS_ACTION_ID = 'dungeo.action.objects';

export const RoomInfoMessages = {
  NO_OBJECTS: 'dungeo.room_info.no_objects',
} as const;
