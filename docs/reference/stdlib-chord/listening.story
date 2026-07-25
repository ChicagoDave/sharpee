## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.listening`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/listening/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: listening" by "Sharpee (generated)"
  id: stdlib-chord-listening
  version: 1.0.0
  reference-only: true

## Action  : if.action.listening
## Group   : sensory
## Verbs   : listen, listen to, hear
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.listen_blocked, if.event.listened
## Summary : LISTEN - Listen for sounds in the environment or from specific objects. Example: LISTEN TO RADIO

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   listening-not-visible             not_visible                             {You} {can't} see {the target} well enough to focus on its sounds.
##   listening-silence                 silence                                 {You} {hear} nothing out of the ordinary.
##   listening-ambient-sounds          ambient_sounds                          {You} {hear} the usual ambient sounds.
##   listening-active-devices          active_devices                          {You} can {hear} {devices} operating nearby.
##   listening-no-sound                no_sound                                {capitalize the target} isn't making any sound.
##   listening-device-running          device_running                          {capitalize the target} {verb:is target} making a soft humming sound.
##   listening-device-off              device_off                              {capitalize the target} {verb:is target} silent.
##   listening-container-sounds        container_sounds                        {You} {hear} faint sounds from inside {the target}.
##   listening-liquid-sounds           liquid_sounds                           {You} {hear} liquid sloshing in {the target}.
##   listening-listened-to             listened_to                             {You} {listen} carefully to {the target}.
##   listening-listened-environment    listened_environment                    {You} {listen} carefully.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.listen_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
