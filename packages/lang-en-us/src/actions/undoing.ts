/**
 * Language content for undoing action
 */

export const undoingLanguage = {
  actionId: 'if.action.undoing',

  patterns: [
    'undo'
  ],

  messages: {
    // Success messages
    'undo_success': "Previous turn undone.",
    'undo_to_turn': "Undone. (Now at turn {turn})",

    // Error messages
    'undo_failed': "Undo failed.",
    'nothing_to_undo': "Nothing to undo."
  },

  help: {
    description: 'Undo the previous turn.',
    examples: 'undo',
    summary: 'UNDO - Undo the previous turn. Example: UNDO'
  }
};
