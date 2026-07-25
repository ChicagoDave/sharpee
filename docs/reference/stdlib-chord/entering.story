## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.entering`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/entering/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: entering" by "Sharpee (generated)"
  id: stdlib-chord-entering
  version: 1.0.0
  reference-only: true

## Action  : if.action.entering
## Group   : movement
## Verbs   : enter, get in, get into, get on, go in, go into, go inside, board, mount, sit on, sit in, lie on, lie in, stand on, stand in, climb in, climb into, climb on, climb onto
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.entered
## Summary : ENTER/GET IN - Enter containers, vehicles, or furniture that can hold you. Example: ENTER CAR

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   entering-no-target                no_target                               Enter what?
##   entering-not-enterable            not_enterable                           {You} {can't} enter {the place}.
##   entering-already-inside           already_inside                          {You're} already in {the place}.
##   entering-container-closed         container_closed                        {capitalize the container} {verb:is container} closed.
##   entering-too-full                 too_full                                {capitalize the place} {verb:is place} full (maximum {max} occupants).
##   entering-entered                  entered                                 {You} {get} into {the place}.
##   entering-entered-on               entered_on                              {You} {get} onto {the place}.
##   entering-cant-enter               cant_enter                              {You} {can't} enter {the place}: {reason}.
##   entering-not-here                 not_here                                {You} {don't} see {the place} here.
##   entering-too-small                too_small                               {capitalize the place} {verb:is place} too small for {you} to enter.
##   entering-occupied                 occupied                                {capitalize the place} {verb:is place} already occupied.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.entered (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
