/**
 * Message constants for the switching_on action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'no_target',
  NOT_SWITCHABLE: 'not_switchable',
  ALREADY_ON: 'already_on',
  NO_POWER: 'no_power',

  // Success messages (used by determineSwitchingMessage)
  SWITCHED_ON: 'switched_on',
  LIGHT_ON: 'light_on',
  DEVICE_HUMMING: 'device_humming',
  TEMPORARY_ACTIVATION: 'temporary_activation',
  WITH_SOUND: 'with_sound',
  DOOR_OPENS: 'door_opens',
  ILLUMINATES_DARKNESS: 'illuminates_darkness',
} as const;

export type SwitchingOnMessageId = typeof MESSAGES[keyof typeof MESSAGES];
