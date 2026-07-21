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

export { LoadError } from './errors.js';
export { EVENT_TRIGGERS, EVENT_PAYLOAD_FIELDS, REGION_EVENT_TRIGGERS } from './event-contract.js';
export { HATCH_CONTEXT_VERSION, stagingRenderContext, findChordLiteral } from './hatch-context.js';
export { ChordDataTrait, ChordDetailTrait, ChordStory, createStory, StoryLoaderOptions } from './loader.js';
export { Evaluator, EvalContext, EntityIdResolver } from './evaluator.js';
export { ChordRuntime, ChordBehaviorTrait } from './runtime.js';
export { PHRASEBOOK_DATA } from './phrasebook-data.js';
export type { PhrasebookData } from './phrasebook-data.js';
export {
  CHORD_OCCURRENCE_PREFIX,
  CHORD_RNG_KEY,
  CHORD_STATE_PREFIX,
  CHORD_TRAIT_PREFIX,
} from './state-keys.js';
