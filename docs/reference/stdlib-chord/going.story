## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.going`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/going/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: going" by "Sharpee (generated)"
  id: stdlib-chord-going
  version: 1.0.0
  reference-only: true

## Action  : if.action.going
## Group   : movement
## Verbs   : go, walk, head, move, travel
## Slots   : source, destination, door   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.actor_entered, if.event.actor_exited, if.event.actor_moved, if.event.region_entered, if.event.region_exited, if.event.went
## Summary : GO/N/S/E/W - Move in compass directions or to connected locations. Example: GO NORTH or N

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   going-room-description            room_description                        {name} {verbatim:description}
##   going-contents-list               contents_list                           {You} can {see} {items} here.
##   going-no-exit                     no_exit                                 {You} {can't} go that way.
##   going-no-exit-that-way            no_exit_that_way                        {You} {can't} go that way.
##   going-door-closed                 door_closed                             {capitalize the door} {verb:is door} closed.
##   going-door-locked                 door_locked                             {capitalize the door} {verb:is door} locked.
##   going-too-dark                    too_dark                                It is pitch dark. You are likely to be eaten by a grue.
##   going-moved                       moved                                   {You} {go} {verbatim:direction}.
##   going-cant-go-through             cant_go_through                         {You} {can't} go through {obstacle}.
##   going-already-there               already_there                           {You're} already there.
##   going-nowhere-to-go               nowhere_to_go                           {You}'ll have to say which compass direction to go in.
##   going-no-direction                no_direction                            {You}'ll have to say which direction to go.
##   going-not-in-room                 not_in_room                             {You're} not in a place where {you} can go anywhere.
##   going-no-exits                    no_exits                                There are no obvious exits.
##   going-movement-blocked            movement_blocked                        {verbatim:message}
##   going-destination-not-found       destination_not_found                   {You} {can't} go that way.
##   going-need-light                  need_light                              It's too dark to go that way safely.
##   going-went                        went                                    {You} {go} {verbatim:direction}.
##   going-arrived                     arrived                                 {You} {arrive}.
##   going-cant-go                     cant_go                                 {You} {can't} go that way.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.actor_entered (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
