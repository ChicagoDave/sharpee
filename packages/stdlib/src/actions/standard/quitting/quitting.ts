/**
 * Quitting action - quit the game
 *
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its quit hook.
 *
 * Uses three-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: Analyze quit context (no world mutations)
 * 3. report: Emit quit events
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createQuitRequestedEvent, IQuitContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { QuitRequestedEventData } from './quitting-events';
import { handleReportErrors } from '../../base/report-helpers';

/**
 * Shared data passed between execute and report phases
 */
interface QuittingSharedData {
  quitContext?: IQuitContext;
  eventData?: QuitRequestedEventData;
  forceQuit?: boolean;
  hasUnsavedProgress?: boolean;
}

function getQuittingSharedData(context: ActionContext): QuittingSharedData {
  return context.sharedData as QuittingSharedData;
}

/**
 * Analyzes quit context - shared between execute and any other phase that needs it
 */
function analyzeQuitContext(context: ActionContext): QuittingSharedData {
  const gameData = context.world.getCapability('sharedData') || {};
  const hasUnsavedProgress = (gameData.moves || 0) > (gameData.lastSaveMove || 0);
  const score = gameData.score || 0;
  const maxScore = gameData.maxScore || 0;
  const moves = gameData.moves || 0;
  const nearComplete = maxScore > 0 && (score / maxScore) > 0.8;

  const forceQuit = context.command.parsed.extras?.force ||
                   context.command.parsed.extras?.now ||
                   context.command.parsed.action === 'exit';

  const quitContext: IQuitContext = {
    score,
    moves,
    hasUnsavedChanges: hasUnsavedProgress,
    force: forceQuit,
    stats: {
      maxScore,
      nearComplete,
      playTime: gameData.playTime || 0,
      achievements: gameData.achievements || []
    }
  };

  const eventData: QuitRequestedEventData = {
    timestamp: Date.now(),
    hasUnsavedChanges: hasUnsavedProgress,
    force: forceQuit,
    score,
    moves
  };

  return { quitContext, eventData, forceQuit, hasUnsavedProgress };
}

export const quittingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.QUITTING,
  requiredMessages: [
    // Query messages
    'quit_confirm_query',
    'quit_save_query',
    'quit_unsaved_query',
    // Status messages
    'quit_requested',
    'game_ending'
  ],
  
  validate(context: ActionContext): ValidationResult {
    // Quitting is always valid - no preconditions
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Quitting has NO world mutations
    // Analyze quit context and store in sharedData for report phase
    const analysis = analyzeQuitContext(context);
    const sharedData = getQuittingSharedData(context);

    sharedData.quitContext = analysis.quitContext;
    sharedData.eventData = analysis.eventData;
    sharedData.forceQuit = analysis.forceQuit;
    sharedData.hasUnsavedProgress = analysis.hasUnsavedProgress;
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const sharedData = getQuittingSharedData(context);

    if (!sharedData.quitContext || !sharedData.eventData) {
      return events;
    }

    // Emit platform quit requested event
    const platformEvent = createQuitRequestedEvent(sharedData.quitContext);
    events.push(platformEvent);

    // Emit client.query event for quit confirmation
    events.push(context.event('client.query', {
      queryId: `quit_${Date.now()}`,
      prompt: 'Are you sure you want to quit?',
      source: 'system',
      type: 'multiple_choice',
      messageId: 'quit_confirm_query',
      options: ['quit', 'cancel'],
      context: sharedData.quitContext
    }));

    // Emit quit_requested notification
    events.push(context.event('if.event.quit_requested', sharedData.eventData));

    // If not force quit and there are unsaved changes, emit a hint
    if (!sharedData.forceQuit && sharedData.hasUnsavedProgress) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'quit_requested',
        params: {
          hint: 'You have unsaved progress. The game will ask for confirmation.'
        }
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
