/**
 * Message constants for the wearing action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'no_target',
  NOT_WEARABLE: 'not_wearable',
  NOT_HELD: 'not_held',
  ALREADY_WEARING: 'already_wearing',
  CANT_WEAR_THAT: 'cant_wear_that',
  HANDS_FULL: 'hands_full',

  // Success messages
  WORN: 'worn',
} as const;

export type WearingMessageId = typeof MESSAGES[keyof typeof MESSAGES];
