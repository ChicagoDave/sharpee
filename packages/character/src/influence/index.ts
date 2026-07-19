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
} from './influence-types.js';

export {
  type InfluenceRoomEntity,
  checkResistance,
  evaluatePassiveInfluences,
  evaluateActiveInfluence,
} from './influence-evaluator.js';

export { InfluenceTracker } from './influence-duration.js';

export {
  type PcInfluenceResult,
  evaluatePcInfluence,
} from './pc-influence.js';

export { InfluenceBuilder } from './builder.js';

export {
  InfluenceMessages,
  type InfluenceMessageId,
} from './influence-messages.js';
