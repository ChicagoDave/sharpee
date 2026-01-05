/**
 * Put Under Action Types (Tiny Room puzzle)
 */

export const PUT_UNDER_ACTION_ID = 'dungeo.action.put_under';

export const PutUnderMessages = {
  MAT_PLACED: 'dungeo.tiny_room.mat_placed',
  MAT_NOT_HELD: 'dungeo.tiny_room.mat_not_held',
  MAT_ALREADY_PLACED: 'dungeo.tiny_room.mat_already_placed',
  NO_DOOR_HERE: 'dungeo.tiny_room.no_door_here',
  GENERIC_FAIL: 'dungeo.put_under.generic_fail'
} as const;
