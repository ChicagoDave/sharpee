/**
 * GDT Dial Command (DL)
 *
 * Debug command for manipulating the Parapet dial puzzle.
 * Usage:
 *   DL          - Display current dial state
 *   DL SET <n>  - Set dial to n (1-8)
 *   DL PUSH     - Push the dial button (activate cell rotation)
 *   DL CELL <n> - Directly set which cell is in position (1-8)
 *   DL DOOR     - Toggle bronze door visibility in cell 4
 *   DL OPEN     - Open bronze door connection to Treasury
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { Direction, RoomTrait, IdentityTrait } from '@sharpee/world-model';

interface DialState {
  dialSetting: number;
  activatedCell: number;
  bronzeDoorVisible: boolean;
  bronzeDoorOpen: boolean;
}

function getDialState(context: GDTContext): DialState {
  const world = context.world;
  return {
    dialSetting: (world.getStateValue('parapet.dialSetting') as number) ?? 1,
    activatedCell: (world.getStateValue('parapet.activatedCell') as number) ?? 0,
    bronzeDoorVisible: (world.getStateValue('prisonCell.bronzeDoorVisible') as boolean) ?? false,
    bronzeDoorOpen: (world.getStateValue('prisonCell.bronzeDoorOpen') as boolean) ?? false
  };
}

function displayState(state: DialState): string[] {
  return [
    'Dial State:',
    `  Dial Setting: ${state.dialSetting}`,
    `  Activated Cell: ${state.activatedCell || 'None (button not pushed)'}`,
    `  Bronze Door Visible: ${state.bronzeDoorVisible}`,
    `  Bronze Door Open: ${state.bronzeDoorOpen}`,
    '',
    'Cell 4 required for bronze door to be visible.',
    'Bronze door leads to Treasury of Zork.'
  ];
}

function findRoomByName(context: GDTContext, name: string): string | null {
  for (const entity of context.world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === name) {
      return entity.id;
    }
  }
  return null;
}

function activateCell(context: GDTContext, cellNum: number): void {
  const world = context.world;

  // Set the activated cell
  world.setStateValue('parapet.activatedCell', cellNum);
  world.setStateValue('prisonCell.currentCell', cellNum);

  // Update bronze door visibility
  if (cellNum === 4) {
    world.setStateValue('prisonCell.bronzeDoorVisible', true);
  } else {
    world.setStateValue('prisonCell.bronzeDoorVisible', false);
  }

  // Set up room connections
  // Parapet D -> Prison Cell (cell is below the parapet)
  const prisonCellId = findRoomByName(context, 'Prison Cell');
  const parapetId = findRoomByName(context, 'Parapet');

  if (prisonCellId && parapetId) {
    // Parapet D -> Prison Cell
    const parapet = world.getEntity(parapetId);
    if (parapet) {
      const roomTrait = parapet.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.DOWN] = { destination: prisonCellId };
      }
    }

    // Prison Cell U -> Parapet
    const prisonCell = world.getEntity(prisonCellId);
    if (prisonCell) {
      const roomTrait = prisonCell.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.UP] = { destination: parapetId };
      }
    }
  }
}

function openBronzeDoor(context: GDTContext): void {
  const world = context.world;

  world.setStateValue('prisonCell.bronzeDoorOpen', true);

  // Connect Prison Cell S -> Treasury
  const prisonCellId = findRoomByName(context, 'Prison Cell');
  const treasuryId = findRoomByName(context, 'Treasury of Zork');

  if (prisonCellId && treasuryId) {
    const prisonCell = world.getEntity(prisonCellId);
    if (prisonCell) {
      const roomTrait = prisonCell.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.SOUTH] = { destination: treasuryId };
      }
    }
  }
}

export const dlHandler: GDTCommandHandler = {
  code: 'DL',
  name: 'Dial',
  description: 'Manipulate Parapet dial puzzle for testing',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const state = getDialState(context);
    const subcommand = args[0]?.toUpperCase();

    if (!subcommand) {
      // Display state
      return {
        success: true,
        output: displayState(state)
      };
    }

    switch (subcommand) {
      case 'SET':
        const dialVal = parseInt(args[1], 10);
        if (isNaN(dialVal) || dialVal < 1 || dialVal > 8) {
          return {
            success: false,
            output: ['Invalid dial setting. Use DL SET <1-8>'],
            error: 'INVALID_DIAL'
          };
        }
        context.world.setStateValue('parapet.dialSetting', dialVal);
        return {
          success: true,
          output: [`Dial set to ${dialVal}.`, ...displayState(getDialState(context))]
        };

      case 'PUSH':
        // Push button - activate current dial setting
        const currentDial = (context.world.getStateValue('parapet.dialSetting') as number) ?? 1;
        activateCell(context, currentDial);
        return {
          success: true,
          output: [`Button pushed. Cell ${currentDial} activated.`, ...displayState(getDialState(context))]
        };

      case 'CELL':
        const cellNum = parseInt(args[1], 10);
        if (isNaN(cellNum) || cellNum < 1 || cellNum > 8) {
          return {
            success: false,
            output: ['Invalid cell number. Use DL CELL <1-8>'],
            error: 'INVALID_CELL'
          };
        }
        activateCell(context, cellNum);
        return {
          success: true,
          output: [`Cell ${cellNum} activated directly.`, ...displayState(getDialState(context))]
        };

      case 'DOOR':
        // Toggle bronze door visibility
        const currentlyVisible = (context.world.getStateValue('prisonCell.bronzeDoorVisible') as boolean) ?? false;
        context.world.setStateValue('prisonCell.bronzeDoorVisible', !currentlyVisible);
        return {
          success: true,
          output: [`Bronze door visibility toggled to ${!currentlyVisible}.`, ...displayState(getDialState(context))]
        };

      case 'OPEN':
        // Open bronze door connection to Treasury
        openBronzeDoor(context);
        return {
          success: true,
          output: ['Bronze door opened. Treasury is now accessible via S from Prison Cell.', ...displayState(getDialState(context))]
        };

      case 'ENDGAME':
        // Set endgame mode (for testing victory)
        context.world.setStateValue('game.endgameStarted', true);
        return {
          success: true,
          output: ['Endgame mode activated. Victory will trigger when entering Treasury.']
        };

      default:
        return {
          success: false,
          output: [
            'Unknown subcommand. Usage:',
            '  DL          - Display dial state',
            '  DL SET <n>  - Set dial to n (1-8)',
            '  DL PUSH     - Push button (activate cell)',
            '  DL CELL <n> - Directly set active cell (1-8)',
            '  DL DOOR     - Toggle bronze door visibility',
            '  DL OPEN     - Open bronze door to Treasury',
            '  DL ENDGAME  - Activate endgame mode (for victory testing)'
          ],
          error: 'UNKNOWN_SUBCOMMAND'
        };
    }
  }
};
