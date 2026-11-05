/**
 * @sharpee/event-processor — runs each turn's semantic events past the
 * world's validators, records them, and hands them to the handlers
 * registered for their type; the effects those handlers return are applied
 * by the effects system. It registers no handlers of its own: a standard
 * action's state change is made by a behavior in the action's execute phase.
 *
 * Public interface: `EventProcessor`; the effects system (`Effect` and its
 * members, `WorldQuery`, `createWorldQuery`, `EffectProcessor`); the handler
 * types `StoryEventHandler` and `IGameEvent`; and the re-exported types below.
 * Owner context: @sharpee/event-processor.
 *
 * References:
 * - ADR-075 — the effects system.
 */

export * from './types.js';
export * from './processor.js';

// Effects system (ADR-075)
export * from './effects/index.js';
export * from './handler-types.js';

// Re-export commonly used types
export { ISemanticEvent } from '@sharpee/core';
export { WorldModel, WorldChange } from '@sharpee/world-model';