## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.inserting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/inserting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: inserting" by "Sharpee (generated)"
  id: stdlib-chord-inserting
  version: 1.0.0
  reference-only: true

## Action  : if.action.inserting
## Group   : object_manipulation
## Verbs   : insert  in, insert  into, push  in
## Objects : direct object required; indirect object required
## Slots   : item, container   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.insert_blocked, if.event.put_in
## Summary : INSERT/PUT IN - Put objects inside containers. Example: PUT COIN IN SLOT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   inserting-no-target               no_target                               Insert what?
##   inserting-no-destination          no_destination                          Insert {the item} into what?
##   inserting-not-held                not_held                                {You} {need} to be holding {the item} first.
##   inserting-not-insertable          not_insertable                          {capitalize the item} can't be inserted into things.
##   inserting-not-container           not_container                           {You} {can't} insert things into {the destination}.
##   inserting-already-there           already_there                           {capitalize the item} {verb:is item} already in {the destination}.
##   inserting-inserted                inserted                                {You} {insert} {the item} into {the container}.
##   inserting-wont-fit                wont_fit                                {capitalize the item} won't fit in {the container}.
##   inserting-container-closed        container_closed                        {capitalize the container} {verb:is container} closed.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.insert_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
