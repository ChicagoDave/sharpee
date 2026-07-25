## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.turning`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/turning/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: turning" by "Sharpee (generated)"
  id: stdlib-chord-turning
  version: 1.0.0
  reference-only: true

## Action  : if.action.turning
## Group   : manipulation
## Verbs   : turn, rotate, twist
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.turn_blocked, if.event.turned
## Summary : TURN/ROTATE - Turn dials, knobs, wheels, cranks, or keys to operate mechanisms. Example: TURN DIAL TO 5

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   turning-no-target                 no_target                               Turn what?
##   turning-not-visible               not_visible                             {You} {can't} see {the target}.
##   turning-not-reachable             not_reachable                           {You} {can't} reach {the target}.
##   turning-wearing-it                wearing_it                              {You} {can't} turn {the target} while wearing it.
##   turning-cant-turn-that            cant_turn_that                          {capitalize the target} isn't something {you} can turn.
##   turning-dial-turned               dial_turned                             {You} {turn} {the target}.
##   turning-dial-set                  dial_set                                {You} {turn} {the target} to {setting}.
##   turning-dial-adjusted             dial_adjusted                           {You} {adjust} {the target} {verbatim:direction}.
##   turning-knob-turned               knob_turned                             {You} {turn} {the target}.
##   turning-knob-clicks               knob_clicks                             {You} {turn} {the target} with a click.
##   turning-knob-toggled              knob_toggled                            {You} {turn} {the target}, switching it {newState}.
##   turning-wheel-turned              wheel_turned                            {You} {turn} {the target}.
##   turning-crank-turned              crank_turned                            {You} {crank} {the target}.
##   turning-mechanism-grinds          mechanism_grinds                        {You} {turn} {the target}. Gears grind and machinery moves.
##   turning-requires-more-turns       requires_more_turns                     {You} {turn} {the target}. It seems to need more turning.
##   turning-mechanism-activated       mechanism_activated                     As {you} {turn} {the target}, {you} {hear} machinery activate!
##   turning-valve-opened              valve_opened                            {You} {turn} {the target}, opening the valve.
##   turning-valve-closed              valve_closed                            {You} {turn} {the target}, closing the valve.
##   turning-flow-changes              flow_changes                            {You} {turn} {the target}, adjusting the flow.
##   turning-key-needs-lock            key_needs_lock                          {You} {need} to put {the target} in a lock first.
##   turning-key-turned                key_turned                              {You} {turn} {the target} in the lock.
##   turning-turned                    turned                                  {You} {turn} {the target}.
##   turning-rotated                   rotated                                 {You} {rotate} {the target}.
##   turning-spun                      spun                                    {You} {spin} {the target}.
##   turning-nothing-happens           nothing_happens                         {You} {turn} {the target}, but nothing happens.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.turn_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
