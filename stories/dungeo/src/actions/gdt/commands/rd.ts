/**
 * GDT Restore Deaths Command (RD)
 *
 * Disables immortality mode - player can die again.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const rdHandler: GDTCommandHandler = {
  code: 'RD',
  name: 'Restore Deaths',
  description: 'Disable immortality mode',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (!context.flags.immortal) {
      return {
        success: true,
        output: ['Immortality already disabled.']
      };
    }

    context.setFlag('immortal', false);

    return {
      success: true,
      output: ['Immortality DISABLED. You can die again.']
    };
  }
};
