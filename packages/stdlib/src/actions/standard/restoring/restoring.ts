/**
 * Restoring action - restore saved game state
 *
 * This is a meta action that triggers game restore functionality.
 * It emits a platform event that the engine will process after turn completion.
 *
 * Four-phase pattern:
 * 1. validate: Check if restore is allowed, check for available saves
 * 2. execute: Analyze restore context, store in sharedData (no world mutations)
 * 3. blocked: Handle validation failures
 * 4. report: Emit platform event and notifications
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createRestoreRequestedEvent, IRestoreContext } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { RestoreRequestedEventData } from './restoring-events';

interface SaveInfo {
  slot: string;
  name: string;
  timestamp: number;
  metadata: {
    score?: number;
    moves?: number;
    version?: string;
  };
}

interface RestoringSharedData {
  saveName: string;
  availableSaves: SaveInfo[];
  lastSave: { slot: string; timestamp: number } | null;
  restoreContext: IRestoreContext;
  eventData: RestoreRequestedEventData;
}

/**
 * Build list of available saves from game state
 * Filters out autosave - that's for internal use only
 */
function buildAvailableSaves(existingSaves: Record<string, any>): SaveInfo[] {
  return Object.entries(existingSaves)
    .filter(([slot]) => slot !== 'autosave')
    .map(([slot, data]: [string, any]) => ({
      slot,
      name: data.name || slot,
      timestamp: data.timestamp || Date.now(),
      metadata: {
        score: data.score,
        moves: data.moves,
        version: data.version
      }
    }));
}

/**
 * Find the most recent save
 */
function findLastSave(saves: SaveInfo[]): { slot: string; timestamp: number } | null {
  if (saves.length === 0) return null;

  const latest = saves.reduce((best, save) =>
    !best || save.timestamp > best.timestamp ? save : best
  , null as SaveInfo | null);

  return latest ? { slot: latest.slot, timestamp: latest.timestamp } : null;
}

/**
 * Analyze restore context from game state
 */
function analyzeRestoreContext(context: ActionContext, saveName: string): RestoringSharedData {
  // Get game state
  const sharedData = context.world.getCapability('sharedData') || {};
  const existingSaves = sharedData.saves || {};

  // Build available saves info
  const availableSaves = buildAvailableSaves(existingSaves);
  const lastSave = findLastSave(availableSaves);

  // Build restore context
  const restoreContext: IRestoreContext = {
    slot: saveName !== 'default' ? saveName : undefined,
    availableSaves,
    lastSave: lastSave || undefined
  };

  // Build event data
  const eventData: RestoreRequestedEventData = {
    saveName,
    timestamp: Date.now(),
    availableSaves: availableSaves.length
  };

  return {
    saveName,
    availableSaves,
    lastSave,
    restoreContext,
    eventData
  };
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

    // Check if any user saves exist (autosave doesn't count)
    const userSaves = Object.keys(existingSaves).filter(slot => slot !== 'autosave');
    if (userSaves.length === 0) {
      return {
        valid: false,
        error: 'no_saves'
      };
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Extract save slot or name if provided
    const saveName = context.command.parsed.extras?.name ||
                    context.command.parsed.extras?.slot ||
                    context.command.indirectObject?.parsed?.text ||
                    'default';

    // Analyze restore context and store in sharedData
    const data = analyzeRestoreContext(context, saveName);
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
    const data = context.sharedData as RestoringSharedData;

    // Emit platform restore requested event
    // The engine will handle this after turn completion
    const platformEvent = createRestoreRequestedEvent(data.restoreContext);
    events.push(platformEvent);

    // Emit the restore requested event
    events.push(context.event('if.event.restore_requested', data.eventData));

    return events;
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
