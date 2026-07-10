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
export { CHORD_STATE_PREFIX, ChordStory, createStory, StoryLoaderOptions } from './loader';
