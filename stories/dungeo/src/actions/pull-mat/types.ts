/**
 * Pull Mat Action Types
 *
 * Handles pulling the mat from under the door (gets key if present)
 */

export const PULL_MAT_ACTION_ID = 'dungeo.action.pull_mat';

export const PullMatMessages = {
  MAT_PULLED: 'dungeo.tiny_room.mat_pulled',
  MAT_PULLED_WITH_KEY: 'dungeo.tiny_room.mat_pulled_with_key',
  MAT_NOT_UNDER_DOOR: 'dungeo.tiny_room.mat_not_under_door',
  NO_DOOR_HERE: 'dungeo.tiny_room.no_door_here'
};
