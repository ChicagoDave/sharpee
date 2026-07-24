/**
 * Language content for scoring action (ADR-260, ADR-262).
 *
 * ADR-260 D4 deleted the five `rank_*` lines, the four progress lines, both
 * achievement lines, `scoring_not_enabled` (a duplicate of `no_scoring`), and
 * the whole `scoringSystemMessages` block — thirteen in all. Every one of them
 * was percentage-band prose or a rank name stdlib invented on the author's
 * behalf.
 *
 * A rank's display text still comes from the author's `RankDefinition.name`,
 * carried into `{rank}` as a template parameter. **No message here may ever
 * name a specific rank again** — `{rank}` is the author's, not ours.
 *
 * `promotion` (ADR-262 D3) is the overridable platform fallback a crossing
 * speaks when a rung carries no author `says` phrase: silence is no longer the
 * default, so a phraseless rung renders this line (overridable via
 * `override message scoring-promotion`). It names no rank — `{rank}` is the
 * author's name, exactly as `score_with_rank` uses it.
 */

export const scoringLanguage = {
  actionId: 'if.action.scoring',

  patterns: [
    'score',
    'points'
  ],

  messages: {
    // No scoring installed — now reachable for the first time (ADR-260 D3).
    'no_scoring': "This isn't that kind of game.",

    // Score display messages. `{rank}` is the AUTHOR's rank name.
    'score_simple': "{Your} score is {score} points.",
    'score_display': "{You} {have} scored {score} out of a possible {maxScore}.",
    'score_with_rank': "{You} {have} scored {score} out of {maxScore}, earning {you} the rank of {rank}.",
    'perfect_score': "{You} {have} achieved a perfect score of {maxScore} points!",

    // ADR-262 D3 fallback: spoken on a promotion when the rung has no author
    // `says` phrase. `{rank}` is the author's rank name. Overridable.
    'promotion': "{You} {have} risen to the rank of {rank}."
  },

  help: {
    description: 'Display your current score and game progress.',
    examples: 'score, points',
    summary: 'SCORE - Display your current score and game progress. Example: SCORE'
  }
};
