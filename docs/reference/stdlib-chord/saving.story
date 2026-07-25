## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.saving`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/saving/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: saving" by "Sharpee (generated)"
  id: stdlib-chord-saving
  version: 1.0.0
  reference-only: true

## Action  : if.action.saving
## Group   : meta
## Verbs   : save, save game, store, store game
## Emits   : if.event.save_blocked, if.event.save_requested
## Summary : SAVE - Save your current game progress. Example: SAVE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   saving-game-saved                 game_saved                              Game saved.
##   saving-game-saved-as              game_saved_as                           Game saved as '{verbatim:saveName}'.
##   saving-save-successful            save_successful                         {Your} game has been saved successfully.
##   saving-save-slot                  save_slot                               Game saved to slot {verbatim:saveName}.
##   saving-overwrite-save             overwrite_save                          Previous save '{verbatim:saveName}' has been overwritten.
##   saving-save-details               save_details                            Saved: {verbatim:saveName} Score: {score} Moves: {moves}
##   saving-quick-save                 quick_save                              Quick save completed.
##   saving-auto-save                  auto_save                               Auto-saving game...
##   saving-save-failed                save_failed                             Failed to save game.
##   saving-no-save-slots              no_save_slots                           No save slots available.
##   saving-invalid-save-name          invalid_save_name                       '{verbatim:saveName}' is not a valid save name.
##   saving-save-not-allowed           save_not_allowed                        {You} cannot save the game at this time.
##   saving-save-in-progress           save_in_progress                        Another save is already in progress.
##   saving-confirm-overwrite          confirm_overwrite                       A save named '{verbatim:saveName}' already exists. Overwrite it?
##   saving-save-reminder              save_reminder                           Don't forget to save {your} game regularly!
##   saving-saved-locally              saved_locally                           Game saved to local storage.
##   saving-saved-to-cloud             saved_to_cloud                          Game saved to cloud storage.
##   saving-save-exported              save_exported                           Save file exported successfully.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.save_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
