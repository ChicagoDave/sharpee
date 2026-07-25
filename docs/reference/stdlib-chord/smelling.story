## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.smelling`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/smelling/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: smelling" by "Sharpee (generated)"
  id: stdlib-chord-smelling
  version: 1.0.0
  reference-only: true

## Action  : if.action.smelling
## Group   : sensory
## Verbs   : smell, sniff, inhale
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.smell_blocked, if.event.smelled
## Summary : SMELL/SNIFF - Smell objects or detect scents in your current location. Example: SMELL FLOWER

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   smelling-not-visible              not_visible                             {You} {can't} see {the target} to smell it.
##   smelling-too-far                  too_far                                 {capitalize the target} {verb:is target} too far away to smell.
##   smelling-no-scent                 no_scent                                {You} {don't} smell anything unusual.
##   smelling-room-scents              room_scents                             The air carries various scents.
##   smelling-food-nearby              food_nearby                             {You} {smell} food nearby.
##   smelling-smoke-detected           smoke_detected                          {You} {detect} a faint smell of smoke.
##   smelling-no-particular-scent      no_particular_scent                     {capitalize the target} {verb:has target} no particular smell.
##   smelling-food-scent               food_scent                              {capitalize the target} smells delicious.
##   smelling-drink-scent              drink_scent                             {capitalize the target} {verb:has target} a pleasant aroma.
##   smelling-burning-scent            burning_scent                           {capitalize the target} gives off a smoky smell.
##   smelling-container-food-scent     container_food_scent                    {You} {smell} food inside {the target}.
##   smelling-musty-scent              musty_scent                             {capitalize the target} smells a bit musty.
##   smelling-fresh-scent              fresh_scent                             {capitalize the target} smells fresh and clean.
##   smelling-smelled                  smelled                                 {You} {smell} {the target}.
##   smelling-smelled-environment      smelled_environment                     {You} {sniff} the air.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.smell_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
