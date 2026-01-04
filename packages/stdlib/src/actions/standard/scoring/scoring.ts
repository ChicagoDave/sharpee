/**
 * Scoring action - displays the player's current score (ADR-085)
 *
 * This is a meta action that shows game progress information
 * without changing the world state.
 *
 * Uses four-phase pattern:
 * 1. validate: Always valid (but may return "no scoring" message)
 * 2. execute: Compute score data (no world mutations)
 * 3. blocked: Handle validation failures
 * 4. report: Emit score events
 *
 * Scoring capability can be:
 * - Not registered: Show "no scoring" message
 * - Registered but disabled (enabled: false): Show funny "no scoring" message
 * - Registered and enabled: Show score/rank
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { StandardCapabilities } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScoreDisplayedEventData } from './scoring-events';

/**
 * Shared data passed between execute and report phases
 */
interface ScoringSharedData {
  /** Whether scoring is enabled */
  enabled: boolean;
  /** Event data for score_displayed event */
  eventData?: ScoreDisplayedEventData;
  /** Parameters for message templates */
  params?: Record<string, any>;
  /** Message ID to display */
  messageId?: string;
  /** Achievements list */
  achievements?: string[];
  /** Progress message ID */
  progressMessage?: string;
}

function getScoringSharedData(context: ActionContext): ScoringSharedData {
  return context.sharedData as ScoringSharedData;
}

/**
 * Compute rank from score (fallback if not provided by service)
 */
function computeRank(score: number, maxScore: number): string {
  if (maxScore === 0) return 'Beginner';
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Master';
  if (percentage >= 75) return 'Expert';
  if (percentage >= 50) return 'Proficient';
  if (percentage >= 25) return 'Amateur';
  return 'Novice';
}

export const scoringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SCORING,
  requiredMessages: [
    'no_scoring',
    'score_display',
    'score_simple',
    'score_with_rank',
    'perfect_score',
    'with_achievements',
    'early_game',
    'mid_game',
    'late_game',
    'game_complete'
  ],

  validate(_context: ActionContext): ValidationResult {
    // Always valid - we handle disabled case in execute/report
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const sharedData = getScoringSharedData(context);
    const scoringData = context.world.getCapability(StandardCapabilities.SCORING);

    // Check if scoring is enabled
    if (!scoringData || scoringData.enabled === false) {
      sharedData.enabled = false;
      return;
    }

    sharedData.enabled = true;

    // Extract score data from capability
    const score = scoringData.scoreValue || 0;
    const maxScore = scoringData.maxScore || 0;
    const moves = scoringData.moves || 0;
    const achievements = scoringData.achievements || [];
    const rank = scoringData.rank || computeRank(score, maxScore);

    const eventData: ScoreDisplayedEventData = { score, maxScore, moves };
    const params: Record<string, any> = { score, maxScore, moves, rank };
    let messageId = 'score_simple';

    if (maxScore > 0) {
      const percentage = Math.round((score / maxScore) * 100);
      eventData.percentage = percentage;
      params.percentage = percentage;
      eventData.rank = rank;

      if (score === maxScore) {
        messageId = 'perfect_score';
      } else {
        messageId = 'score_with_rank';
      }
    } else if (moves > 0) {
      messageId = 'score_display';
    }

    if (achievements.length > 0) {
      eventData.achievements = achievements;
      params.achievements = achievements.join(', ');
    }

    // Determine progress message
    let progressMessage: string | undefined;
    if (maxScore > 0) {
      const percentage = (score / maxScore) * 100;
      if (percentage === 100) progressMessage = 'game_complete';
      else if (percentage >= 75) progressMessage = 'late_game';
      else if (percentage >= 25) progressMessage = 'mid_game';
      else progressMessage = 'early_game';
      eventData.progress = progressMessage as 'early_game' | 'mid_game' | 'late_game' | 'game_complete';
    }

    sharedData.eventData = eventData;
    sharedData.params = params;
    sharedData.messageId = messageId;
    sharedData.achievements = achievements;
    sharedData.progressMessage = progressMessage;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const sharedData = getScoringSharedData(context);

    // Handle disabled scoring
    if (!sharedData.enabled) {
      events.push(context.event('action.success', {
        actionId: this.id,
        messageId: 'no_scoring',
        params: {}
      }));
      return events;
    }

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
