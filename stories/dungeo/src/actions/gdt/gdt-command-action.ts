/**
 * GDT Command Action
 *
 * Handles two-letter GDT commands while in GDT mode.
 * Routes commands to the appropriate handler.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { GDT_COMMAND_ACTION_ID, GDTCommandCode, GDTCommandResult } from './types';
import { isGDTActive, createGDTContext } from './gdt-context';
import { parseGDTCommand } from './gdt-parser';
import { executeCommand } from './commands';

/**
 * Shared data for passing parsed command between phases
 */
interface GDTCommandSharedData {
  code?: GDTCommandCode;
  args?: string[];
  rawInput?: string;
  result?: GDTCommandResult;
}

function getSharedData(context: ActionContext): GDTCommandSharedData {
  return context.sharedData as GDTCommandSharedData;
}

export const gdtCommandAction: Action = {
  id: GDT_COMMAND_ACTION_ID,
  group: 'debug',

  validate(context: ActionContext): ValidationResult {
    // Must be in GDT mode
    if (!isGDTActive(context.world)) {
      return {
        valid: false,
        error: 'not_in_gdt_mode',
        params: {}
      };
    }

    // Get the raw input from the command
    const input = context.command.parsed.rawInput || '';
    const parsed = parseGDTCommand(input);

    if (!parsed) {
      return {
        valid: false,
        error: 'invalid_gdt_command',
        params: { input }
      };
    }

    // Store parsed data for execute phase
    const sharedData = getSharedData(context);
    sharedData.code = parsed.code;
    sharedData.args = parsed.args;
    sharedData.rawInput = input;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const sharedData = getSharedData(context);
    const code = sharedData.code!;
    const args = sharedData.args!;

    // Create GDT context and execute command
    const gdtContext = createGDTContext(context.world);
    const result = executeCommand(code, gdtContext, args);

    // Store result for report phase
    sharedData.result = result;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    if (result.error === 'not_in_gdt_mode') {
      // This shouldn't happen if parser routing is correct
      return [context.event('dungeo.event.gdt_command_blocked', {
        messageId: `${GDT_COMMAND_ACTION_ID}.not_in_gdt_mode`,
        message: 'GDT mode is not active.'
      })];
    }

    // Unknown command in GDT mode
    return [context.event('dungeo.event.gdt_command_blocked', {
      messageId: `${GDT_COMMAND_ACTION_ID}.invalid_gdt_command`,
      message: 'Unknown GDT command. Type HE for help.'
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getSharedData(context);
    const result = sharedData.result!;
    const code = sharedData.code!;

    // Emit domain event with pre-rendered message for text service
    return [context.event('dungeo.event.gdt_command', {
      messageId: `${GDT_COMMAND_ACTION_ID}.gdt_${code.toLowerCase()}`,
      message: result.output.join('\n')
    })];
  }
};
