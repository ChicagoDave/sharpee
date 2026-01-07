/**
 * Push Key Action Types (Tiny Room puzzle)
 */

export const PUSH_KEY_ACTION_ID = 'dungeo.action.push_key';

export const PushKeyMessages = {
  KEY_PUSHED: 'dungeo.tiny_room.key_pushed',
  KEY_PUSHED_NO_MAT: 'dungeo.tiny_room.key_pushed_no_mat',
  KEY_ALREADY_PUSHED: 'dungeo.tiny_room.key_already_pushed',
  NO_SCREWDRIVER: 'dungeo.tiny_room.no_screwdriver',
  NO_DOOR_HERE: 'dungeo.tiny_room.no_door_here'
} as const;
