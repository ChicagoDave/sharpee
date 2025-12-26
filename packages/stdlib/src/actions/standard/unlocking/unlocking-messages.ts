/**
 * Message constants for the unlocking action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const MESSAGES = {
  // Validation failures
  NO_TARGET: 'no_target',
  NOT_LOCKABLE: 'not_lockable',
  NO_KEY: 'no_key',
  WRONG_KEY: 'wrong_key',
  ALREADY_UNLOCKED: 'already_unlocked',
  CANT_REACH: 'cant_reach',
  KEY_NOT_HELD: 'key_not_held',

  // Success messages
  UNLOCKED: 'unlocked',
  UNLOCKED_WITH: 'unlocked_with',
} as const;

export type UnlockingMessageId = typeof MESSAGES[keyof typeof MESSAGES];
