/**
 * Robot NPC Message IDs
 *
 * Semantic message identifiers for Robot behavior.
 * Actual text is provided via language layer.
 */

export const RobotMessages = {
  // Descriptions
  DESCRIPTION: 'dungeo.robot.description',
  FOLLOWS: 'dungeo.robot.follows',
  WAITS: 'dungeo.robot.waits',

  // Commands
  COMMAND_UNDERSTOOD: 'dungeo.robot.command_understood',
  COMMAND_UNKNOWN: 'dungeo.robot.command_unknown',
  PUSHES_BUTTON: 'dungeo.robot.pushes_button',
  NO_BUTTON: 'dungeo.robot.no_button',
  ALREADY_PUSHED: 'dungeo.robot.already_pushed',

  // Round Room fix
  CAROUSEL_FIXED: 'dungeo.robot.carousel_fixed',
} as const;

export type RobotMessageId = typeof RobotMessages[keyof typeof RobotMessages];
