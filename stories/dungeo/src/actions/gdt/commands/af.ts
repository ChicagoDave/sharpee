/**
 * GDT Alter Flags Command (AF) - DEPRECATED
 *
 * In FORTRAN/MDL Zork, objects had bit flags that could be toggled.
 * Sharpee uses trait-based composition instead. Use game commands
 * or other GDT commands to modify entity state.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const afHandler: GDTCommandHandler = {
  code: 'AF',
  name: 'Alter Flags',
  description: 'Deprecated - use game commands instead',

  execute(_context: GDTContext, _args: string[]): GDTCommandResult {
    return {
      success: true,
      output: [
        'AF (Alter Flags) was used in the FORTRAN/MDL versions of Zork',
        'where objects had bit flags that could be directly toggled.',
        '',
        'Sharpee uses trait-based composition instead.',
        'To modify entity state, use:',
        '  - Game commands (open, close, turn on, etc.)',
        '  - AO to move objects',
        '  - AH to teleport the player'
      ]
    };
  }
};
