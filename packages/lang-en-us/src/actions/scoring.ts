/**
 * Language content for scoring action (ADR-085)
 */

export const scoringLanguage = {
  actionId: 'if.action.scoring',

  patterns: [
    'score',
    'points'
  ],

  messages: {
    // Disabled scoring (ADR-085) - static message, stories can override
    'no_scoring': "This isn't that kind of game.",

    // Error messages (legacy)
    'scoring_not_enabled': "There is no score in this game.",

    // Score display messages
    'score_display': "{You} {have} scored {score} out of a possible {maxScore}, in {moves} turns.",
    'score_simple': "{Your} score is {score} points.",
    'score_with_rank': "{You} {have} scored {score} out of {maxScore}, earning {you} the rank of {rank}.",
    'perfect_score': "{You} {have} achieved a perfect score of {maxScore} points!",

    // Rank-specific messages (legacy - now use message IDs)
    'rank_novice': "{You} {are} ranked as a Novice adventurer.",
    'rank_amateur': "{You} {are} ranked as an Amateur adventurer.",
    'rank_proficient': "{You} {are} ranked as a Proficient adventurer.",
    'rank_expert': "{You} {are} ranked as an Expert adventurer.",
    'rank_master': "{You} {are} ranked as a Master adventurer!",

    // Achievement messages
    'with_achievements': "{You} {have} earned the following achievements: {achievements}.",
    'no_achievements': "{You} {have}n't earned any special achievements yet.",

    // Progress messages
    'early_game': "{You're} just getting started!",
    'mid_game': "{You're} making good progress.",
    'late_game': "{You're} nearing the end of {your} adventure.",
    'game_complete': "{You} {have} completed the game!"
  },

  help: {
    description: 'Display your current score and game progress.',
    examples: 'score, points',
    summary: 'SCORE - Display your current score and game progress. Example: SCORE'
  }
};

/**
 * Scoring system messages (ADR-085)
 *
 * These are registered with TextService for i18n support.
 * Stories can override by registering their own messages with the same IDs.
 *
 * Note: TextService integration with dynamic messages (functions) is a future enhancement.
 * For now, messages are static strings.
 */
export const scoringSystemMessages: Record<string, string> = {
  // Score change messages (use {points} placeholder)
  'if.score.gained': '{Your} score just increased by {points} points.',
  'if.score.lost': '{You} just lost {points} points!',
  'if.score.display': '{You} {have} scored {score} out of {maxScore}, earning {you} the rank of {rank}.',

  // No-scoring response
  'if.score.no_scoring': "This isn't that kind of game.",

  // Default rank names
  'if.rank.beginner': 'Beginner',
  'if.rank.novice': 'Novice',
  'if.rank.amateur': 'Amateur',
  'if.rank.experienced': 'Experienced',
  'if.rank.proficient': 'Proficient',
  'if.rank.expert': 'Expert',
  'if.rank.master': 'Master',
  'if.rank.winner': 'Winner'
};
