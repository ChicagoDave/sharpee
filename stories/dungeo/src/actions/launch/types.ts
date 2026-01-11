/**
 * Launch Action Types
 *
 * Launch the boat into the river from a shore location.
 */

export const LAUNCH_ACTION_ID = 'dungeo.action.launch';

export const LaunchMessages = {
  SUCCESS: 'dungeo.launch.success',
  NOT_IN_BOAT: 'dungeo.launch.not_in_boat',
  NOT_AT_SHORE: 'dungeo.launch.not_at_shore',
  BOAT_NOT_INFLATED: 'dungeo.launch.boat_not_inflated',
  ALREADY_ON_RIVER: 'dungeo.launch.already_on_river'
} as const;
