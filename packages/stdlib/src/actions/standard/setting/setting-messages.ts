/**
 * Message constants for the setting action (ADR-371 D3, D5).
 *
 * The lang-en-us package uses matching string literals. `not_a_setting` is
 * emitted by the implementation (the story-loader's `settable` behavior, or
 * a TS behavior), fully-qualified, with `values` as a list param.
 */
export const SettingMessages = {
  // Error messages
  NO_TARGET: 'no_target',
  NO_VALUE: 'no_value',
  CANT_SET_THAT: 'cant_set_that',
  NOT_A_SETTING: 'not_a_setting',

  // Success message (the implementation usually speaks after it)
  SET: 'set',
} as const;

export type SettingMessageId = typeof SettingMessages[keyof typeof SettingMessages];
