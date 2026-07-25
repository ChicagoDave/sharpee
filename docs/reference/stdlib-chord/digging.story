## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.digging`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/digging/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: digging" by "Sharpee (generated)"
  id: stdlib-chord-digging
  version: 1.0.0
  reference-only: true

## Action  : if.action.digging
## Group   : manipulation
## Verbs   : dig  with
## Objects : direct object required
## Slots   : target, tool   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.dug, if.event.dug_blocked
## Summary : CUT - Cut something with a suitable tool. Example: DIG SAND WITH SHOVEL

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   digging-no-target                 no_target                               Dig what?
##   digging-not-diggable              not_diggable                            {capitalize the item} {verb:is item} not something {you} can dig.
##   digging-cant-dig                  cant_dig                                Digging {the item} would achieve nothing here.
##   digging-no-tool                   no_tool                                 {You} {need} something to dig {the item} with.
##   digging-tool-not-held             tool_not_held                           {You} {need} to be holding {the tool}.
##   digging-wrong-tool                wrong_tool                              {capitalize the tool} won't dig {the item}.
##   digging-dug                       dug                                     {You} {dig} {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.dug (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
