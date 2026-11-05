/**
 * @sharpee/event-processor — runs each turn's semantic events past the
 * world's validators, records them, and hands them to the handlers
 * registered for their type; the effects those handlers return are applied
 * by the effects system. It registers no handlers of its own: a standard
 * action's state change is made by a behavior in the action's execute phase.
 *
 * The barrel names each export. A symbol is here because something outside
 * the package imports it; everything else stays inside its module.
 *
 * Public interface: `EventProcessor`; `EffectProcessor`; the types `Effect`,
 * `WorldQuery`, `StoryEventHandler` and `IGameEvent`.
 * Owner context: @sharpee/event-processor.
 *
 * References:
 * - ADR-075 — the effects system.
 * - ADR-178 — the umbrella's runtime surface re-exports `EffectProcessor`.
 * - tests/unit/barrel-surface.test.ts — pins the exported values.
 */

export { EventProcessor } from './processor.js';
export { EffectProcessor } from './effects/index.js';
export type { Effect, WorldQuery } from './effects/index.js';
export type { IGameEvent, StoryEventHandler } from './handler-types.js';
