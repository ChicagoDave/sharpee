/**
 * Dungeo Canonical Melee Combat System
 *
 * Story-level implementation of the Mainframe Zork combat engine.
 * No platform changes required.
 */

export {
  // Constants
  STRENGTH_MIN,
  STRENGTH_MAX,
  SCORE_MAX,
  CURE_WAIT,
  VILLAIN_OSTRENGTH,
  BEST_WEAPONS,

  // Core functions
  fightStrength,
  villainStrength,
  getBestWeaponPenalty,
  resolveBlow,
  isHeroDeadFromWounds,
  applyVillainBlowToHero,
  healOneWound,
  getDiagnosis,
  disengageCombat,

  // Thief AI
  isVillainWinning,

  // Types
  type BlowResult,
  type BestWeaponEntry,
  type WinningParams,
  type DiagnoseData,
} from './melee';

export {
  MeleeOutcome,
  type MeleeOutcomeType,
  getResultTable,
  DEF1_RES,
  DEF2_RES,
  DEF3_RES,
} from './melee-tables';
