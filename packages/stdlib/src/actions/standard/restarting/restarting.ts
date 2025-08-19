/**
 * Restarting action - restart the game from the beginning
 * 
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its restart hook.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createRestartRequestedEvent, IRestartContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestartRequestedEventData } from './restarting-events';

interface RestartingState {
  forceRestart: boolean;
  hasUnsavedProgress: boolean;
  restartContext: IRestartContext;
  eventData: RestartRequestedEventData;
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
    
    // Emit a notification that restart was requested
    // The actual restart handling will be done by the platform
    const eventData: RestartRequestedEventData = {
      timestamp: Date.now(),
      hasUnsavedChanges: hasUnsavedProgress,
      force: forceRestart,
      currentProgress: {
        score: score,
        moves: moves,
        location: currentLocation
      }
    };
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    
    // Rebuild the same data from validate
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
    
    const eventData: RestartRequestedEventData = {
      timestamp: Date.now(),
      hasUnsavedChanges: hasUnsavedProgress,
      force: forceRestart,
      currentProgress: {
        score: score,
        moves: moves,
        location: currentLocation
      }
    };
    
    // Emit platform restart requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestartRequestedEvent(restartContext);
    events.push(platformEvent);
    
    // Emit the restart requested event
    events.push(context.event('if.event.restart_requested', eventData));
    
    // If not force restart and there's significant progress, emit a hint
    if (!forceRestart && (hasUnsavedProgress || (restartContext.currentProgress?.moves ?? 0) > 10)) {
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
