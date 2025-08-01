/**
 * Quitting action - quit the game
 * 
 * This action emits a platform event that will be processed after turn completion.
 * The engine will handle any necessary confirmations through its quit hook.
 */

import { Action, EnhancedActionContext } from '../../enhanced-types';
import { SemanticEvent, createQuitRequestedEvent, QuitContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { QuitRequestedEventData } from './quitting-events';

export const quittingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const events: SemanticEvent[] = [];
    
    // Get game state for context
    const sharedData = context.world.getCapability('sharedData') || {};
    const hasUnsavedProgress = (sharedData.moves || 0) > (sharedData.lastSaveMove || 0);
    const score = sharedData.score || 0;
    const maxScore = sharedData.maxScore || 0;
    const moves = sharedData.moves || 0;
    const nearComplete = maxScore > 0 && (score / maxScore) > 0.8;
    
    // Check if force quit
    const forceQuit = context.command.parsed.extras?.force || 
                     context.command.parsed.extras?.now ||
                     context.command.parsed.action === 'exit';
    
    // Build quit context
    const quitContext: QuitContext = {
      score,
      moves,
      hasUnsavedChanges: hasUnsavedProgress,
      force: forceQuit,
      stats: {
        maxScore,
        nearComplete,
        playTime: sharedData.playTime || 0,
        achievements: sharedData.achievements || []
      }
    };
    
    // Emit platform quit requested event
    // The engine will handle this after turn completion
    const platformEvent = createQuitRequestedEvent(quitContext);
    events.push(platformEvent);
    
    // Emit a notification that quit was requested
    // The actual quit handling will be done by the platform
    const eventData: QuitRequestedEventData = {
      timestamp: Date.now(),
      hasUnsavedChanges: hasUnsavedProgress,
      force: forceQuit,
      score,
      moves
    };
    
    events.push(context.event('if.event.quit_requested', eventData));
    
    // If not force quit and there are unsaved changes, emit a hint
    if (!forceQuit && hasUnsavedProgress) {
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
  
  group: "meta"
};
