## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.dropping`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/dropping/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: dropping" by "Sharpee (generated)"
  id: stdlib-chord-dropping
  version: 1.0.0
  reference-only: true

## Action  : if.action.dropping
## Group   : object_manipulation
## Verbs   : drop, put down, discard, release, let go of
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.drop_blocked, if.event.dropped
## Summary : DROP/PUT DOWN - Drop objects from your inventory. Example: DROP SWORD

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   dropping-no-target                no_target                               Drop what?
##   dropping-not-held                 not_held                                {You} aren't holding {the item}.
##   dropping-nothing-to-drop          nothing_to_drop                         {You} aren't carrying anything.
##   dropping-dropped                  dropped                                 Dropped.
##   dropping-still-worn               still_worn                              {You}'ll need to take off {the item} first.
##   dropping-dropped-in               dropped_in                              {You} {put} {the item} in {the container}.
##   dropping-dropped-on               dropped_on                              {You} {put} {the item} on {the surface}.
##   dropping-dropped-multi            dropped_multi                           {item}: Dropped.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.drop_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
