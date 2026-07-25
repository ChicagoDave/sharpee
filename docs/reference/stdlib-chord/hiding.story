## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.hiding`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/hiding/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: hiding" by "Sharpee (generated)"
  id: stdlib-chord-hiding
  version: 1.0.0
  reference-only: true

## Action  : if.action.hiding
## Group   : interaction
## Verbs   : hide behind, hide under, hide on, hide in, duck behind, crouch behind
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.hide_blocked, if.event.player_concealed, if.event.player_revealed, if.event.reveal_blocked
## Summary : HIDE BEHIND/UNDER/ON/IN - Conceal yourself to observe without being detected. Example: HIDE BEHIND CURTAIN

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   hiding-behind                     behind                                  {You} {slip} behind {the target}.
##   hiding-under                      under                                   {You} {crawl} under {the target}.
##   hiding-on                         on                                      {You} {crouch} on {the target}, out of sight.
##   hiding-inside                     inside                                  {You} {climb} into {the target}, concealing {yourself}.
##   hiding-nothing-to-hide            nothing_to_hide                         {You} {can't} hide there.
##   hiding-cant-hide-there-behind     cant_hide_there_behind                  {You} {can't} hide behind {the target}.
##   hiding-cant-hide-there-under      cant_hide_there_under                   {You} {can't} hide under {the target}.
##   hiding-cant-hide-there-on         cant_hide_there_on                      {You} {can't} hide on {the target}.
##   hiding-cant-hide-there-inside     cant_hide_there_inside                  {You} {can't} hide inside {the target}.
##   hiding-already-hidden             already_hidden                          {You're} already hidden.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.hide_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
