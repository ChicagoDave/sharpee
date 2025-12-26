/**
 * Message constants for locking action
 * Centralized location for all validation and feedback messages
 */

export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'What do you want to lock?',
  NOT_LOCKABLE: '{item} can\'t be locked.',
  NO_KEY: 'You need a key to lock that.',
  WRONG_KEY: 'That key doesn\'t fit {item}.',
  ALREADY_LOCKED: '{item} is already locked.',
  NOT_CLOSED: 'You need to close {item} first.',
  CANT_REACH: 'You can\'t reach {item}.',
  KEY_NOT_HELD: 'You\'re not holding {key}.',
};
