/**
 * GDT Exit Command (EX)
 *
 * Exits GDT mode and returns to normal gameplay.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { DefaultPrompt } from '@sharpee/if-domain';

export const exitHandler: GDTCommandHandler = {
  code: 'EX',
  name: 'Exit',
  description: 'Exit GDT and return to game',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    // Deactivate GDT mode: clear flag, prompt, and input mode (ADR-137)
    context.setFlag('active', false);
    context.world.setPrompt(DefaultPrompt);
    context.world.setStateValue('if.inputMode', undefined);

    return {
      success: true,
      output: ['Returning to game.']
    };
  }
};
