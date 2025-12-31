/**
 * Walk Through Action Types
 *
 * Constants and types for the Bank of Zork wall-walking puzzle.
 */

export const WALK_THROUGH_ACTION_ID = 'walk_through';
export const BANK_PUZZLE_STATE_KEY = 'dungeo.bank.puzzle';

/**
 * State for the bank puzzle - tracks curtain destination
 */
export interface BankPuzzleState {
  /** When true, curtain leads to Viewing Room instead of Small Room */
  curtainLeadsToViewingRoom: boolean;
}

export const DEFAULT_BANK_PUZZLE_STATE: BankPuzzleState = {
  curtainLeadsToViewingRoom: false
};

/**
 * Message IDs for bank puzzle
 */
export const BankPuzzleMessages = {
  WALK_THROUGH: 'dungeo.bank.walk_through',
  NO_WALL: 'dungeo.bank.no_wall',
  CANT_WALK_THROUGH: 'dungeo.bank.cant_walk_through'
} as const;
