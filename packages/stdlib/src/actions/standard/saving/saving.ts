/**
 * Saving action - save game state
 * 
 * This is a meta action that triggers game save functionality.
 * It emits a platform event that the engine will process after turn completion.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createSaveRequestedEvent, ISaveContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { SaveRequestedEventData } from './saving-events';

interface SavingState {
  saveName: string;
  isQuickSave: boolean;
  isAutoSave: boolean;
  saveContext: ISaveContext;
  eventData: SaveRequestedEventData;
  messageId: string;
  messageParams: Record<string, any>;
}

export const savingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SAVING,
  requiredMessages: [
    'game_saved',
    'game_saved_as',
    'save_successful',
    'save_slot',
    'overwrite_save',
    'save_details',
    'quick_save',
    'auto_save',
    'save_failed',
    'no_save_slots',
    'invalid_save_name',
    'save_not_allowed',
    'save_in_progress',
    'confirm_overwrite',
    'save_reminder',
    'saved_locally',
    'saved_to_cloud',
    'save_exported'
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
    console.log('Saving action - sharedData:', sharedData);
    const score = sharedData.score || 0;
    const moves = sharedData.moves || 0;
    const turnCount = sharedData.turnCount || 0;
    
    // Check save restrictions
    const saveRestrictions = sharedData.saveRestrictions || {};
    
    if (saveRestrictions.disabled) {
      return {
        valid: false,
        error: 'save_not_allowed'
      };
    }
    
    if (saveRestrictions.inProgress) {
      return {
        valid: false,
        error: 'save_in_progress'
      };
    }
    
    // Check if save name is valid
    if (saveName.length > 50 || /[<>:"/\\|?*]/.test(saveName)) {
      return {
        valid: false,
        error: 'invalid_save_name'
      };
    }
    
    // Check if this is a quick save or auto save
    const isQuickSave = saveName === 'quicksave' || context.command.parsed.extras?.quick;
    const isAutoSave = context.command.parsed.extras?.auto;
    
    // Build save context
    const saveContext: ISaveContext = {
      saveName: saveName !== 'default' ? saveName : undefined,
      autosave: isAutoSave,
      timestamp: Date.now(),
      metadata: {
        score,
        moves,
        turnCount,
        quickSave: isQuickSave
      }
    };
    
    // Emit a notification that save was requested
    // The actual save confirmation will come from the platform completion event
    const messageId = isQuickSave ? 'quick_save' : 
                     isAutoSave ? 'auto_save' : 
                     saveName !== 'default' ? 'game_saved_as' : 
                     'game_saved';
    
    const messageParams = {
      saveName,
      score,
      moves
    };
    
    // Note: We don't emit success here - that will come from the platform completion event
    // For now, just acknowledge the save request
    const eventData: SaveRequestedEventData = {
      saveName,
      timestamp: saveContext.timestamp,
      metadata: {
        score,
        moves,
        turnCount,
        quickSave: isQuickSave
      }
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
    const score = sharedData.score || 0;
    const moves = sharedData.moves || 0;
    const turnCount = sharedData.turnCount || 0;
    
    // Check if this is a quick save or auto save
    const isQuickSave = saveName === 'quicksave' || context.command.parsed.extras?.quick;
    const isAutoSave = context.command.parsed.extras?.auto;
    
    // Build save context
    const saveContext: ISaveContext = {
      saveName: saveName !== 'default' ? saveName : undefined,
      autosave: isAutoSave,
      timestamp: Date.now(),
      metadata: {
        score,
        moves,
        turnCount,
        quickSave: isQuickSave
      }
    };
    
    const eventData: SaveRequestedEventData = {
      saveName,
      timestamp: saveContext.timestamp,
      metadata: {
        score,
        moves,
        turnCount,
        quickSave: isQuickSave
      }
    };
    
    // Emit platform save requested event
    // The engine will handle this after turn completion
    const platformEvent = createSaveRequestedEvent(saveContext);
    events.push(platformEvent);
    
    // Emit the save requested event
    events.push(context.event('if.event.save_requested', eventData));
    
    return events;
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
