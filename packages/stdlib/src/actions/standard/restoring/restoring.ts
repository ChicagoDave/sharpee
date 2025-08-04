/**
 * Restoring action - restore saved game state
 * 
 * This is a meta action that triggers game restore functionality.
 * It emits a platform event that the engine will process after turn completion.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent, createRestoreRequestedEvent, RestoreContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestoreRequestedEventData } from './restoring-events';

export const restoringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.RESTORING,
  requiredMessages: [
    'game_restored',
    'game_loaded',
    'restore_successful',
    'welcome_back',
    'restore_details',
    'quick_restore',
    'resuming_game',
    'restore_failed',
    'save_not_found',
    'no_saves',
    'corrupt_save',
    'incompatible_save',
    'restore_not_allowed',
    'confirm_restore',
    'unsaved_progress',
    'available_saves',
    'no_saves_available',
    'choose_save',
    'import_save',
    'save_imported'
  ],
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Extract save slot or name if provided
    const saveName = context.command.parsed.extras?.name || 
                    context.command.parsed.extras?.slot ||
                    context.command.indirectObject?.parsed.text ||
                    'default';
    
    // Get game state info
    const sharedData = context.world.getCapability('sharedData') || {};
    const existingSaves = sharedData.saves || {};
    
    // Check for restore restrictions
    const restoreRestrictions = sharedData.restoreRestrictions || {};
    
    if (restoreRestrictions.disabled) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'restore_not_allowed',
        reason: 'restore_not_allowed'
      })];
    }
    
    // Build available saves info
    const availableSaves = Object.entries(existingSaves).map(([slot, data]: [string, any]) => ({
      slot,
      name: data.name || slot,
      timestamp: data.timestamp || Date.now(),
      metadata: {
        score: data.score,
        moves: data.moves,
        version: data.version
      }
    }));
    
    // Check if any saves exist
    if (availableSaves.length === 0) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_saves',
        reason: 'no_saves'
      })];
    }
    
    // Find last save info
    const lastSave = availableSaves.reduce((latest, save) => 
      !latest || save.timestamp > latest.timestamp ? save : latest
    , null as any);
    
    // Build restore context
    const restoreContext: RestoreContext = {
      slot: saveName !== 'default' ? saveName : undefined,
      availableSaves,
      lastSave: lastSave ? {
        slot: lastSave.slot,
        timestamp: lastSave.timestamp
      } : undefined
    };
    
    // Create events
    const events: SemanticEvent[] = [];
    
    // Emit platform restore requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestoreRequestedEvent(restoreContext);
    events.push(platformEvent);
    
    // Emit a notification that restore was requested
    // The actual restore confirmation will come from the platform completion event
    const eventData: RestoreRequestedEventData = {
      saveName,
      timestamp: Date.now(),
      availableSaves: availableSaves.length
    };
    
    events.push(context.event('if.event.restore_requested', eventData));
    
    return events;
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
