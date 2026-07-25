## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.switching_on`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/switching-on/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: switching-on" by "Sharpee (generated)"
  id: stdlib-chord-switching-on
  version: 1.0.0
  reference-only: true

## Action  : if.action.switching_on
## Group   : device_manipulation
## Verbs   : switch on, switch  on, turn on, turn  on, activate, start, power on, power  on
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Summary : TURN ON/SWITCH ON - Turn on devices, lights, and other switchable objects. Example: TURN ON LAMP

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   switching-on-no-target            no_target                               Switch on what?
##   switching-on-not-visible          not_visible                             {You} {can't} see {the target}.
##   switching-on-not-reachable        not_reachable                           {You} {can't} reach {the target}.
##   switching-on-not-switchable       not_switchable                          {capitalize the target} isn't something {you} can switch on.
##   switching-on-already-on           already_on                              {capitalize the target} {verb:is target} already on.
##   switching-on-no-power             no_power                                {capitalize the target} {verb:has target} no power source.
##   switching-on-switched-on          switched_on                             {You} {switch} on {the target}.
##   switching-on-light-on             light_on                                {You} {switch} on {the target}, illuminating the area.
##   switching-on-device-humming       device_humming                          {capitalize the target} hums to life.
##   switching-on-temporary-activation temporary_activation                    {capitalize the target} switches on temporarily.
##   switching-on-with-sound           with_sound                              {You} {switch} on {the target}. {sound}
##   switching-on-door-opens           door_opens                              {capitalize the target} switches on and opens.
##   switching-on-illuminates-darkness illuminates_darkness                    {capitalize the target} switches on, banishing the darkness.

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
