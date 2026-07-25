## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.opening`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/opening/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: opening" by "Sharpee (generated)"
  id: stdlib-chord-opening
  version: 1.0.0
  reference-only: true

## Action  : if.action.opening
## Group   : container_manipulation
## Verbs   : open, open up, open  with
## Objects : direct object required
## Slots   : target, tool   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.exit_revealed, if.event.open_blocked, if.event.opened, if.event.revealed
## Summary : OPEN - Open doors, containers, and other openable objects. Example: OPEN DOOR

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   opening-no-target                 no_target                               Open what?
##   opening-not-openable              not_openable                            {capitalize the item} can't be opened.
##   opening-already-open              already_open                            {capitalize the item} {verb:is item} already open.
##   opening-locked                    locked                                  {capitalize the item} {verb:is item} locked.
##   opening-opened                    opened                                  {You} {open} {the item}.
##   opening-revealing                 revealing                               Opening {the container} reveals {items}.
##   opening-its-empty                 its_empty                               {You} {open} {the container}, which is empty.
##   opening-cant-reach                cant_reach                              {You} {can't} reach {the item}.
##   opening-no-tool                   no_tool                                 {You} {need} something to open {the item} with.
##   opening-tool-not-held             tool_not_held                           {You} {need} to be holding {the tool}.
##   opening-wrong-tool                wrong_tool                              {capitalize the tool} won't open {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.exit_revealed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
