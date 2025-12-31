/**
 * INCANT Action Types
 *
 * The INCANT command was a hidden cheat in mainframe Dungeon that allows
 * players to skip directly to the endgame using a challenge-response system.
 */

export const INCANT_ACTION_ID = 'dungeo:incant' as const;

export const IncantMessages = {
  success: 'dungeo.incant.success',
  failure: 'dungeo.incant.failure',
  syntax: 'dungeo.incant.syntax'
} as const;
