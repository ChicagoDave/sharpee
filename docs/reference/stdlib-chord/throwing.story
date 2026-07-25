## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.throwing`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/throwing/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: throwing" by "Sharpee (generated)"
  id: stdlib-chord-throwing
  version: 1.0.0
  reference-only: true

## Action  : if.action.throwing
## Group   : interaction
## Verbs   : throw, throw  at, throw  to, hurl, hurl  at, toss, toss  to, chuck, fling, lob
## Objects : direct object required; indirect object required
## Slots   : item, target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.item_destroyed, if.event.throw_blocked, if.event.thrown
## Summary : THROW AT - Throw objects at targets, in directions, or just drop them forcefully. Example: THROW ROCK AT WINDOW

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   throwing-no-item                  no_item                                 Throw what?
##   throwing-not-holding              not_holding                             {You} aren't holding {the item}.
##   throwing-target-not-visible       target_not_visible                      {You} {can't} see {the target}.
##   throwing-target-not-here          target_not_here                         {capitalize the target} isn't here.
##   throwing-no-exit                  no_exit                                 There's no exit {verbatim:direction}.
##   throwing-too-heavy                too_heavy                               {capitalize the item} {verb:is item} too heavy to throw far (weighs {weight}kg).
##   throwing-self                     self                                    {You} {can't} throw things at {yourself}.
##   throwing-thrown                   thrown                                  {You} {throw} {the item}.
##   throwing-thrown-down              thrown_down                             {You} {toss} {the item} to the ground.
##   throwing-thrown-gently            thrown_gently                           {You} gently {toss} {the item}.
##   throwing-thrown-at                thrown_at                               {You} {throw} {the item} at {the target}.
##   throwing-hits-target              hits_target                             {You} {throw} {the item} at {the target}. It hits!
##   throwing-misses-target            misses_target                           {You} {throw} {the item} at {the target}, but miss.
##   throwing-bounces-off              bounces_off                             {capitalize the item} bounces off {the target}.
##   throwing-lands-on                 lands_on                                {capitalize the item} lands on {the target}.
##   throwing-lands-in                 lands_in                                {capitalize the item} lands in {the target}.
##   throwing-thrown-direction         thrown_direction                        {You} {throw} {the item} {verbatim:direction}.
##   throwing-sails-through            sails_through                           {capitalize the item} sails through the exit to the {verbatim:direction}.
##   throwing-breaks-on-impact         breaks_on_impact                        {capitalize the item} shatters on impact!
##   throwing-breaks-against           breaks_against                          {capitalize the item} smashes against {the target}!
##   throwing-fragile-breaks           fragile_breaks                          The fragile {item} breaks into pieces.
##   throwing-target-ducks             target_ducks                            {capitalize the target} ducks out of the way.
##   throwing-target-catches           target_catches                          {capitalize the target} catches {the item}!
##   throwing-target-angry             target_angry                            {capitalize the target} doesn't appreciate being hit with {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.item_destroyed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
