/**
 * Message constants for the locking action
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
  ALREADY_LOCKED: 'already_locked',
  NOT_CLOSED: 'not_closed',
  CANT_REACH: 'cant_reach',
  KEY_NOT_HELD: 'key_not_held',

  // Success messages
  LOCKED: 'locked',
  LOCKED_WITH: 'locked_with',
} as const;

export type LockingMessageId = typeof MESSAGES[keyof typeof MESSAGES];
