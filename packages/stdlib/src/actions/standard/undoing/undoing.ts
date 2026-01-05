/**
 * Undoing action - undo the previous turn
 *
 * This is a meta action that triggers the engine's undo functionality.
 * It emits a platform event that the engine processes to restore
 * the previous game state.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createUndoRequestedEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';

export const undoingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.UNDOING,

  requiredMessages: [
    'undo_success',
    'undo_failed',
    'nothing_to_undo'
  ],

  validate(_context: ActionContext): ValidationResult {
    // Undo is always valid - the engine will determine if there's anything to undo
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // No world mutations - undo is handled by the engine
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    // Undo should never be blocked
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Emit platform undo requested event
    // The engine will handle this after turn completion
    const platformEvent = createUndoRequestedEvent();
    return [platformEvent];
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
