## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.pulling`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/pulling/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: pulling" by "Sharpee (generated)"
  id: stdlib-chord-pulling
  version: 1.0.0
  reference-only: true

## Action  : if.action.pulling
## Group   : interaction
## Verbs   : pull, tug, tug on, drag, yank
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.detached, if.event.pulled, if.event.sound
## Summary : PULL/DRAG - Pull objects, levers, cords, or drag heavy items. Example: PULL LEVER

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   pulling-no-target                 no_target                               Pull what?
##   pulling-not-visible               not_visible                             {You} {can't} see {the target}.
##   pulling-not-reachable             not_reachable                           {You} {can't} reach {the target}.
##   pulling-cant-pull-that            cant_pull_that                          {capitalize the target} {verb:is target} not something {you} can pull.
##   pulling-worn                      worn                                    {You} {can't} pull {the target} while wearing it.
##   pulling-already-pulled            already_pulled                          {capitalize the target} has already been pulled.
##   pulling-pulled                    pulled                                  {You} {pull} {the target}.
##   pulling-nothing-happens           nothing_happens                         {You} {pull} {the target}, but nothing happens.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.detached (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
