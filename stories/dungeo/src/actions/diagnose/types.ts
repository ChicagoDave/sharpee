/**
 * Diagnose Action Types
 *
 * Message IDs and action constants for the DIAGNOSE command.
 */

export const DIAGNOSE_ACTION_ID = 'dungeo.action.diagnose';

export const DiagnoseMessages = {
  PERFECT_HEALTH: 'dungeo.diagnose.perfect_health',
  LIGHT_WOUND: 'dungeo.diagnose.light_wound',
  SERIOUS_WOUND: 'dungeo.diagnose.serious_wound',
  SEVERAL_WOUNDS: 'dungeo.diagnose.several_wounds',
  WOUNDS_CURE: 'dungeo.diagnose.wounds_cure',
  DEATHS_DOOR: 'dungeo.diagnose.deaths_door',
  ONE_MORE_WOUND: 'dungeo.diagnose.one_more_wound',
  SERIOUS_WOUND_KILL: 'dungeo.diagnose.serious_wound_kill',
  SURVIVE_SERIOUS: 'dungeo.diagnose.survive_serious',
  STRONG: 'dungeo.diagnose.strong',
  KILLED_ONCE: 'dungeo.diagnose.killed_once',
  KILLED_TWICE: 'dungeo.diagnose.killed_twice',
} as const;
