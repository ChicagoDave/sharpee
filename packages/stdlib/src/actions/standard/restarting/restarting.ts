/**
 * Restarting action - restart the game from the beginning
 * 
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its restart hook.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent, createRestartRequestedEvent, RestartContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestartRequestedEventData } from './restarting-events';

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
  
  execute(context: ActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    
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
    const restartContext: RestartContext = {
      currentProgress: {
        score,
        moves,
        location: currentLocation
      },
      confirmationRequired: !forceRestart && (hasUnsavedProgress || moves > 10),
      hasUnsavedChanges: hasUnsavedProgress,
      force: forceRestart
    };
    
    // Emit platform restart requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestartRequestedEvent(restartContext);
    events.push(platformEvent);
    
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
    
    events.push(context.event('if.event.restart_requested', eventData));
    
    // If not force restart and there's significant progress, emit a hint
    if (!forceRestart && (hasUnsavedProgress || moves > 10)) {
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
