## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.talking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/talking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: talking" by "Sharpee (generated)"
  id: stdlib-chord-talking
  version: 1.0.0
  reference-only: true

## Action  : if.action.talking
## Group   : social
## Verbs   : talk to, talk, speak to, speak with, chat with
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.talk_blocked, if.event.talked
## Summary : TALK TO - Start a conversation with another character. Example: TALK TO MERCHANT

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   talking-no-target                 no_target                               Talk to whom?
##   talking-not-visible               not_visible                             {You} {can't} see {the target}.
##   talking-too-far                   too_far                                 {capitalize the target} {verb:is target} too far away for conversation.
##   talking-not-actor                 not_actor                               {You} can only talk to people.
##   talking-self                      self                                    Talking to {yourself} is a sign of madness.
##   talking-not-available             not_available                           {capitalize the target} doesn't want to talk right now.
##   talking-talked                    talked                                  {You} {greet} {the target}.
##   talking-no-response               no_response                             {capitalize the target} doesn't respond.
##   talking-acknowledges              acknowledges                            {capitalize the target} acknowledges {you}.
##   talking-first-meeting             first_meeting                           {You} {introduce} {yourself} to {the target}.
##   talking-greets-back               greets_back                             {capitalize the target} {verb:says target}, "Hello there!"
##   talking-formal-greeting           formal_greeting                         {capitalize the target} {verb:says target}, "Good day to you."
##   talking-casual-greeting           casual_greeting                         {capitalize the target} {verb:says target}, "Hey!"
##   talking-greets-again              greets_again                            {capitalize the target} {verb:says target}, "Hello again."
##   talking-remembers-you             remembers_you                           {capitalize the target} {verb:says target}, "Ah, it's you again."
##   talking-friendly-greeting         friendly_greeting                       {capitalize the target} smiles in recognition.
##   talking-has-topics                has_topics                              {capitalize the target} seems willing to discuss various topics.
##   talking-nothing-to-say            nothing_to_say                          {capitalize the target} {verb:has target} nothing particular to say.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.talk_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
