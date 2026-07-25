## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.taking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/taking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: taking" by "Sharpee (generated)"
  id: stdlib-chord-taking
  version: 1.0.0
  reference-only: true

## Action  : if.action.taking
## Group   : object_manipulation
## Verbs   : take, get, pick up, grab, acquire, collect
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.removed, if.event.take_blocked, if.event.taken
## Summary : TAKE/GET/PICK UP - Pick up objects and add them to your inventory. Example: TAKE LAMP

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   taking-no-target                  no_target                               Take what?
##   taking-cant-take-self             cant_take_self                          {You} {can't} take {yourself}.
##   taking-already-have               already_have                            {You} already {have} {the item}.
##   taking-cant-take-room             cant_take_room                          {You} {can't} take {the item}.
##   taking-fixed-in-place             fixed_in_place                          {capitalize the item} {verb:is item} fixed in place.
##   taking-container-full             container_full                          {You're} carrying too much already.
##   taking-too-heavy                  too_heavy                               Your load is too heavy. You will have to leave something behind.
##   taking-cannot-take                cannot_take                             {You} {can't} take {the item}.
##   taking-taken                      taken                                   Taken.
##   taking-nothing-to-take            nothing_to_take                         You take in everything you see and enjoy the moment.
##   taking-taken-from                 taken_from                              {You} {take} {the item} from {the container}.
##   taking-taken-multi                taken_multi                             {item}: Taken.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.removed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
