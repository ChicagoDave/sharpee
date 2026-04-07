/**
 * Information propagation exports (ADR-144)
 *
 * Propagation profiles, evaluation engine, and fact transfer
 * for NPC-to-NPC information flow.
 *
 * Public interface: All re-exported types and functions.
 * Owner context: @sharpee/character / propagation
 */

export {
  type PropagationTendency,
  type PropagationAudience,
  type PropagationPace,
  type PropagationColoring,
  type ReceivesAs,
  type SpreadsVersion,
  type FactOverride,
  type PropagationSchedule,
  type PropagationProfile,
  type PropagationTransfer,
  AlreadyToldRecord,
} from './propagation-types';

export {
  type RoomOccupant,
  type PropagationContext,
  evaluatePropagation,
} from './propagation-evaluator';

export {
  type TransferResult,
  transferFact,
  applyTransfers,
} from './fact-transfer';

export {
  type PlayerPresence,
  type PropagationVisibilityResult,
  PROPAGATION_WITNESSED_DEFAULTS,
  getVisibilityResult,
  getVisibilityResults,
} from './visibility';
