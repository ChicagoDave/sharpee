/**
 * Prose pipeline handlers — internal barrel.
 *
 * Public interface: re-exports every handler family the pipeline
 * dispatches to, plus the shared `HandlerContext` / `EventHandler`
 * types. Used by the pipeline class (sub-phase 1.5).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 */

export type {
  EventHandler,
  HandlerContext,
  ChainableEventData,
  GenericEventData,
} from './types.js';

// Type-keyed handlers (former text-service handlers/*.ts).
export { handleRoomDescription } from './room.js';
export { handleRevealed } from './revealed.js';
export { handleGameMessage, handleGenericEvent } from './generic.js';
export { handleGameStarted } from './game.js';
export { handleAudibilityHeard } from './audibility.js';
export { handlePlatformEvent } from './platform.js';

// Inline handlers extracted from text-service.ts in this sub-phase.
export { tryProcessDomainEventMessage } from './domain-message.js';
export { handleImplicitTake } from './implicit-take.js';
export { handleCommandFailed } from './command-failed.js';
export { handleClientQuery } from './client-query.js';
