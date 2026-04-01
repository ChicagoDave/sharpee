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
import { GDT_ACTION_ID, GDT_STATE_KEY, DEFAULT_GDT_FLAGS, GDTPrompt, GDT_INPUT_MODE_ID } from './types';
import { GDTEventTypes } from './gdt-events';
import { getGDTFlags, setGDTFlags } from './gdt-context';

export const gdtAction: Action = {
  id: GDT_ACTION_ID,
  group: 'debug',

  validate(context: ActionContext): ValidationResult {
    // GDT is always available (could add password check here for authenticity)
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Enter GDT mode: set flag, prompt, and input mode (ADR-137)
    const world = context.world;
    const flags = getGDTFlags(world);
    flags.active = true;
    setGDTFlags(world, flags);
    world.setPrompt(GDTPrompt);
    world.setStateValue('if.inputMode', GDT_INPUT_MODE_ID);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('dungeo.event.gdt_blocked', {
      messageId: `${GDT_ACTION_ID}.${result.error}`,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const message = [
      'A BOOMING VOICE CALLS OUT, "WHO SUMMONS THE GAME DEBUGGING TOOL?"',
      '',
      'GDT ready. Type HE for help, EX to exit.'
    ].join('\n');

    return [context.event(GDTEventTypes.ENTERED, {
      messageId: GDTEventTypes.ENTERED,
      params: { message }
    })];
  }
};
