## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.giving`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/giving/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: giving" by "Sharpee (generated)"
  id: stdlib-chord-giving
  version: 1.0.0
  reference-only: true

## Action  : if.action.giving
## Group   : social
## Verbs   : give  to, give, offer  to, offer, hand  to, hand, present  to, present
## Objects : direct object required; indirect object required
## Slots   : item, recipient   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.give_blocked, if.event.given
## Summary : GIVE TO - Give objects to other characters. Example: GIVE FLOWER TO ALICE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   giving-no-item                    no_item                                 Give what?
##   giving-no-recipient               no_recipient                            Give it to whom?
##   giving-not-holding                not_holding                             {You} aren't holding {the item}.
##   giving-recipient-not-visible      recipient_not_visible                   {You} {can't} see {the recipient}.
##   giving-recipient-not-reachable    recipient_not_reachable                 {capitalize the recipient} {verb:is recipient} too far away.
##   giving-not-actor                  not_actor                               {You} can only give things to people.
##   giving-self                       self                                    {You} already {have} {the item}!
##   giving-inventory-full             inventory_full                          {capitalize the recipient} says, "I can't carry any more."
##   giving-too-heavy                  too_heavy                               {capitalize the recipient} says, "That's too heavy for me."
##   giving-not-interested             not_interested                          {capitalize the recipient} doesn't seem interested in {the item}.
##   giving-refuses                    refuses                                 {capitalize the recipient} politely declines.
##   giving-given                      given                                   {You} {give} {the item} to {the recipient}.
##   giving-accepts                    accepts                                 {capitalize the recipient} accepts {the item}.
##   giving-gratefully-accepts         gratefully_accepts                      {capitalize the recipient} gratefully accepts {the item}.
##   giving-reluctantly-accepts        reluctantly_accepts                     {capitalize the recipient} reluctantly takes {the item}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.give_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
