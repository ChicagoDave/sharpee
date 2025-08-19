/**
 * Restoring action - restore saved game state
 * 
 * This is a meta action that triggers game restore functionality.
 * It emits a platform event that the engine will process after turn completion.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createRestoreRequestedEvent, IRestoreContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestoreRequestedEventData } from './restoring-events';

interface RestoringState {
  saveName: string;
  restoreContext: IRestoreContext;
  eventData: RestoreRequestedEventData;
}

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
  
  validate(context: ActionContext): ValidationResult {
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
      return {
        valid: false,
        error: 'restore_not_allowed'
      };
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
      return {
        valid: false,
        error: 'no_saves'
      };
    }
    
    // Find last save info
    const lastSave = availableSaves.reduce((latest, save) => 
      !latest || save.timestamp > latest.timestamp ? save : latest
    , null as any);
    
    // Build restore context
    const restoreContext: IRestoreContext = {
      slot: saveName !== 'default' ? saveName : undefined,
      availableSaves,
      lastSave: lastSave ? {
        slot: lastSave.slot,
        timestamp: lastSave.timestamp
      } : undefined
    };
    
    // Emit a notification that restore was requested
    // The actual restore confirmation will come from the platform completion event
    const eventData: RestoreRequestedEventData = {
      saveName,
      timestamp: Date.now(),
      availableSaves: availableSaves.length
    };
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    
    // Get save name from command - could be provided as extras or directObject
    const extras = context.command.parsed.extras;
    const directText = context.command.directObject?.parsed?.text;
    const saveName = extras?.saveName || directText || 'default';
    
    // Get game state
    const sharedData = context.world.getCapability('sharedData') || {};
    const existingSaves = sharedData.saves || {};
    
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
    
    // Find last save info
    const lastSave = availableSaves.reduce((latest, save) => 
      !latest || save.timestamp > latest.timestamp ? save : latest
    , null as any);
    
    // Build restore context
    const restoreContext: IRestoreContext = {
      slot: saveName !== 'default' ? saveName : undefined,
      availableSaves,
      lastSave: lastSave ? {
        slot: lastSave.slot,
        timestamp: lastSave.timestamp
      } : undefined
    };
    
    const eventData: RestoreRequestedEventData = {
      saveName,
      timestamp: Date.now(),
      availableSaves: availableSaves.length
    };
    
    // Emit platform restore requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestoreRequestedEvent(restoreContext);
    events.push(platformEvent);
    
    // Emit the restore requested event
    events.push(context.event('if.event.restore_requested', eventData));
    
    return events;
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
