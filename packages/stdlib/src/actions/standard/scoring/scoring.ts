/**
 * Scoring action — reads the score ledger and says what it finds (ADR-260 D3).
 *
 * This is a meta action: it shows game progress without changing world state.
 *
 * Uses four-phase pattern:
 * 1. validate: Always valid (the "no scoring" case is a message, not a failure)
 * 2. execute: Read the ledger (no world mutations)
 * 3. blocked: Handle validation failures
 * 4. report: Emit the score event
 *
 * **All scoring state lives on the ScoreLedger.** This action reads
 * `isScoringEnabled()`, `getScore()`, `getMaxScore()`, and `getRank()` — and
 * nothing else. It holds no rank logic and invents no prose: a rank's display
 * text is the author's `RankDefinition.name`, carried as a template parameter
 * the same way an entity name is. ADR-260 D4 deleted the percentage-band ranks
 * and progress messages stdlib had no business inventing.
 *
 * The capability this action once read (`StandardCapabilities.SCORING`) was
 * never registered by any production path — see ADR-260's Context.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { blockedMessageId } from '../../lifecycle/index.js';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScoreDisplayedEventData } from './scoring-events.js';

/**
 * Shared data passed between execute and report phases
 */
interface ScoringSharedData {
  /** Whether a scoring registration has installed itself */
  enabled: boolean;
  /** Event data for score_displayed event */
  eventData?: ScoreDisplayedEventData;
  /** Parameters for message templates */
  params?: Record<string, any>;
  /** Message ID to display */
  messageId?: string;
}

function getScoringSharedData(context: ActionContext): ScoringSharedData {
  return context.sharedData as ScoringSharedData;
}

export const scoringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SCORING,
  requiredMessages: [
    'no_scoring',
    'score_display',
    'score_simple',
    'score_with_rank',
    'perfect_score'
  ],

  validate(_context: ActionContext): ValidationResult {
    // Always valid — the disabled case is handled in execute/report
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const sharedData = getScoringSharedData(context);

    // A story that installs no scoring says so honestly, rather than
    // reporting a score of 0 it never meant to keep.
    if (!context.world.isScoringEnabled()) {
      sharedData.enabled = false;
      return;
    }

    sharedData.enabled = true;

    const score = context.world.getScore();
    const maxScore = context.world.getMaxScore();
    const rank = context.world.getRank();

    const eventData: ScoreDisplayedEventData = { score, maxScore };
    const params: Record<string, any> = { score, maxScore };
    let messageId = 'score_simple';

    if (maxScore > 0) {
      const percentage = Math.round((score / maxScore) * 100);
      eventData.percentage = percentage;
      params.percentage = percentage;

      messageId = score === maxScore ? 'perfect_score' : 'score_display';
    }

    // A ladder present and a rung reached is what earns the rank line. The
    // name is the AUTHOR's string — stdlib supplies none.
    if (rank) {
      eventData.rank = rank.id;
      params.rank = rank.name;
      if (messageId !== 'perfect_score') {
        messageId = 'score_with_rank';
      }
    }

    sharedData.eventData = eventData;
    sharedData.params = params;
    sharedData.messageId = messageId;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('if.event.score_displayed', {
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      blocked: true,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getScoringSharedData(context);

    if (!sharedData.enabled) {
      return [context.event('if.event.score_displayed', {
        messageId: 'if.action.scoring.no_scoring',
        params: {},
        enabled: false
      })];
    }

    if (!sharedData.eventData) {
      return [];
    }

    const messageId = `if.action.scoring.${sharedData.messageId || 'score_simple'}`;

    return [context.event('if.event.score_displayed', {
      messageId,
      params: sharedData.params || {},
      ...sharedData.eventData
    })];
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
