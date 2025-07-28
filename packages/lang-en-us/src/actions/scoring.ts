/**
 * Language content for scoring action
 */

export const scoringLanguage = {
  actionId: 'if.action.scoring',
  
  patterns: [
    'score',
    'points'
  ],
  
  messages: {
    // Error messages
    'scoring_not_enabled': "There is no score in this game.",
    
    // Success messages
    'score_display': "You have scored {score} out of a possible {maxScore}, in {moves} turns.",
    'score_simple': "Your score is {score} points.",
    'score_with_rank': "You have scored {score} out of {maxScore}, earning you the rank of {rank}.",
    'perfect_score': "You have achieved a perfect score of {maxScore} points!",
    
    // Rank-specific messages
    'rank_novice': "You are ranked as a Novice adventurer.",
    'rank_amateur': "You are ranked as an Amateur adventurer.",
    'rank_proficient': "You are ranked as a Proficient adventurer.",
    'rank_expert': "You are ranked as an Expert adventurer.",
    'rank_master': "You are ranked as a Master adventurer!",
    
    // Achievement messages
    'with_achievements': "You have earned the following achievements: {achievements}.",
    'no_achievements': "You haven't earned any special achievements yet.",
    
    // Progress messages
    'early_game': "You're just getting started!",
    'mid_game': "You're making good progress.",
    'late_game': "You're nearing the end of your adventure.",
    'game_complete': "You have completed the game!"
  },
  
  help: {
    description: 'Display your current score and game progress.',
    examples: 'score, points',
    summary: 'SCORE - Display your current score and game progress. Example: SCORE'
  }
};
