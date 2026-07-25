## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.unlocking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/unlocking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: unlocking" by "Sharpee (generated)"
  id: stdlib-chord-unlocking
  version: 1.0.0
  reference-only: true

## Action  : if.action.unlocking
## Group   : lock_manipulation
## Verbs   : unlock, unlock  with, open  with
## Objects : direct object required
## Slots   : target, key   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.unlock_blocked, if.event.unlocked
## Summary : UNLOCK - Unlock doors and containers with the appropriate key. Example: UNLOCK CHEST WITH KEY

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   unlocking-no-target               no_target                               Unlock what?
##   unlocking-not-lockable            not_lockable                            {capitalize the item} can't be unlocked.
##   unlocking-no-key                  no_key                                  What do {you} want to unlock it with?
##   unlocking-wrong-key               wrong_key                               {capitalize the key} doesn't fit {the item}.
##   unlocking-already-unlocked        already_unlocked                        {capitalize the item} {verb:is item} already unlocked.
##   unlocking-unlocked                unlocked                                {You} {unlock} {the item}.
##   unlocking-unlocked-with           unlocked_with                           {You} {unlock} {the item} with {the key}.
##   unlocking-cant-reach              cant_reach                              {You} {can't} reach {the item}.
##   unlocking-key-not-held            key_not_held                            {You} {need} to be holding {the key}.
##   unlocking-still-locked            still_locked                            {capitalize the item} {verb:is item} locked.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.unlock_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
