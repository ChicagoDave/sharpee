/**
 * Language content for waking action (P-15, GH #362)
 */

export const wakingLanguage = {
  actionId: 'if.action.waking',

  patterns: [
    'wake',
    'wake up'
  ],

  messages: {
    // The stock line: waking is a signal action, and this is what it says
    // when no story reaction speaks in its place.
    'already_awake': "{You're} already awake."
  },

  help: {
    description: 'Wake up. Stories decide what that means.',
    examples: 'wake, wake up',
    summary: 'WAKE/WAKE UP - Wake up. Stories decide what that means. Example: WAKE UP'
  }
};
