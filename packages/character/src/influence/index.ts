/**
 * NPC influence exports (ADR-146)
 *
 * Influence definitions, evaluation engine, duration tracking,
 * and PC influence handling.
 *
 * Public interface: All re-exported types, classes, and functions.
 * Owner context: @sharpee/character / influence
 */

export {
  type InfluenceMode,
  type InfluenceRange,
  type InfluenceDuration,
  type InfluenceEffect,
  type InfluenceSchedule,
  type InfluenceDef,
  type ResistanceDef,
  type ActiveInfluenceEffect,
  type InfluenceResult,
} from './influence-types';

export {
  type InfluenceRoomEntity,
  checkResistance,
  evaluatePassiveInfluences,
  evaluateActiveInfluence,
} from './influence-evaluator';

export { InfluenceTracker } from './influence-duration';

export {
  type PcInfluenceResult,
  evaluatePcInfluence,
} from './pc-influence';

export { InfluenceBuilder } from './builder';

export {
  InfluenceMessages,
  type InfluenceMessageId,
} from './influence-messages';
