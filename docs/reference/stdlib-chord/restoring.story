## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.restoring`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/restoring/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: restoring" by "Sharpee (generated)"
  id: stdlib-chord-restoring
  version: 1.0.0
  reference-only: true

## Action  : if.action.restoring
## Group   : meta
## Verbs   : restore, load, load game, restore game
## Emits   : if.event.restore_blocked, if.event.restore_requested
## Summary : RESTORE/LOAD - Restore a previously saved game. Example: RESTORE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   restoring-game-restored           game_restored                           Game restored.
##   restoring-game-loaded             game_loaded                             Game loaded from '{verbatim:saveName}'.
##   restoring-restore-successful      restore_successful                      {Your} saved game has been restored successfully.
##   restoring-welcome-back            welcome_back                            Welcome back! Game restored from {verbatim:saveName}.
##   restoring-restore-details         restore_details                         Restored: {verbatim:saveName} Score: {score} Moves: {moves}
##   restoring-quick-restore           quick_restore                           Quick restore completed.
##   restoring-resuming-game           resuming_game                           Resuming {your} adventure...
##   restoring-restore-failed          restore_failed                          Failed to restore game.
##   restoring-save-not-found          save_not_found                          No save named '{verbatim:saveName}' was found.
##   restoring-no-saves                no_saves                                No saved games found.
##   restoring-corrupt-save            corrupt_save                            The save file '{verbatim:saveName}' appears to be corrupted.
##   restoring-incompatible-save       incompatible_save                       This save file is from a different version and cannot be loaded.
##   restoring-restore-not-allowed     restore_not_allowed                     {You} cannot restore a game at this time.
##   restoring-confirm-restore         confirm_restore                         Restore game from '{verbatim:saveName}'? Current progress will be lost.
##   restoring-unsaved-progress        unsaved_progress                        {You} {have} unsaved progress. Restore anyway?
##   restoring-available-saves         available_saves                         Available saves: {saves}
##   restoring-no-saves-available      no_saves_available                      No saved games available.
##   restoring-choose-save             choose_save                             Which save would {you} like to restore?
##   restoring-import-save             import_save                             Import a save file to restore.
##   restoring-save-imported           save_imported                           Save file imported successfully.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.restore_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
