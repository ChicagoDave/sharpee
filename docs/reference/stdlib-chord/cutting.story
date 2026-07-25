## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.cutting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/cutting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: cutting" by "Sharpee (generated)"
  id: stdlib-chord-cutting
  version: 1.0.0
  reference-only: true

## Action  : if.action.cutting
## Group   : manipulation
## Verbs   : cut  with, cut
## Objects : direct object required
## Slots   : target, tool   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.cut, if.event.cut_blocked
## Summary : CUT - Cut something with a suitable tool. Example: CUT ROPE WITH KNIFE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   cutting-no-target                 no_target                               Cut what?
##   cutting-not-cuttable              not_cuttable                            {capitalize the item} {verb:is item} not something {you} can cut.
##   cutting-cant-cut                  cant_cut                                Cutting {the item} would achieve nothing here.
##   cutting-no-tool                   no_tool                                 {You} {need} something to cut {the item} with.
##   cutting-tool-not-held             tool_not_held                           {You} {need} to be holding {the tool}.
##   cutting-wrong-tool                wrong_tool                              {capitalize the tool} won't cut {the item}.
##   cutting-cut                       cut                                     {You} {cut} {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.cut (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
