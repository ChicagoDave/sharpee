## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.locking`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/locking/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: locking" by "Sharpee (generated)"
  id: stdlib-chord-locking
  version: 1.0.0
  reference-only: true

## Action  : if.action.locking
## Group   : lock_manipulation
## Verbs   : lock, lock  with, secure, secure  with
## Objects : direct object required
## Slots   : target, key   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.lock_blocked, if.event.locked
## Summary : LOCK - Lock doors and containers with the appropriate key. Example: LOCK DOOR WITH KEY

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   locking-no-target                 no_target                               Lock what?
##   locking-not-lockable              not_lockable                            {capitalize the item} can't be locked.
##   locking-no-key                    no_key                                  What do {you} want to lock it with?
##   locking-wrong-key                 wrong_key                               {capitalize the key} doesn't fit {the item}.
##   locking-already-locked            already_locked                          {capitalize the item} {verb:is item} already locked.
##   locking-not-closed                not_closed                              {You} {need} to close {the item} first.
##   locking-locked                    locked                                  {You} {lock} {the item}.
##   locking-locked-with               locked_with                             {You} {lock} {the item} with {the key}.
##   locking-cant-reach                cant_reach                              {You} {can't} reach {the item}.
##   locking-key-not-held              key_not_held                            {You} {need} to be holding {the key}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.lock_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
