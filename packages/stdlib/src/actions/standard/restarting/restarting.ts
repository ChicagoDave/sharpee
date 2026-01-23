/**
 * Restarting action - restart the game from the beginning
 *
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its restart hook.
 *
 * Four-phase pattern:
 * 1. validate: Check if restart is allowed, gather game state
 * 2. execute: Analyze restart context, store in sharedData (no world mutations)
 * 3. blocked: Handle validation failures (n/a - always succeeds)
 * 4. report: Emit platform event and notifications
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createRestartRequestedEvent, IRestartContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestartRequestedEventData } from './restarting-events';

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

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Restarting always succeeds, but include blocked for consistency
    return [context.event('if.event.restart_blocked', {
      messageId: `if.action.restarting.${result.error}`,
      params: result.params || {},
      blocked: true,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const data = context.sharedData as RestartingSharedData;

    // Emit platform restart requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestartRequestedEvent(data.restartContext);
    events.push(platformEvent);

    // Emit the restart requested event
    events.push(context.event('if.event.restart_requested', data.eventData));

    // Hint about confirmation is conveyed via the restart_requested event's data
    // (showHint, hasUnsavedChanges fields)

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
