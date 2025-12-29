/**
 * GDT Help Command (HE)
 *
 * Displays list of available GDT commands.
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';

export const helpHandler: GDTCommandHandler = {
  code: 'HE',
  name: 'Help',
  description: 'Display list of GDT commands',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const output = [
      'GDT COMMANDS:',
      '',
      'DISPLAY:',
      '  DA  Display Adventurer    - Show player state',
      '  DR  Display Room          - Show room properties',
      '  DO  Display Object        - Show object properties',
      '  DS  Display State         - Show game state',
      '  DX  Display Exits         - Show room exits',
      '  DC  Display Clock         - Show timer events',
      '  DV  Display Villains      - Show NPC state',
      '  DF  Display Flags         - Show game flags',
      '',
      'ALTER:',
      '  AH  Alter Here            - Teleport to room',
      '  AO  Alter Object          - Move object',
      '  AF  Alter Flags           - Set game flag',
      '',
      'TOGGLE:',
      '  ND  No Deaths             - Toggle immortality',
      '  NT  No Troll              - Disable troll',
      '  NR  No Robber             - Disable thief',
      '  NC  No Cyclops            - Disable cyclops',
      '  RD  Restore Deaths        - Enable deaths',
      '  RT  Restore Troll         - Enable troll',
      '  RR  Restore Robber        - Enable thief',
      '  RC  Restore Cyclops       - Enable cyclops',
      '',
      'UTILITY:',
      '  TK  Take                  - Acquire any object',
      '  HE  Help                  - This message',
      '  EX  Exit                  - Return to game'
    ];

    return {
      success: true,
      output
    };
  }
};
