/**
 * Combat Module Exports (ADR-072)
 *
 * Provides combat resolution system for IF games.
 */

// Message IDs
export * from './combat-messages';

// Service
export {
  CombatService,
  createCombatService,
  applyCombatResult,
  findWieldedWeapon,
  type ICombatService,
  type CombatContext,
  type CombatResult,
  type CombatValidation,
  type ApplyCombatResultInfo,
} from './combat-service';
