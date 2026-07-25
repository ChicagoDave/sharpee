## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.sleeping`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/sleeping/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: sleeping" by "Sharpee (generated)"
  id: stdlib-chord-sleeping
  version: 1.0.0
  reference-only: true

## Action  : if.action.sleeping
## Group   : meta
## Verbs   : sleep, nap, doze, rest, slumber, z
## Emits   : if.event.sleep_blocked, if.event.slept
## Summary : SLEEP/NAP - Sleep or take a nap to pass time. May have different effects depending on location and circumstances. Example: SLEEP

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   sleeping-slept                    slept                                   {You} {sleep} for a while.
##   sleeping-dozed-off                dozed_off                               {You} {doze} off for a bit.
##   sleeping-fell-asleep              fell_asleep                             {You} {fall} into a deep sleep.
##   sleeping-brief-nap                brief_nap                               {You} {take} a brief nap.
##   sleeping-deep-sleep               deep_sleep                              {You} {fall} into a deep, restful sleep.
##   sleeping-slept-fitfully           slept_fitfully                          {You} {sleep} fitfully.
##   sleeping-cant-sleep-here          cant_sleep_here                         {You} {can't} sleep in {location}.
##   sleeping-too-dangerous-to-sleep   too_dangerous_to_sleep                  It's too dangerous to sleep in {location}.
##   sleeping-already-well-rested      already_well_rested                     {You're} already well-rested and don't feel tired.
##   sleeping-woke-refreshed           woke_refreshed                          {You} {wake} feeling refreshed.
##   sleeping-disturbed-sleep          disturbed_sleep                         {Your} sleep is disturbed.
##   sleeping-nightmares               nightmares                              {You} {have} unsettling dreams.
##   sleeping-peaceful-sleep           peaceful_sleep                          {You} {enjoy} a peaceful sleep.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.sleep_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
