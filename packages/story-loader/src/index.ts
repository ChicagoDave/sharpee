/**
 * @sharpee/story-loader — the Story IR interpreter (ADR-210).
 *
 * Purpose: construct a generic `Story` implementation from compiled Story IR —
 * world building, phrase registration, custom vocabulary, endings, and (Phase 5)
 * event-rule binding, the expression evaluator, occurrence materialization,
 * and seeded RNG.
 *
 * Public interface: createStory(), ChordStory, StoryLoaderOptions, LoadError,
 * CHORD_STATE_PREFIX.
 *
 * Owner context: Chord runtime consumer. Language-neutral by design — it
 * consumes IR and never sees Chord syntax. Depends on the platform
 * (world-model, helpers, engine, if-domain, core); nothing platform depends
 * on it (ADR-210 Direction rule).
 */

export { LoadError } from './errors';
export { EVENT_TRIGGERS, EVENT_PAYLOAD_FIELDS } from './event-contract';
export { ChordDataTrait, ChordStory, createStory, StoryLoaderOptions } from './loader';
export { Evaluator, EvalContext, EntityIdResolver } from './evaluator';
export { ChordRuntime, ChordBehaviorTrait } from './runtime';
export {
  CHORD_OCCURRENCE_PREFIX,
  CHORD_RNG_KEY,
  CHORD_STATE_PREFIX,
  CHORD_TRAIT_PREFIX,
} from './state-keys';
