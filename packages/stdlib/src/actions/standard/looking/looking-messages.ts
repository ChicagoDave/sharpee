/**
 * Message constants for the looking action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const LookingMessages = {
  // Success messages
  ROOM_DESCRIPTION: 'room_description',
  ROOM_DESCRIPTION_BRIEF: 'room_description_brief',
  ROOM_DARK: 'room_dark',
  CONTENTS_LIST: 'contents_list',
  NOTHING_SPECIAL: 'nothing_special',
  IN_CONTAINER: 'in_container',
  ON_SUPPORTER: 'on_supporter',
  CANT_SEE_IN_DARK: 'cant_see_in_dark',
  LOOK_AROUND: 'look_around',
  EXAMINE_SURROUNDINGS: 'examine_surroundings',
} as const;

export type LookingMessageId = typeof LookingMessages[keyof typeof LookingMessages];
