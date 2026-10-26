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
  DROPPED_BREAKS: 'dropped_breaks',  // a fragile thing hit the floor (ADR-373 D4)
  DROPPED_CARELESSLY: 'dropped_carelessly',
  DROPPED_MULTI: 'dropped_multi',  // Compact format for multi-object: "{item}: Dropped."
  /** ADR-376 D9, D10: dropped into an expanse — a floating thing floats there, anything else is lost. */
  DROPPED_AFLOAT: 'dropped_afloat',
  LOST_OVERBOARD: 'lost_overboard',
} as const;

export type DroppingMessageId = typeof DroppingMessages[keyof typeof DroppingMessages];
