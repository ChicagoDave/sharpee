## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.touching`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/touching/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: touching" by "Sharpee (generated)"
  id: stdlib-chord-touching
  version: 1.0.0
  reference-only: true

## Action  : if.action.touching
## Group   : sensory
## Verbs   : touch, feel, pat, stroke, poke, prod
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.touch_blocked, if.event.touched
## Summary : TOUCH/FEEL - Touch objects to discover their texture, temperature, or other tactile properties. Example: TOUCH STONE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   touching-no-target                no_target                               Touch what?
##   touching-not-visible              not_visible                             {You} {can't} see {the target} to touch it.
##   touching-not-reachable            not_reachable                           {You} {can't} reach {the target}.
##   touching-feels-normal             feels_normal                            {capitalize the target} feels as {you}'d expect.
##   touching-feels-warm               feels_warm                              {capitalize the target} feels warm to the touch.
##   touching-feels-hot                feels_hot                               {capitalize the target} {verb:is target} hot! {You} {pull} {your} hand back quickly.
##   touching-feels-soft               feels_soft                              {capitalize the target} feels soft.
##   touching-feels-hard               feels_hard                              {capitalize the target} feels hard and solid.
##   touching-feels-smooth             feels_smooth                            {capitalize the target} feels smooth.
##   touching-feels-wet                feels_wet                               {capitalize the target} feels damp.
##   touching-device-vibrating         device_vibrating                        {capitalize the target} {verb:is target} vibrating slightly.
##   touching-immovable-object         immovable_object                        {capitalize the target} {verb:is target} solid and immovable.
##   touching-liquid-container         liquid_container                        {You} {feel} liquid sloshing inside {the target}.
##   touching-touched                  touched                                 {You} {touch} {the target}.
##   touching-touched-gently           touched_gently                          {You} gently {touch} {the target}.
##   touching-poked                    poked                                   {You} {poke} {the target}.
##   touching-prodded                  prodded                                 {You} {prod} {the target}.
##   touching-patted                   patted                                  {You} {pat} {the target}.
##   touching-stroked                  stroked                                 {You} {stroke} {the target}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.touch_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
