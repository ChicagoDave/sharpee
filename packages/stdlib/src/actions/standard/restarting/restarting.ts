/**
 * Restarting action - restart the game from the beginning
 *
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its restart hook.
 *
 * Three-phase pattern:
 * - validate: Check if restart is allowed, gather game state
 * - execute: Analyze restart context, store in sharedData (no world mutations)
 * - report: Emit platform event and notifications
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createRestartRequestedEvent, IRestartContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestartRequestedEventData } from './restarting-events';
import { handleReportErrors } from '../../base/report-helpers';

interface RestartingSharedData {
  forceRestart: boolean;
  hasUnsavedProgress: boolean;
  score: number;
  moves: number;
  currentLocation: string;
  restartContext: IRestartContext;
  eventData: RestartRequestedEventData;
  showHint: boolean;
}

/**
 * Analyze restart context from game state
 */
function analyzeRestartContext(context: ActionContext): RestartingSharedData {
  // Get game state for context
  const sharedData = context.world.getCapability('sharedData') || {};
  const hasUnsavedProgress = sharedData.moves > (sharedData.lastSaveMove || 0);
  const score = sharedData.score || 0;
  const moves = sharedData.moves || 0;
  const currentLocation = context.currentLocation?.name || 'unknown';

  // Check if force restart
  const forceRestart = context.command.parsed.extras?.force ||
                      context.command.parsed.extras?.now ||
                      context.command.parsed.action === 'reset';

  // Build restart context
  const restartContext: IRestartContext = {
    currentProgress: {
      score,
      moves,
      location: currentLocation
    },
    confirmationRequired: !forceRestart && (hasUnsavedProgress || moves > 10),
    hasUnsavedChanges: hasUnsavedProgress,
    force: forceRestart
  };

  // Build event data
  const eventData: RestartRequestedEventData = {
    timestamp: Date.now(),
    hasUnsavedChanges: hasUnsavedProgress,
    force: forceRestart,
    currentProgress: {
      score,
      moves,
      location: currentLocation
    }
  };

  // Show hint if not force restart and there's significant progress
  const showHint = !forceRestart && (hasUnsavedProgress || moves > 10);

  return {
    forceRestart,
    hasUnsavedProgress,
    score,
    moves,
    currentLocation,
    restartContext,
    eventData,
    showHint
  };
}

export const restartingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.RESTARTING,
  requiredMessages: [
    // Confirmation messages
    'restart_confirm',
    'restart_unsaved',
    'restart_requested',
    // Status messages
    'game_restarting',
    'starting_over',
    'new_game'
  ],

  validate(context: ActionContext): ValidationResult {
    // Restart is always allowed - platform handles confirmation
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Analyze restart context and store in sharedData
    const data = analyzeRestartContext(context);
    Object.assign(context.sharedData, data);
  },

  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const events: ISemanticEvent[] = [];
    const data = context.sharedData as RestartingSharedData;

    // Emit platform restart requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestartRequestedEvent(data.restartContext);
    events.push(platformEvent);

    // Emit the restart requested event
    events.push(context.event('if.event.restart_requested', data.eventData));

    // If not force restart and there's significant progress, emit a hint
    if (data.showHint) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'restart_requested',
        params: {
          hint: 'The game will ask for confirmation before restarting.'
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
