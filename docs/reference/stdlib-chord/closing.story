## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.closing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/closing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: closing" by "Sharpee (generated)"
  id: stdlib-chord-closing
  version: 1.0.0
  reference-only: true

## Action  : if.action.closing
## Group   : container_manipulation
## Verbs   : close, shut
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.close_blocked, if.event.closed
## Summary : CLOSE/SHUT - Close doors, containers, and other closeable objects. Example: CLOSE DOOR

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   closing-no-target                 no_target                               Close what?
##   closing-not-closable              not_closable                            {capitalize the item} can't be closed.
##   closing-already-closed            already_closed                          {capitalize the item} {verb:is item} already closed.
##   closing-closed                    closed                                  {You} {close} {the item}.
##   closing-cant-reach                cant_reach                              {You} {can't} reach {the item}.
##   closing-prevents-closing          prevents_closing                        {You} {can't} close {the item} while {obstacle} {verb:is obstacle} in the way.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.close_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
