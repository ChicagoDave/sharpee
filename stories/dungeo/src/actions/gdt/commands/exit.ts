/**
 * GDT Exit Command (EX)
 *
 * Exits GDT mode and returns to normal gameplay.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const exitHandler: GDTCommandHandler = {
  code: 'EX',
  name: 'Exit',
  description: 'Exit GDT and return to game',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    // Deactivate GDT mode
    context.setFlag('active', false);

    return {
      success: true,
      output: ['Returning to game.']
    };
  }
};
