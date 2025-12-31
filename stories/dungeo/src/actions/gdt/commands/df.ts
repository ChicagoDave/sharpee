/**
 * GDT Display Flags Command (DF) - DEPRECATED
 *
 * In FORTRAN/MDL Zork, objects had bit flags (TAKEBIT, OPENBIT, etc.).
 * Sharpee uses trait-based composition instead. Use DO to view entity state.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const dfHandler: GDTCommandHandler = {
  code: 'DF',
  name: 'Display Flags',
  description: 'Deprecated - use DO instead',

  execute(_context: GDTContext, _args: string[]): GDTCommandResult {
    return {
      success: true,
      output: [
        'DF (Display Flags) was used in the FORTRAN/MDL versions of Zork',
        'where objects had bit flags (TAKEBIT, OPENBIT, LIGHTBIT, etc.).',
        '',
        'Sharpee uses trait-based composition instead.',
        'Use DO <entity> to view entity state and traits.'
      ]
    };
  }
};
