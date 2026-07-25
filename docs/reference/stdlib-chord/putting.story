## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.putting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/putting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: putting" by "Sharpee (generated)"
  id: stdlib-chord-putting
  version: 1.0.0
  reference-only: true

## Action  : if.action.putting
## Group   : object_manipulation
## Verbs   : put  in, put  into, put  on, put  onto, place  in, place  on, insert  in, insert  into
## Objects : direct object required; indirect object required
## Slots   : item, container   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.put_blocked, if.event.put_in, if.event.put_on
## Summary : PUT ON/IN - Place objects on surfaces or in containers. Example: PUT VASE ON TABLE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   putting-no-target                 no_target                               Put what?
##   putting-no-destination            no_destination                          Where do {you} want to put {the item}?
##   putting-not-held                  not_held                                {You} {need} to be holding {the item} first.
##   putting-not-container             not_container                           {You} {can't} put things in {the destination}.
##   putting-not-surface               not_surface                             {You} {can't} put things on {the destination}.
##   putting-container-closed          container_closed                        {capitalize the container} {verb:is container} closed.
##   putting-already-there             already_there                           {capitalize the item} {verb:is item} already {relation} {the destination}.
##   putting-put-in                    put_in                                  {You} {put} {the item} in {the container}.
##   putting-put-on                    put_on                                  {You} {put} {the item} on {the surface}.
##   putting-cant-put-in-itself        cant_put_in_itself                      {You} {can't} put {the item} inside itself.
##   putting-cant-put-on-itself        cant_put_on_itself                      {You} {can't} put {the item} on itself.
##   putting-no-room                   no_room                                 There's no room in {the container}.
##   putting-no-space                  no_space                                There's no space on {the surface}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.put_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
