## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.climbing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/climbing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: climbing" by "Sharpee (generated)"
  id: stdlib-chord-climbing
  version: 1.0.0
  reference-only: true

## Action  : if.action.climbing
## Group   : movement
## Verbs   : climb, climb up, climb down, climb on, climb onto, climb over, scale, ascend, descend, scramble up, clamber up, shin up
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.climbed, if.event.entered, if.event.moved
## Summary : CLIMB - Climb objects or move in vertical directions. Example: CLIMB LADDER

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   climbing-no-target                no_target                               What do {you} want to climb?
##   climbing-not-climbable            not_climbable                           {You} {can't} climb {the object}.
##   climbing-climb-nowhere            climb_nowhere                           Climbing {the object} would get {you} nowhere.
##   climbing-cant-go-that-way         cant_go_that_way                        {You} {can't} climb {verbatim:direction} from here.
##   climbing-climbed-up               climbed_up                              {You} {climb} up.
##   climbing-climbed-down             climbed_down                            {You} {climb} down.
##   climbing-climbed-onto             climbed_onto                            {You} {climb} onto {the target}.
##   climbing-already-there            already_there                           {You're} already on {the place}.
##   climbing-too-high                 too_high                                That's too high to climb.
##   climbing-too-dangerous            too_dangerous                           That looks too dangerous to climb.
##   climbing-need-equipment           need_equipment                          {You}'d need climbing equipment for that.
##   climbing-too-slippery             too_slippery                            It's too slippery to climb.
##   climbing-nothing-to-climb         nothing_to_climb                        There's nothing to climb here.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.climbed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
