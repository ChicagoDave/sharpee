## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.asking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/asking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: asking" by "Sharpee (generated)"
  id: stdlib-chord-asking
  version: 1.0.0
  reference-only: true

## Action  : if.action.asking
## Group   : social
## Verbs   : ask  about, question  about, inquire of  about
## Objects : direct object required
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.ask_blocked, if.event.asked
## Summary : ASK ABOUT - Ask characters about specific topics to gather information. Example: ASK GUARD ABOUT CASTLE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   asking-no-target                  no_target                               Ask whom?
##   asking-no-topic                   no_topic                                Ask about what?
##   asking-not-visible                not_visible                             {You} {can't} see {the target}.
##   asking-too-far                    too_far                                 {capitalize the target} {verb:is target} too far away.
##   asking-not-actor                  not_actor                               {You} can only ask questions of people.
##   asking-unknown-topic              unknown_topic                           {capitalize the target} {verb:says target}, "I don't know anything about that."
##   asking-shrugs                     shrugs                                  {capitalize the target} shrugs.
##   asking-no-idea                    no_idea                                 {capitalize the target} {verb:says target}, "No idea what you're talking about."
##   asking-confused                   confused                                {capitalize the target} looks confused.
##   asking-responds                   responds                                {capitalize the target} {verb:tells target} you about {verbatim:topic}.
##   asking-explains                   explains                                {capitalize the target} {verb:explains target} about {verbatim:topic}.
##   asking-already-told               already_told                            {capitalize the target} {verb:says target}, "I already told you about that."
##   asking-remembers                  remembers                               {capitalize the target} {verb:says target}, "Ah yes, about {verbatim:topic}..."
##   asking-not-yet                    not_yet                                 {capitalize the target} {verb:says target}, "I can't tell you about that yet."
##   asking-must-do-first              must_do_first                           {capitalize the target} {verb:says target}, "There's something you need to do first."
##   asking-earned-trust               earned_trust                            {capitalize the target} {verb:says target}, "Since you've proven yourself, I'll tell you..."

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.ask_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
