/**
 * Language content for the setting action (ADR-371 D3, D5): the thing's
 * implementation decides the values; `not_a_setting` names them.
 */

export const settingLanguage = {
  actionId: 'if.action.setting',

  patterns: [
    'set [something] to [value]',
    'turn [something] to [value]',
    'adjust [something] to [value]'
  ],

  messages: {
    // Error messages
    'no_target': "Set what?",
    'no_value': "Set {the target} to what?",
    'cant_set_that': "{capitalize the target} isn't something {you} can set.",
    'not_a_setting': "{capitalize the target} goes to {values}.",

    // Success
    'set': "{You} {set} {the target} to {verbatim:value}."
  },

  help: {
    description: 'Set a dial or selector to one of its positions.',
    examples: 'set the dial to high, turn the selector to titan',
    summary: 'SET - Set a dial or selector to one of its positions. Example: SET THE DIAL TO HIGH'
  }
};
