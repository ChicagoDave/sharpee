/**
 * Message constants for the digging action (ADR-230 Phase 6)
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const DiggingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_DIGGABLE: 'not_diggable',
  CANT_DIG: 'cant_dig',
  // Tool requirement (shared ids from tool-shared.ts)
  NO_TOOL: 'no_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',

  // Success message (typically overridden by the entity's implementation)
  DUG: 'dug',
} as const;

export type DiggingMessageId = typeof DiggingMessages[keyof typeof DiggingMessages];
