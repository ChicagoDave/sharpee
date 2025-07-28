/**
 * Scoring action - displays the player's current score
 * 
 * This is a meta action that shows game progress information
 * without changing the world state.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { StandardCapabilities } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScoreDisplayedEventData } from './scoring-events';

export const scoringAction: Action = {
  id: IFActions.SCORING,
  requiredMessages: [
    'scoring_not_enabled',
    'score_display',
    'score_simple',
    'score_with_rank',
    'perfect_score',
    'rank_novice',
    'rank_amateur',
    'rank_proficient',
    'rank_expert',
    'rank_master',
    'with_achievements',
    'no_achievements',
    'early_game',
    'mid_game',
    'late_game',
    'game_complete'
  ],
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Get scoring capability data
    const scoringData = context.world.getCapability(StandardCapabilities.SCORING);
    
    // If scoring is not enabled
    if (!scoringData) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'scoring_not_enabled',
        reason: 'scoring_not_enabled'
      })];
    }
    
    // Extract score values
    const score = scoringData.scoreValue || 0;
    const maxScore = scoringData.maxScore || 0;
    const moves = scoringData.moves || 0;
    const achievements = scoringData.achievements || [];
    
    // Build event data
    const eventData: ScoreDisplayedEventData = {
      score,
      maxScore,
      moves
    };
    
    const params: Record<string, any> = {
      score,
      maxScore,
      moves
    };
    
    let messageId = 'score_simple';
    
    // Determine appropriate message
    if (maxScore > 0) {
      const percentage = Math.round((score / maxScore) * 100);
      eventData.percentage = percentage;
      params.percentage = percentage;
      
      // Check for perfect score
      if (score === maxScore) {
        messageId = 'perfect_score';
      } else {
        // Traditional IF rankings
        let rank = 'Novice';
        if (percentage >= 90) rank = 'Master';
        else if (percentage >= 75) rank = 'Expert';
        else if (percentage >= 50) rank = 'Proficient';
        else if (percentage >= 25) rank = 'Amateur';
        
        eventData.rank = rank;
        params.rank = rank;
        messageId = 'score_with_rank';
      }
    } else if (moves > 0) {
      // If we have moves but no max score, show standard display
      messageId = 'score_display';
    }
    
    // Include achievements if any
    if (achievements.length > 0) {
      eventData.achievements = achievements;
      params.achievements = achievements.join(', ');
    }
    
    // Determine game progress
    let progressMessage: string | undefined;
    if (maxScore > 0) {
      const percentage = (score / maxScore) * 100;
      if (percentage === 100) {
        progressMessage = 'game_complete';
      } else if (percentage >= 75) {
        progressMessage = 'late_game';
      } else if (percentage >= 25) {
        progressMessage = 'mid_game';
      } else {
        progressMessage = 'early_game';
      }
      eventData.progress = progressMessage as 'early_game' | 'mid_game' | 'late_game' | 'game_complete';
    }
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Create SCORE_DISPLAYED event for world model
    events.push(context.event('if.event.score_displayed', eventData));
    
    // Add main score message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      }));
    
    // Add achievements message if any
    if (achievements.length > 0) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'with_achievements',
        params: params
      }));
    }
    
    // Add progress message if determined
    if (progressMessage) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: progressMessage,
        params: params
      }));
    }
    
    return events;
  },
  
  group: "meta"
};
