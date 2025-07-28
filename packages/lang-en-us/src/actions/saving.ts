/**
 * Language content for saving action
 */

export const savingLanguage = {
  actionId: 'if.action.saving',
  
  patterns: [
    'save',
    'save game',
    'save [name]',
    'save as [name]',
    'store',
    'store game'
  ],
  
  messages: {
    // Success messages
    'game_saved': "Game saved.",
    'game_saved_as': "Game saved as '{saveName}'.",
    'save_successful': "Your game has been saved successfully.",
    'save_slot': "Game saved to slot {saveName}.",
    'overwrite_save': "Previous save '{saveName}' has been overwritten.",
    
    // Save details
    'save_details': "Saved: {saveName}\nScore: {score}\nMoves: {moves}",
    'quick_save': "Quick save completed.",
    'auto_save': "Auto-saving game...",
    
    // Error messages
    'save_failed': "Failed to save game.",
    'no_save_slots': "No save slots available.",
    'invalid_save_name': "'{saveName}' is not a valid save name.",
    'save_not_allowed': "You cannot save the game at this time.",
    'save_in_progress': "Another save is already in progress.",
    
    // Confirmation messages
    'confirm_overwrite': "A save named '{saveName}' already exists. Overwrite it?",
    'save_reminder': "Don't forget to save your game regularly!",
    
    // Save location info
    'saved_locally': "Game saved to local storage.",
    'saved_to_cloud': "Game saved to cloud storage.",
    'save_exported': "Save file exported successfully."
  },
  
  help: {
    description: 'Save your current game progress.',
    examples: 'save, save game, save mysave, save as "Chapter 2"',
    summary: 'SAVE - Save your current game progress. Example: SAVE'
  }
};
