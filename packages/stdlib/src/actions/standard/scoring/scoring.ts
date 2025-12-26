/**
 * Scoring action - displays the player's current score
 *
 * This is a meta action that shows game progress information
 * without changing the world state.
 *
 * Uses three-phase pattern:
 * 1. validate: Check if scoring is enabled
 * 2. execute: Compute score data (no world mutations)
 * 3. report: Emit score events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { StandardCapabilities } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScoreDisplayedEventData } from './scoring-events';
import { handleReportErrors } from '../../base/report-helpers';

interface ScoringState {
  eventData: ScoreDisplayedEventData;
  params: Record<string, any>;
  messageId: string;
  achievements: string[];
  progressMessage?: string;
}

/**
 * Shared data passed between execute and report phases
 */
interface ScoringSharedData {
  eventData?: ScoreDisplayedEventData;
  params?: Record<string, any>;
  messageId?: string;
  achievements?: string[];
  progressMessage?: string;
}

function getScoringSharedData(context: ActionContext): ScoringSharedData {
  return context.sharedData as ScoringSharedData;
}

/**
 * Analyzes score data - shared between phases
 */
function analyzeScoring(context: ActionContext): ScoringState | null {
  const scoringData = context.world.getCapability(StandardCapabilities.SCORING);
  if (!scoringData) {
    return null;
  }

  const score = scoringData.scoreValue || 0;
  const maxScore = scoringData.maxScore || 0;
  const moves = scoringData.moves || 0;
  const achievements = scoringData.achievements || [];

  const eventData: ScoreDisplayedEventData = { score, maxScore, moves };
  const params: Record<string, any> = { score, maxScore, moves };
  let messageId = 'score_simple';

  if (maxScore > 0) {
    const percentage = Math.round((score / maxScore) * 100);
    eventData.percentage = percentage;
    params.percentage = percentage;

    if (score === maxScore) {
      messageId = 'perfect_score';
    } else {
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
    messageId = 'score_display';
  }

  if (achievements.length > 0) {
    eventData.achievements = achievements;
    params.achievements = achievements.join(', ');
  }

  let progressMessage: string | undefined;
  if (maxScore > 0) {
    const percentage = (score / maxScore) * 100;
    if (percentage === 100) progressMessage = 'game_complete';
    else if (percentage >= 75) progressMessage = 'late_game';
    else if (percentage >= 25) progressMessage = 'mid_game';
    else progressMessage = 'early_game';
    eventData.progress = progressMessage as 'early_game' | 'mid_game' | 'late_game' | 'game_complete';
  }

  return { eventData, params, messageId, achievements, progressMessage };
}

export const scoringAction: Action & { metadata: ActionMetadata } = {
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
  
  validate(context: ActionContext): ValidationResult {
    // Check if scoring is enabled
    const scoringData = context.world.getCapability(StandardCapabilities.SCORING);
    if (!scoringData) {
      return { valid: false, error: 'scoring_not_enabled' };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Scoring has NO world mutations
    // Compute score data and store in sharedData for report phase
    const analysis = analyzeScoring(context);
    const sharedData = getScoringSharedData(context);

    if (analysis) {
      sharedData.eventData = analysis.eventData;
      sharedData.params = analysis.params;
      sharedData.messageId = analysis.messageId;
      sharedData.achievements = analysis.achievements;
      sharedData.progressMessage = analysis.progressMessage;
    }
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getScoringSharedData(context);

    if (!sharedData.eventData) {
      return events;
    }

    // Emit score_displayed event
    events.push(context.event('if.event.score_displayed', sharedData.eventData));

    // Emit main score message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: sharedData.messageId || 'score_simple',
      params: sharedData.params || {}
    }));

    // Emit achievements message if any
    if (sharedData.achievements && sharedData.achievements.length > 0) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'with_achievements',
        params: sharedData.params || {}
      }));
    }

    // Emit progress message if determined
    if (sharedData.progressMessage) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: sharedData.progressMessage,
        params: sharedData.params || {}
      }));
    }

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
