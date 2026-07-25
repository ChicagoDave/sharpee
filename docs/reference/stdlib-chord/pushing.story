## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.pushing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/pushing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: pushing" by "Sharpee (generated)"
  id: stdlib-chord-pushing
  version: 1.0.0
  reference-only: true

## Action  : if.action.pushing
## Group   : device_manipulation
## Verbs   : push, press, shove, move
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.pushed
## Summary : PUSH/PRESS - Push objects, press buttons, or move heavy items. Example: PUSH BUTTON

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   pushing-no-target                 no_target                               Push what?
##   pushing-not-visible               not_visible                             {You} {can't} see {the target}.
##   pushing-not-reachable             not_reachable                           {You} {can't} reach {the target}.
##   pushing-too-heavy                 too_heavy                               {capitalize the target} {verb:is target} far too heavy to push (weighs {weight}kg).
##   pushing-wearing-it                wearing_it                              {You} {can't} push {the target} while wearing it.
##   pushing-button-pushed             button_pushed                           {You} {push} {the target}.
##   pushing-button-clicks             button_clicks                           {You} {press} {the target}. Click!
##   pushing-switch-toggled            switch_toggled                          {You} {push} {the target}, toggling it {newState}.
##   pushing-pushed-direction          pushed_direction                        {You} {push} {the target} {verbatim:direction}.
##   pushing-pushed-nudged             pushed_nudged                           {You} {give} {the target} a push, but it doesn't move far.
##   pushing-pushed-with-effort        pushed_with_effort                      With considerable effort, {you} {push} {the target} {verbatim:direction}.
##   pushing-reveals-passage           reveals_passage                         As {you} {push} {the target} {verbatim:direction}, it slides aside, revealing a hidden passage!
##   pushing-wont-budge                wont_budge                              {capitalize the target} won't budge.
##   pushing-pushing-does-nothing      pushing_does_nothing                    Pushing {the target} has no effect.
##   pushing-fixed-in-place            fixed_in_place                          {capitalize the target} {verb:is target} fixed in place.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.pushed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
