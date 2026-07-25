## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.quitting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/quitting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: quitting" by "Sharpee (generated)"
  id: stdlib-chord-quitting
  version: 1.0.0
  reference-only: true

## Action  : if.action.quitting
## Group   : meta
## Verbs   : quit, exit, bye, goodbye, end, stop, quit game, end game
## Emits   : if.event.quit_blocked, if.event.quit_requested
## Summary : QUIT/EXIT - Quit the game with confirmation

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   quitting-quit-confirm-query       quit_confirm_query                      Are {you} sure {you} want to quit?
##   quitting-quit-save-query          quit_save_query                         Would {you} like to save before quitting?
##   quitting-quit-unsaved-query       quit_unsaved_query                      {You} {have} unsaved progress. What would {you} like to do?
##   quitting-quit-confirmed           quit_confirmed                          Thanks for playing! Final score: {finalScore} out of {maxScore} Moves: {moves}
##   quitting-quit-cancelled           quit_cancelled                          Quit cancelled.
##   quitting-quit-and-saved           quit_and_saved                          Game saved. Thanks for playing! Final score: {finalScore} out of {maxScore} Moves: {moves}
##   quitting-final-score              final_score                             {Your} final score was {finalScore} out of {maxScore}.
##   quitting-final-stats              final_stats                             Final Statistics: Score: {finalScore}/{maxScore} Moves: {moves} Time played: {playTime}
##   quitting-achievements-earned      achievements_earned                     {You} earned {count} achievements during {your} play!

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.quit_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
