/**
 * Again action - repeats the last executed command
 * 
 * This meta action allows players to repeat their previous command
 * using AGAIN or G. Useful for repetitive actions like moving in
 * the same direction or taking multiple objects.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { StandardCapabilities } from '@sharpee/world-model';
import { CommandHistoryData, CommandHistoryEntry } from '../../../capabilities/command-history';
import { RepeatingCommandEventData, ExecuteCommandEventData } from './again-events';

interface AgainState {
  lastEntry: CommandHistoryEntry;
  repeatingData: RepeatingCommandEventData;
  executeData: ExecuteCommandEventData;
}

export const againAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.AGAIN,
  requiredMessages: [
    'no_command_to_repeat',
    'cant_repeat_that',
    'repeated_command',
    'cant_repeat_again',
    'cant_repeat_meta',
    'repeating',
    'repeating_action'
  ],
  
  validate(context: ActionContext): ValidationResult {
    // Get command history from capabilities
    const historyData = context.world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData | null;
    
    if (!historyData || !historyData.entries || historyData.entries.length === 0) {
      return {
        valid: false,
        error: 'no_command_to_repeat'
      };
    }
    
    // Get the last command entry
    const lastEntry = historyData.entries[historyData.entries.length - 1];
    
    // Define non-repeatable actions
    const nonRepeatable = [
      IFActions.AGAIN,       // Can't repeat AGAIN itself
      IFActions.SAVING,      // Don't repeat save
      IFActions.RESTORING,   // Don't repeat restore
      IFActions.QUITTING,    // Don't repeat quit
      IFActions.RESTARTING,  // Don't repeat restart
      IFActions.VERSION,     // Don't repeat version
      IFActions.VERIFYING    // Don't repeat verify
    ];
    
    // Check if the action is repeatable
    if (nonRepeatable.includes(lastEntry.actionId as any)) {
      // Special message for trying to repeat AGAIN
      if (lastEntry.actionId === IFActions.AGAIN) {
        return {
          valid: false,
          error: 'cant_repeat_again'
        };
      }
      // Generic message for other non-repeatable actions
      // Extract the verb from the original command for the error message
      const actionVerb = lastEntry.originalText?.split(' ')[0]?.toLowerCase() || 'command';
      return {
        valid: false,
        error: 'cant_repeat_meta',
        params: { action: actionVerb }
      };
    }
    
    // Prepare event data for repeating the command
    const repeatingData: RepeatingCommandEventData = {
      originalCommand: lastEntry.originalText,
      actionId: lastEntry.actionId,
      turnNumber: lastEntry.turnNumber
    };
    
    const executeData: ExecuteCommandEventData = {
      command: lastEntry.parsedCommand,
      originalText: lastEntry.originalText,
      isRepeat: true
    };
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    // Reconstruct state from context
    const historyData = context.world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData | null;
    if (!historyData || !historyData.entries || historyData.entries.length === 0) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_command_to_repeat'
      })];
    }
    
    const lastEntry = historyData.entries[historyData.entries.length - 1];
    
    // Check if the command is repeatable (same logic as validate)
    const nonRepeatable = [
      IFActions.AGAIN,       // Can't repeat AGAIN itself
      IFActions.SAVING,      // Don't repeat save
      IFActions.RESTORING,   // Don't repeat restore
      IFActions.QUITTING,    // Don't repeat quit
      IFActions.RESTARTING,  // Don't repeat restart
      IFActions.VERSION,     // Don't repeat version
      IFActions.VERIFYING    // Don't repeat verify
    ];
    
    if (nonRepeatable.includes(lastEntry.actionId as any)) {
      // Special message for trying to repeat AGAIN
      if (lastEntry.actionId === IFActions.AGAIN) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'cant_repeat_again'
        })];
      }
      // Generic message for other non-repeatable actions
      const actionVerb = lastEntry.originalText?.split(' ')[0]?.toLowerCase() || 'command';
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cant_repeat_meta',
        params: { action: actionVerb }
      })];
    }
    
    const repeatingData: RepeatingCommandEventData = {
      originalCommand: lastEntry.originalText,
      actionId: lastEntry.actionId,
      turnNumber: lastEntry.turnNumber || 0
    };
    const executeData: ExecuteCommandEventData = {
      command: lastEntry.parsedCommand,
      originalText: lastEntry.originalText,
      isRepeat: true
    };
    const events: SemanticEvent[] = [];
    
    // Emit a notification about what we're repeating
    events.push(context.event('if.event.repeating_command', repeatingData));
    
    // Add a message about repeating
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId: 'repeating',
      params: {
        command: lastEntry.originalText
      }
    }));
    
    // The actual re-execution of the command will be handled by the engine
    // We emit a special event that tells the engine to re-run the command
    events.push(context.event('if.event.execute_command', executeData));
    
    return events;
  },
  
  group: "meta",
  
  descriptionMessageId: 'again_description',
  examplesMessageId: 'again_examples',
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
