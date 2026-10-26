/**
 * Message constants for the burning action (ADR-371 D2).
 *
 * The lang-en-us package uses matching string literals. The tool ids are
 * the shared ones from tool-shared.ts.
 */
export const BurningMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NOT_FLAMMABLE: 'not_flammable',
  CANT_BURN: 'cant_burn',
  // Tool requirement (shared ids from tool-shared.ts)
  NO_TOOL: 'no_tool',
  NEEDS_TOOL: 'needs_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',

  // Success message (typically overridden by the entity's implementation)
  BURNED: 'burned',
} as const;

export type BurningMessageId = typeof BurningMessages[keyof typeof BurningMessages];
