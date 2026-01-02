/**
 * Dig Action Types
 *
 * Used for digging with shovel, primarily at Sandy Beach
 * to uncover the buried statue (23 points).
 */

export const DIG_ACTION_ID = 'dungeo.action.dig' as const;

export const DigMessages = {
  SUCCESS: 'dungeo.dig.success',
  FOUND_STATUE: 'dungeo.dig.found_statue',
  KEEP_DIGGING: 'dungeo.dig.keep_digging',
  NOTHING_HERE: 'dungeo.dig.nothing_here',
  NO_SHOVEL: 'dungeo.dig.no_shovel',
  CANT_DIG_HERE: 'dungeo.dig.cant_dig_here',
} as const;
