/**
 * Language content for quitting action
 * Updated to support PC communication system queries
 */

export const quittingLanguage = {
  actionId: 'if.action.quitting',
  
  patterns: [
    'quit',
    'exit',
    'bye',
    'goodbye',
    'end',
    'stop',
    'quit game',
    'end game'
  ],
  
  messages: {
    // Query messages (sent to client)
    'quit_confirm_query': "Are {you} sure {you} want to quit?",
    'quit_save_query': "Would {you} like to save before quitting?",
    'quit_unsaved_query': "{You} {have} unsaved progress. What would {you} like to do?",

    // Response messages (for text service after confirmation)
    'quit_confirmed': "Thanks for playing!\n\nFinal score: {finalScore} out of {maxScore}\nMoves: {moves}",
    'quit_cancelled': "Quit cancelled.",
    'quit_and_saved': "Game saved.\n\nThanks for playing!\n\nFinal score: {finalScore} out of {maxScore}\nMoves: {moves}",

    // Additional stat messages that the text service might use
    'final_score': "{Your} final score was {finalScore} out of {maxScore}.",
    'final_stats': "Final Statistics:\nScore: {finalScore}/{maxScore}\nMoves: {moves}\nTime played: {playTime}",
    'achievements_earned': "{You} earned {count} achievements during {your} play!"
  },
  
  // Query option labels (for client UI)
  queryOptions: {
    'quit': "Quit",
    'cancel': "Return to game",
    'save_and_quit': "Save and quit",
    'quit_without_saving': "Quit without saving"
  },
  
  help: {
    description: 'Quit the game. You will be asked to confirm.',
    examples: 'quit, exit, bye, goodbye',
    summary: 'QUIT/EXIT - Quit the game with confirmation'
  }
};
