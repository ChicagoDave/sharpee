/**
 * Again action - repeat the last successful command
 *
 * This is a meta action that triggers the engine to re-execute
 * the previous command. It emits a platform event that the engine
 * processes to repeat the last command.
 *
 * Uses four-phase pattern:
 * 1. validate: Check if there's a command in history to repeat
 * 2. execute: No world mutations (meta-action)
 * 3. blocked: Handle validation failures (nothing to repeat)
 * 4. report: Emit platform.again_requested for engine
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent, createAgainRequestedEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { CommandHistoryData } from '../../../capabilities/command-history';

/**
 * Shared data passed between validate and report phases
 */
interface AgainSharedData {
  lastCommand?: string;
  lastActionId?: string;
}

function getAgainSharedData(context: ActionContext): AgainSharedData {
  return context.sharedData as AgainSharedData;
}

export const againAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.AGAIN,

  requiredMessages: [
    'nothing_to_repeat'
  ],

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    // Get command history capability
    const historyData = context.world.getCapability('commandHistory') as CommandHistoryData | null;

    if (!historyData || !historyData.entries || historyData.entries.length === 0) {
      return {
        valid: false,
        error: 'nothing_to_repeat'
      };
    }

    // Store last command info in sharedData for report phase
    const lastEntry = historyData.entries[historyData.entries.length - 1];
    const sharedData = getAgainSharedData(context);
    sharedData.lastCommand = lastEntry.originalText;
    sharedData.lastActionId = lastEntry.actionId;

    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // No world mutations - again is handled by the engine
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('if.event.again_blocked', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getAgainSharedData(context);

    // Emit platform again requested event
    // The engine will handle this after turn completion
    const platformEvent = createAgainRequestedEvent({
      command: sharedData.lastCommand!,
      actionId: sharedData.lastActionId!
    });

    return [platformEvent];
  }
};
