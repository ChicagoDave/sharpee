// packages/engine/src/sound/index.ts

/**
 * @sharpee/engine/sound — spatial sound propagation runtime (ADR-172).
 *
 * Owner context: engine layer. The propagation function lives here
 * because it consumes world-model state, doesn't fit in a pure
 * domain-types layer, and is invoked from the action pipeline (Phase
 * 6) which is engine-adjacent.
 *
 * Public interface:
 *  - `propagate(sound, listenerId, world, timestamp)` — produce an
 *    `AudibilityEvent` (or null) for a single listener.
 *  - `clarityToTier(clarity)` — exposed for testability and for
 *    composition layers that need to query "what tier does this
 *    clarity value map to?".
 *  - `SoundDispatcher` — per-turn fan-out: for each buffered sound,
 *    propagate to every `ListenerTrait` entity and emit one
 *    `sound.audibility.heard` semantic event per non-silent result
 *    (Phase 6 Step 6.2).
 *  - `AUDIBILITY_HEARD_EVENT_TYPE` — the semantic-event type string
 *    fired by the dispatcher.
 *
 * @see ADR-172 — Spatial Sound Propagation
 */

export { propagate, clarityToTier } from './propagation';
export { SoundDispatcher, AUDIBILITY_HEARD_EVENT_TYPE } from './dispatcher';
