/**
 * Message constants for the turning action (chord go-live G1 shortlist,
 * 2026-07-17).
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const TurningMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  CANT_TURN_THAT: 'cant_turn_that',

  // Success message (typically overridden by the entity's implementation)
  TURNED: 'turned',
} as const;

export type TurningMessageId = typeof TurningMessages[keyof typeof TurningMessages];
