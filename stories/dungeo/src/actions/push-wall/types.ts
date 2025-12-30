/**
 * Push Wall Action Types
 *
 * Types and constants for the Royal Puzzle push wall action.
 */

export const PUSH_WALL_ACTION_ID = 'dungeo.action.push_wall';

export const PushWallMessages = {
  // Validation
  NOT_IN_PUZZLE: 'dungeo.push_wall.not_in_puzzle',
  NO_DIRECTION: 'dungeo.push_wall.no_direction',
  INVALID_DIRECTION: 'dungeo.push_wall.invalid_direction',

  // Push results
  NO_WALL: 'dungeo.push_wall.no_wall',
  IMMOVABLE: 'dungeo.push_wall.immovable',
  NO_ROOM: 'dungeo.push_wall.no_room',
  BOUNDARY: 'dungeo.push_wall.boundary',
  SUCCESS: 'dungeo.push_wall.success',
  SUCCESS_FIRST: 'dungeo.push_wall.success_first',

  // Special
  LADDER_VISIBLE: 'dungeo.push_wall.ladder_visible',
  CARD_VISIBLE: 'dungeo.push_wall.card_visible'
} as const;

export type PushDirection = 'north' | 'south' | 'east' | 'west';
