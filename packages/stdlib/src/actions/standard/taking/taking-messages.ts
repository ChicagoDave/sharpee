/**
 * Message constants for the taking action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const TakingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  CANT_TAKE_SELF: 'cant_take_self',
  ALREADY_HAVE: 'already_have',
  CANT_TAKE_ROOM: 'cant_take_room',
  FIXED_IN_PLACE: 'fixed_in_place',
  CONTAINER_FULL: 'container_full',
  TOO_HEAVY: 'too_heavy',
  CANNOT_TAKE: 'cannot_take',
  CANT_TAKE: 'cant_take',

  // Success messages
  TAKEN: 'taken',
  TAKEN_FROM: 'taken_from',
} as const;

export type TakingMessageId = typeof TakingMessages[keyof typeof TakingMessages];
