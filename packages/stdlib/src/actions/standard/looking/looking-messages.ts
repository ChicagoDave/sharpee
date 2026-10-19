/**
 * Message constants for the looking action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const LookingMessages = {
  // Success messages
  ROOM_DESCRIPTION: 'room_description',
  ROOM_DARK: 'room_dark',
  CONTENTS_LIST: 'contents_list',
  NOTHING_SPECIAL: 'nothing_special',
  IN_CONTAINER: 'in_container',
  ON_SUPPORTER: 'on_supporter',
  CANT_SEE_IN_DARK: 'cant_see_in_dark',
  LOOK_AROUND: 'look_around',
  EXAMINE_SURROUNDINGS: 'examine_surroundings',
  HIDDEN_AT: 'hidden_at',
  /** ADR-376 D6: one row per thing in sight across an expanse, by band. */
  SIGHTING_CLOSE_BY: 'sighting_close_by',
  SIGHTING_IN_THE_DISTANCE: 'sighting_in_the_distance',
  SIGHTING_ON_THE_HORIZON: 'sighting_on_the_horizon',
  /** ADR-376 D6: a thing in the looker's own cell, which has no direction. */
  SIGHTING_HERE: 'sighting_here',
} as const;

export type LookingMessageId = typeof LookingMessages[keyof typeof LookingMessages];
