## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.waiting`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/waiting/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: waiting" by "Sharpee (generated)"
  id: stdlib-chord-waiting
  version: 1.0.0
  reference-only: true

## Action  : if.action.waiting
## Group   : meta
## Verbs   : wait, z
## Emits   : if.event.wait_blocked, if.event.waited
## Summary : WAIT/Z - Wait for time to pass without doing anything. Example: Z

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   waiting-waited                    waited                                  Time passes.
##   waiting-waited-patiently          waited_patiently                        {You} {wait} patiently.
##   waiting-time-passes               time_passes                             Time passes...
##   waiting-nothing-happens           nothing_happens                         {You} {wait}. Nothing happens.
##   waiting-waited-in-vehicle         waited_in_vehicle                       {You} {wait} in {the vehicle}.
##   waiting-waited-for-event          waited_for_event                        {You} {wait} for something to happen.
##   waiting-waited-anxiously          waited_anxiously                        {You} {wait} anxiously.
##   waiting-waited-briefly            waited_briefly                          {You} {wait} for a moment.
##   waiting-something-approaches      something_approaches                    As {you} {wait}, {you} {hear} something approaching.
##   waiting-time-runs-out             time_runs_out                           {You}'ve waited too long!
##   waiting-patience-rewarded         patience_rewarded                       {Your} patience is rewarded.
##   waiting-grows-restless            grows_restless                          {You} {grow} restless from waiting.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.wait_blocked (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
