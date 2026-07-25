## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.taking_off`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/taking-off/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: taking-off" by "Sharpee (generated)"
  id: stdlib-chord-taking-off
  version: 1.0.0
  reference-only: true

## Action  : if.action.taking_off
## Group   : wearable_manipulation
## Verbs   : take off, take  off, remove, doff
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Summary : TAKE OFF/REMOVE - Remove worn clothing or accessories. Example: TAKE OFF COAT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   taking-off-no-target              no_target                               Take off what?
##   taking-off-not-wearing            not_wearing                             {You} aren't wearing {the item}.
##   taking-off-removed                removed                                 {You} {take} off {the item}.
##   taking-off-cant-remove            cant_remove                             {You} {can't} take off {the item}.
##   taking-off-prevents-removal       prevents_removal                        {You}'ll need to take off {the blocking} first.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on the action's emitted event (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
