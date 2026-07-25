## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.removing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/removing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: removing" by "Sharpee (generated)"
  id: stdlib-chord-removing
  version: 1.0.0
  reference-only: true

## Action  : if.action.removing
## Group   : object_manipulation
## Verbs   : remove  from, take  from, take  out of, get  from, extract  from
## Objects : direct object required; indirect object required
## Slots   : item, source, tool   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.remove_blocked, if.event.taken
## Summary : REMOVE/TAKE FROM - Take objects out of containers. Example: TAKE BOOK FROM SHELF

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   removing-no-target                no_target                               Remove what?
##   removing-no-source                no_source                               Remove {the item} from what?
##   removing-not-in-container         not_in_container                        {capitalize the item} isn't in {the container}.
##   removing-not-on-surface           not_on_surface                          {capitalize the item} isn't on {the surface}.
##   removing-container-closed         container_closed                        {capitalize the container} {verb:is container} closed.
##   removing-removed-from             removed_from                            {You} {take} {the item} from {the container}.
##   removing-removed-from-surface     removed_from_surface                    {You} {take} {the item} from {the surface}.
##   removing-cant-reach               cant_reach                              {You} {can't} reach {the item}.
##   removing-already-have             already_have                            {You} already {have} {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.remove_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
