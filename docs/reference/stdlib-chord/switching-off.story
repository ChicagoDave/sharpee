## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.switching_off`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/switching-off/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: switching-off" by "Sharpee (generated)"
  id: stdlib-chord-switching-off
  version: 1.0.0
  reference-only: true

## Action  : if.action.switching_off
## Group   : device_manipulation
## Verbs   : switch off, switch  off, turn off, turn  off, deactivate, stop, power off, power  off
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Summary : TURN OFF/SWITCH OFF - Turn off devices, lights, and other switchable objects. Example: TURN OFF RADIO

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   switching-off-no-target           no_target                               Switch off what?
##   switching-off-not-visible         not_visible                             {You} {can't} see {the target}.
##   switching-off-not-reachable       not_reachable                           {You} {can't} reach {the target}.
##   switching-off-not-switchable      not_switchable                          {capitalize the target} isn't something {you} can switch off.
##   switching-off-already-off         already_off                             {capitalize the target} {verb:is target} already off.
##   switching-off-switched-off        switched_off                            {You} {switch} off {the target}.
##   switching-off-light-off           light_off                               {You} {switch} off {the target}, plunging the area into darkness.
##   switching-off-light-off-still-lit light_off_still_lit                     {You} {switch} off {the target}.
##   switching-off-device-stops        device_stops                            {capitalize the target} powers down with a soft whir.
##   switching-off-silence-falls       silence_falls                           {You} {switch} off {the target}. Silence falls.
##   switching-off-with-sound          with_sound                              {You} {switch} off {the target}. {sound}
##   switching-off-door-closes         door_closes                             {capitalize the target} switches off and closes.
##   switching-off-was-temporary       was_temporary                           {capitalize the target} switches off (it had {remainingTime} seconds left).

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on the action's emitted event (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
