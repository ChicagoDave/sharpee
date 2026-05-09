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
 *
 * @see ADR-172 — Spatial Sound Propagation
 */

export { propagate, clarityToTier } from './propagation';
