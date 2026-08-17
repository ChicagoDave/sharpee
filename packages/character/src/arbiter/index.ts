/**
 * Arbiter barrel (ADR-318; contracts.md §3)
 *
 * Public interface: arbitrate, force feeds, pressure bookkeeping, types.
 * Owner context: @sharpee/character / arbiter
 */

export type {
  ArbiterAct,
  ActCandidate,
  ForceReading,
  ArbiterVerdict,
  ArbiterContext,
} from './arbiter-types.js';
export { arbitrate } from './arbiter.js';
export {
  computeStancedReadings,
  PRINCIPLE_DUTY_INTENSITY,
  HONOR_INTENSITY,
} from './force-feeds.js';
export {
  depositPressure,
  drainPressure,
  pressureBandFor,
  type BandTransition,
} from './pressure.js';
export { scopeMatches, exceptLifts, type KindMembership } from './scope.js';
export {
  arbitrateConfidedReveal,
  type RevealArbitrationInput,
  type RevealArbitration,
} from './reveal.js';
