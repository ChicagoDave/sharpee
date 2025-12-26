/**
 * Message constants for switching_on action
 * Centralized location for all validation and feedback messages
 */

export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'What do you want to turn on?',
  NOT_SWITCHABLE: '{target} can\'t be switched on.',
  ALREADY_ON: '{target} is already on.',
  NO_POWER: '{target} has no power source.',
};
