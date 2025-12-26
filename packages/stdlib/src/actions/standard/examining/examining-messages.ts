/**
 * Message constants for the examining action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const ExaminingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_VISIBLE: 'not_visible',

  // Success messages
  EXAMINED: 'examined',
  EXAMINED_SELF: 'examined_self',
  EXAMINED_CONTAINER: 'examined_container',
  EXAMINED_SUPPORTER: 'examined_supporter',
  EXAMINED_READABLE: 'examined_readable',
  EXAMINED_SWITCHABLE: 'examined_switchable',
  EXAMINED_WEARABLE: 'examined_wearable',
  EXAMINED_DOOR: 'examined_door',
  NOTHING_SPECIAL: 'nothing_special',
  DESCRIPTION: 'description',
  BRIEF_DESCRIPTION: 'brief_description',
} as const;

export type ExaminingMessageId = typeof ExaminingMessages[keyof typeof ExaminingMessages];
