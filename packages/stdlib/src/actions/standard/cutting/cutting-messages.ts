/**
 * Message constants for the cutting action (ADR-230 D3c)
 *
 * These constants provide type safety for message IDs within stdlib.
 * The lang-en-us package uses matching string literals (stable, injected at runtime).
 */
export const CuttingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_CUTTABLE: 'not_cuttable',
  CANT_CUT: 'cant_cut',
  // Tool requirement (shared ids from tool-shared.ts)
  NO_TOOL: 'no_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',

  // Success message (typically overridden by the entity's implementation)
  CUT: 'cut',
} as const;

export type CuttingMessageId = typeof CuttingMessages[keyof typeof CuttingMessages];
