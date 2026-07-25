## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.exiting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/exiting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: exiting" by "Sharpee (generated)"
  id: stdlib-chord-exiting
  version: 1.0.0
  reference-only: true

## Action  : if.action.exiting
## Group   : movement
## Verbs   : exit, get out, get off, go out, go outside, leave, dismount, stand, stand up, climb out, climb off, disembark, alight
## Slots   : container   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.exited
## Summary : EXIT/LEAVE/GET OUT - Exit from containers, vehicles, or furniture you are inside. Example: EXIT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   exiting-already-outside           already_outside                         {You're} not inside anything.
##   exiting-container-closed          container_closed                        {capitalize the container} {verb:is container} closed.
##   exiting-cant-exit                 cant_exit                               {You} {can't} exit {the place}.
##   exiting-exited                    exited                                  {You} {get} out of {the place}.
##   exiting-exited-from               exited_from                             {You} {get} {preposition} {the place}.
##   exiting-nowhere-to-go             nowhere_to_go                           There's nowhere to go from here.
##   exiting-not-in-that               not_in_that                             But {you} {aren't} in {the container}.
##   exiting-not-on-that               not_on_that                             But {you} {aren't} on {the container}.
##   exiting-exit-blocked              exit_blocked                            The way out is blocked.
##   exiting-must-stand-first          must_stand_first                        {You}'ll need to stand up first.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.exited (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
