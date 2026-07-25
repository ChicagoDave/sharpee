## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.scoring`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/scoring/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: scoring" by "Sharpee (generated)"
  id: stdlib-chord-scoring
  version: 1.0.0
  reference-only: true

## Action  : if.action.scoring
## Group   : meta
## Verbs   : score, points
## Emits   : if.event.score_displayed
## Summary : SCORE - Display your current score and game progress. Example: SCORE

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   scoring-no-scoring                no_scoring                              This isn't that kind of game.
##   scoring-score-simple              score_simple                            {Your} score is {score} points.
##   scoring-score-display             score_display                           {You} {have} scored {score} out of a possible {maxScore}.
##   scoring-score-with-rank           score_with_rank                         {You} {have} scored {score} out of {maxScore}, earning {you} the rank of {rank}.
##   scoring-perfect-score             perfect_score                           {You} {have} achieved a perfect score of {maxScore} points!
##   scoring-promotion                 promotion                               {You} {have} risen to the rank of {rank}.

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.score_displayed (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
