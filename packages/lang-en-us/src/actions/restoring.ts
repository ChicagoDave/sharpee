/**
 * Language content for restoring action
 */

export const restoringLanguage = {
  actionId: 'if.action.restoring',
  
  patterns: [
    'restore',
    'restore [name]',
    'load',
    'load [name]',
    'load game',
    'restore game'
  ],
  
  messages: {
    // Success messages
    'game_restored': "Game restored.",
    'game_loaded': "Game loaded from '{saveName}'.",
    'restore_successful': "Your saved game has been restored successfully.",
    'welcome_back': "Welcome back! Game restored from {saveName}.",
    
    // Restore details
    'restore_details': "Restored: {saveName}\nScore: {score}\nMoves: {moves}",
    'quick_restore': "Quick restore completed.",
    'resuming_game': "Resuming your adventure...",
    
    // Error messages
    'restore_failed': "Failed to restore game.",
    'save_not_found': "No save named '{saveName}' was found.",
    'no_saves': "No saved games found.",
    'corrupt_save': "The save file '{saveName}' appears to be corrupted.",
    'incompatible_save': "This save file is from a different version and cannot be loaded.",
    'restore_not_allowed': "You cannot restore a game at this time.",
    
    // Confirmation messages
    'confirm_restore': "Restore game from '{saveName}'? Current progress will be lost.",
    'unsaved_progress': "You have unsaved progress. Restore anyway?",
    
    // Save list
    'available_saves': "Available saves: {saves}",
    'no_saves_available': "No saved games available.",
    'choose_save': "Which save would you like to restore?",
    
    // Import messages
    'import_save': "Import a save file to restore.",
    'save_imported': "Save file imported successfully."
  },
  
  help: {
    description: 'Restore a previously saved game.',
    examples: 'restore, load, restore mysave, load "Chapter 2"',
    summary: 'RESTORE/LOAD - Restore a previously saved game. Example: RESTORE'
  }
};
