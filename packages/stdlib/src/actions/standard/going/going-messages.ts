/**
 * Message constants for going action
 * Centralized location for all validation and feedback messages
 */

export const MESSAGES = {
  // Validation failures
  NO_DIRECTION: 'Which way do you want to go?',
  NOT_IN_ROOM: 'You need to leave your current location first.',
  NO_EXITS: 'There are no obvious exits.',
  NO_EXIT_THAT_WAY: 'You can\'t go {direction} from here.',
  MOVEMENT_BLOCKED: 'Something blocks your way {direction}.',
  DOOR_CLOSED: 'The {door} is closed.',
  DOOR_LOCKED: 'The {door} is locked.',
  DESTINATION_NOT_FOUND: 'The exit {direction} leads nowhere.',
  TOO_DARK: 'It\'s too dark to go that way without a light.',
  NEED_LIGHT: 'You need a light source to go there.',
};
