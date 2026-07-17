/**
 * Message constants for the opening action
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const OpeningMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_OPENABLE: 'not_openable',
  ALREADY_OPEN: 'already_open',
  LOCKED: 'locked',
  CANT_REACH: 'cant_reach',
  CANNOT_OPEN: 'cannot_open',
  // ADR-230 D3b tool requirement (shared ids from tool-shared.ts)
  NO_TOOL: 'no_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',

  // Success messages
  OPENED: 'opened',
  REVEALING: 'revealing',
  ITS_EMPTY: 'its_empty',
} as const;

export type OpeningMessageId = typeof OpeningMessages[keyof typeof OpeningMessages];
