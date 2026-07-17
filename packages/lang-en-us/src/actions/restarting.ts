/**
 * English language content for the restarting action (ADR-230 Phase 9c —
 * the action shipped without a lang file; its message ids resolved to
 * nothing).
 */

export const restartingLanguage = {
  actionId: 'if.action.restarting',

  patterns: [
    'restart'
  ],

  messages: {
    // Confirmation messages
    'restart_confirm': "Are you sure you want to restart? All unsaved progress will be lost.",
    'restart_unsaved': "You have unsaved progress. Restart anyway?",
    'restart_requested': "Restarting the story...",

    // Status messages
    'game_restarting': "The story restarts.",
    'starting_over': "Starting over from the beginning.",
    'new_game': "A new story begins."
  },

  help: {
    description: 'Restart the story from the beginning.',
    examples: 'restart',
    summary: 'RESTART - Start the story over from the beginning. Example: RESTART'
  }
};
