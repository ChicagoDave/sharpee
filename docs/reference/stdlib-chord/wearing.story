## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.wearing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/wearing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: wearing" by "Sharpee (generated)"
  id: stdlib-chord-wearing
  version: 1.0.0
  reference-only: true

## Action  : if.action.wearing
## Group   : wearable_manipulation
## Verbs   : wear, put on, put  on, don
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.taken, if.event.wear_blocked, if.event.worn
## Summary : WEAR/PUT ON - Wear clothing or accessories that you are carrying. Example: WEAR HAT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   wearing-no-target                 no_target                               Wear what?
##   wearing-not-wearable              not_wearable                            {You} {can't} wear {the item}.
##   wearing-not-held                  not_held                                {You} {need} to be holding {the item} first.
##   wearing-already-wearing           already_wearing                         {You're} already wearing {the item}.
##   wearing-worn                      worn                                    {You} {put} on {the item}.
##   wearing-cant-wear-that            cant_wear_that                          {You} {can't} wear {the item}.
##   wearing-hands-full                hands_full                              {You} {need} to have {your} hands free to put that on.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.taken (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
