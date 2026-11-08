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
  /** Something else is already worn on that body part at that layer (ADR-392 D1) */
  ALREADY_WEARING_THERE: 'already_wearing_there',
  /** It would go under something already worn over that body part (ADR-392 D1) */
  WORN_UNDER: 'worn_under',
  CANT_WEAR_THAT: 'cant_wear_that',
  HANDS_FULL: 'hands_full',

  // Success messages
  WORN: 'worn',
} as const;

export type WearingMessageId = typeof MESSAGES[keyof typeof MESSAGES];
