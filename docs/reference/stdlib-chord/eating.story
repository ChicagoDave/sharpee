## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.eating`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/eating/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: eating" by "Sharpee (generated)"
  id: stdlib-chord-eating
  version: 1.0.0
  reference-only: true

## Action  : if.action.eating
## Group   : interaction
## Verbs   : eat, consume, devour, munch, munch on, nibble, nibble on
## Objects : direct object required
## Slots   : item   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.eaten, if.event.taken
## Summary : EAT - Eat edible items to satisfy hunger or gain effects. Example: EAT APPLE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   eating-no-item                    no_item                                 Eat what?
##   eating-not-visible                not_visible                             {You} {can't} see {the item}.
##   eating-not-reachable              not_reachable                           {You} {can't} reach {the item}.
##   eating-not-edible                 not_edible                              That's not something {you} can eat.
##   eating-is-drink                   is_drink                                {You} should drink {the item}, not eat it.
##   eating-already-consumed           already_consumed                        There's nothing left of {the item} to eat.
##   eating-eaten                      eaten                                   {You} {eat} {the item}.
##   eating-eaten-all                  eaten_all                               {You} {eat} all of {the item}.
##   eating-eaten-some                 eaten_some                              {You} {eat} some of {the item}.
##   eating-eaten-portion              eaten_portion                           {You} {eat} a portion of {the item}.
##   eating-delicious                  delicious                               {You} {eat} {the item}. Delicious!
##   eating-tasty                      tasty                                   {You} {eat} {the item}. It's quite tasty.
##   eating-bland                      bland                                   {You} {eat} {the item}. It's rather bland.
##   eating-awful                      awful                                   {You} {eat} {the item}. It tastes awful!
##   eating-filling                    filling                                 {You} {eat} {the item}. That was filling.
##   eating-still-hungry               still_hungry                            {You} {eat} {the item}, but {you're} still hungry.
##   eating-satisfying                 satisfying                              {You} {eat} {the item}. Very satisfying!
##   eating-poisonous                  poisonous                               {You} {eat} {the item}. It tastes strange...
##   eating-nibbled                    nibbled                                 {You} {nibble} on {the item}.
##   eating-tasted                     tasted                                  {You} {taste} {the item}.
##   eating-devoured                   devoured                                {You} {devour} {the item} hungrily.
##   eating-munched                    munched                                 {You} {munch} on {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.eaten (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
