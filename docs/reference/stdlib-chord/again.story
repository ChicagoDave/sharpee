## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.again`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/again/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: again" by "Sharpee (generated)"
  id: stdlib-chord-again
  version: 1.0.0
  reference-only: true

## Action  : if.action.again
## Group   : meta
## Verbs   : again, g
## Emits   : if.event.again_blocked
## Summary : AGAIN (G) - Repeat the last command. Example: G

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   again-nothing-to-repeat           nothing_to_repeat                       There is nothing to repeat.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.again_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
