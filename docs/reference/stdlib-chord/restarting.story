## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.restarting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/restarting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: restarting" by "Sharpee (generated)"
  id: stdlib-chord-restarting
  version: 1.0.0
  reference-only: true

## Action  : if.action.restarting
## Group   : meta
## Verbs   : restart
## Emits   : if.event.restart_blocked, if.event.restart_requested
## Summary : RESTART - Start the story over from the beginning. Example: RESTART

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   restarting-restart-confirm        restart_confirm                         Are you sure you want to restart? All unsaved progress will be lost.
##   restarting-restart-unsaved        restart_unsaved                         You have unsaved progress. Restart anyway?
##   restarting-restart-requested      restart_requested                       Restarting the story...
##   restarting-game-restarting        game_restarting                         The story restarts.
##   restarting-starting-over          starting_over                           Starting over from the beginning.
##   restarting-new-game               new_game                                A new story begins.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.restart_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
