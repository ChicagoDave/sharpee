/**
 * GDT (Game Debugging Tool) Types
 *
 * Type definitions for the GDT subsystem, mimicking the original
 * 1981 Mainframe Zork debug interface.
 */

import { WorldModel, IFEntity } from '@sharpee/world-model';

/**
 * GDT command codes - two-letter commands from original Zork
 */
export type GDTCommandCode =
  // Display commands
  | 'DA' // Display Adventurer
  | 'DR' // Display Room
  | 'DO' // Display Object
  | 'DC' // Display Clock events
  | 'DX' // Display Exits
  | 'DH' // Display Hacks
  | 'DL' // Display Lengths
  | 'DV' // Display Villains
  | 'DF' // Display Flags
  | 'DS' // Display State
  | 'DN' // Display switches (Numbers)
  | 'DM' // Display Messages
  | 'DT' // Display Text
  | 'DP' // Display Parser
  | 'D2' // Display Room2
  | 'DZ' // Display puZzle
  // Alter commands
  | 'AH' // Alter Here
  | 'AO' // Alter Object
  | 'AR' // Alter Rooms
  | 'AF' // Alter Flags
  | 'AC' // Alter Clock
  | 'AA' // Alter Adventurer
  | 'AX' // Alter eXits
  | 'AV' // Alter Villains
  | 'AN' // Alter Numbers (switches)
  | 'AZ' // Alter puZzle
  // Toggle commands
  | 'NC' // No Cyclops
  | 'ND' // No Deaths
  | 'NR' // No Robber
  | 'NT' // No Troll
  | 'RC' // Restore Cyclops
  | 'RD' // Restore Deaths
  | 'RR' // Restore Robber
  | 'RT' // Restore Troll
  // Utility commands
  | 'TK' // Take
  | 'PD' // Program Detail
  | 'HE' // Help
  | 'EX' // Exit
  // Puzzle debug
  | 'PZ' // Puzzle
  // Trivia debug
  | 'TQ'; // Trivia Questions

/**
 * Parsed GDT command
 */
export interface GDTCommand {
  code: GDTCommandCode;
  args: string[];
  raw: string;
}

/**
 * Result of executing a GDT command
 */
export interface GDTCommandResult {
  success: boolean;
  output: string[];
  error?: string;
}

/**
 * GDT flags stored in world state
 */
export interface GDTFlags {
  /** Whether GDT mode is active */
  active: boolean;
  /** Immortality mode - prevents player death */
  immortal: boolean;
  /** Verbose debug output */
  verbose: boolean;
  /** Troll disabled */
  trollDisabled: boolean;
  /** Thief/Robber disabled */
  thiefDisabled: boolean;
  /** Cyclops disabled */
  cyclopsDisabled: boolean;
}

/**
 * Default GDT flags
 */
export const DEFAULT_GDT_FLAGS: GDTFlags = {
  active: false,
  immortal: false,
  verbose: false,
  trollDisabled: false,
  thiefDisabled: false,
  cyclopsDisabled: false
};

/**
 * GDT context passed to command handlers
 */
export interface GDTContext {
  world: WorldModel;
  player: IFEntity;
  flags: GDTFlags;

  // Helper methods
  findEntity(idOrName: string): IFEntity | undefined;
  findRoom(idOrName: string): IFEntity | undefined;
  listRooms(): IFEntity[];
  listObjects(): IFEntity[];
  getPlayerLocation(): IFEntity | undefined;
  getInventory(): IFEntity[];

  // State modification
  setFlag(name: keyof GDTFlags, value: boolean): void;
  teleportPlayer(roomId: string): boolean;
  moveObject(objectId: string, locationId: string): boolean;
}

/**
 * GDT command handler interface
 */
export interface GDTCommandHandler {
  /** Two-letter command code */
  code: GDTCommandCode;
  /** Human-readable name */
  name: string;
  /** Description for help text */
  description: string;
  /** Execute the command */
  execute(context: GDTContext, args: string[]): GDTCommandResult;
}

/**
 * World state key for GDT flags
 */
export const GDT_STATE_KEY = 'gdt';

/**
 * Action ID for GDT mode
 */
export const GDT_ACTION_ID = 'dungeo.action.gdt';

/**
 * Action ID for GDT commands
 */
export const GDT_COMMAND_ACTION_ID = 'dungeo.action.gdt_command';
