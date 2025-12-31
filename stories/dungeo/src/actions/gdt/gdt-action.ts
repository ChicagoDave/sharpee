/**
 * GDT Entry Action
 *
 * Enters GDT (Game Debugging Tool) mode.
 * Mimics the original 1981 Zork debug interface.
 *
 * Usage: GDT
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { GDT_ACTION_ID, GDT_STATE_KEY, DEFAULT_GDT_FLAGS } from './types';
import { GDTEventTypes, GDTEnteredEventData } from './gdt-events';
import { getGDTFlags, setGDTFlags } from './gdt-context';

export const gdtAction: Action = {
  id: GDT_ACTION_ID,
  group: 'debug',

  validate(context: ActionContext): ValidationResult {
    // GDT is always available (could add password check here for authenticity)
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Enter GDT mode by setting the active flag
    const world = context.world;
    const flags = getGDTFlags(world);
    flags.active = true;
    setGDTFlags(world, flags);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: GDT_ACTION_ID,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const message = [
      'A BOOMING VOICE CALLS OUT, "WHO SUMMONS THE GAME DEBUGGING TOOL?"',
      '',
      'GDT ready. Type HE for help, EX to exit.'
    ].join('\n');

    // Emit action.success with pre-rendered message for text service
    return [context.event('action.success', {
      actionId: GDT_ACTION_ID,
      messageId: 'gdt_entered',
      message
    })];
  }
};
