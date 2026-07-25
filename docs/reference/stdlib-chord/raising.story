## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.raising`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/raising/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: raising" by "Sharpee (generated)"
  id: stdlib-chord-raising
  version: 1.0.0
  reference-only: true

## Action  : if.action.raising
## Group   : manipulation
## Verbs   : raise, lift
## Objects : direct object required
## Summary : RAISE/LIFT - Raise or lift objects like baskets or drawbridges. Example: RAISE BASKET

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   raising-no-target                 no_target                               Raise what?
##   raising-cant-raise-that           cant_raise_that                         {You} {can't} raise {the target}.
##   raising-already-up                already_up                              That's already raised.
##   raising-raised                    raised                                  {You} {raise} {the target}.

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
