/**
 * GDT No Deaths Command (ND)
 *
 * Enables immortality mode - player cannot die.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const ndHandler: GDTCommandHandler = {
  code: 'ND',
  name: 'No Deaths',
  description: 'Enable immortality mode',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    if (context.flags.immortal) {
      return {
        success: true,
        output: ['Immortality already enabled.']
      };
    }

    context.setFlag('immortal', true);

    return {
      success: true,
      output: ['Immortality ENABLED. You cannot die.']
    };
  }
};
