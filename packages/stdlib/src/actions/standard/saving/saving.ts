/**
 * Saving action - save game state
 *
 * This is a meta action that triggers game save functionality.
 * It emits a platform event that the engine will process after turn completion.
 *
 * Four-phase pattern:
 * 1. validate: Check if save is allowed, validate save name
 * 2. execute: Analyze save context, store in sharedData (no world mutations)
 * 3. blocked: Handle validation failures
 * 4. report: Emit platform event and notifications
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createSaveRequestedEvent, ISaveContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { SaveRequestedEventData } from './saving-events';

interface SavingSharedData {
  saveName: string;
  isQuickSave: boolean;
  isAutoSave: boolean;
  score: number;
  moves: number;
  turnCount: number;
  saveContext: ISaveContext;
  eventData: SaveRequestedEventData;
}

/**
 * Analyze save context from game state
 */
function analyzeSaveContext(context: ActionContext, saveName: string): SavingSharedData {
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

  // Build event data
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
    saveName,
    isQuickSave,
    isAutoSave,
    score,
    moves,
    turnCount,
    saveContext,
    eventData
  };
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
    // Extract save slot or name if provided
    const saveName = context.command.parsed.extras?.name ||
                    context.command.parsed.extras?.slot ||
                    context.command.indirectObject?.parsed?.text ||
                    'default';

    // Get game state info
    const sharedData = context.world.getCapability('sharedData') || {};

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

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Extract save slot or name if provided
    const saveName = context.command.parsed.extras?.name ||
                    context.command.parsed.extras?.slot ||
                    context.command.directObject?.parsed?.text ||
                    'default';

    // Analyze save context and store in sharedData
    const data = analyzeSaveContext(context, saveName);
    Object.assign(context.sharedData, data);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];
    const data = context.sharedData as SavingSharedData;

    // Emit platform save requested event
    // The engine will handle this after turn completion
    const platformEvent = createSaveRequestedEvent(data.saveContext);
    events.push(platformEvent);

    // Emit the save requested event
    events.push(context.event('if.event.save_requested', data.eventData));

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
