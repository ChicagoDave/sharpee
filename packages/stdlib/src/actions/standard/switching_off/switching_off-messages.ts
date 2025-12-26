/**
 * Message constants for the switching_off action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'no_target',
  NOT_SWITCHABLE: 'not_switchable',
  ALREADY_OFF: 'already_off',

  // Success messages (used by determineSwitchingMessage)
  SWITCHED_OFF: 'switched_off',
  LIGHT_OFF: 'light_off',
  LIGHT_OFF_STILL_LIT: 'light_off_still_lit',
  DEVICE_STOPS: 'device_stops',
  SILENCE_FALLS: 'silence_falls',
  WITH_SOUND: 'with_sound',
  DOOR_CLOSES: 'door_closes',
  WAS_TEMPORARY: 'was_temporary',
} as const;

export type SwitchingOffMessageId = typeof MESSAGES[keyof typeof MESSAGES];
