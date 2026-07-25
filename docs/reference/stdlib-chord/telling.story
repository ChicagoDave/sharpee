## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.telling`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/telling/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: telling" by "Sharpee (generated)"
  id: stdlib-chord-telling
  version: 1.0.0
  reference-only: true

## Action  : if.action.telling
## Group   : social
## Verbs   : tell  about, inform  about
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.tell_blocked, if.event.told
## Summary : TELL ABOUT - Tell characters about topics or give them information. Example: TELL ALICE ABOUT KEY

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   telling-no-target                 no_target                               Tell whom?
##   telling-no-topic                  no_topic                                Tell them about what?
##   telling-not-visible               not_visible                             {You} {can't} see {the target}.
##   telling-too-far                   too_far                                 {capitalize the target} {verb:is target} too far away.
##   telling-not-actor                 not_actor                               {You} can only tell things to people.
##   telling-told                      told                                    {You} {tell} {the target} about {verbatim:topic}.
##   telling-informed                  informed                                {You} {inform} {the target} about {verbatim:topic}.
##   telling-interested                interested                              {capitalize the target} listens with interest.
##   telling-very-interested           very_interested                         {capitalize the target} {verb:says target}, "Really? Tell me more!"
##   telling-grateful                  grateful                                {capitalize the target} {verb:says target}, "Thank you for telling me!"
##   telling-already-knew              already_knew                            {capitalize the target} {verb:says target}, "Yes, I'm aware of that."
##   telling-not-interested            not_interested                          {capitalize the target} doesn't seem interested.
##   telling-bored                     bored                                   {capitalize the target} looks bored.
##   telling-dismissive                dismissive                              {capitalize the target} {verb:says target}, "So what?"
##   telling-ignores                   ignores                                 {capitalize the target} ignores what {you're} saying.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.tell_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
