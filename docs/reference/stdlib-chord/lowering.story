## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.lowering`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/lowering/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: lowering" by "Sharpee (generated)"
  id: stdlib-chord-lowering
  version: 1.0.0
  reference-only: true

## Action  : if.action.lowering
## Group   : manipulation
## Verbs   : lower
## Objects : direct object required
## Summary : LOWER - Lower objects like baskets, drawbridges, or blinds. Example: LOWER BASKET

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   lowering-no-target                no_target                               Lower what?
##   lowering-cant-lower-that          cant_lower_that                         {You} {can't} lower {the target}.
##   lowering-already-down             already_down                            That's already lowered.
##   lowering-lowered                  lowered                                 {You} {lower} {the target}.

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
