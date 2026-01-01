/**
 * Message constants for the dropping action
 */
export const DroppingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_HELD: 'not_held',
  STILL_WORN: 'still_worn',
  CONTAINER_NOT_OPEN: 'container_not_open',
  CONTAINER_FULL: 'container_full',
  CANT_DROP_HERE: 'cant_drop_here',
  CANT_DROP: 'cant_drop',
  NOTHING_TO_DROP: 'nothing_to_drop',

  // Success messages
  DROPPED: 'dropped',
  DROPPED_IN: 'dropped_in',
  DROPPED_ON: 'dropped_on',
  DROPPED_QUIETLY: 'dropped_quietly',
  DROPPED_CARELESSLY: 'dropped_carelessly',
} as const;

export type DroppingMessageId = typeof DroppingMessages[keyof typeof DroppingMessages];
