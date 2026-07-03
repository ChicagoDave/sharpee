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
} from './types';

// Type-keyed handlers (former text-service handlers/*.ts).
export { handleRoomDescription } from './room';
export { handleRevealed } from './revealed';
export { handleGameMessage, handleGenericEvent } from './generic';
export { handleGameStarted } from './game';
export { handleAudibilityHeard } from './audibility';
export { handlePlatformEvent } from './platform';

// Inline handlers extracted from text-service.ts in this sub-phase.
export { tryProcessDomainEventMessage } from './domain-message';
export { handleImplicitTake } from './implicit-take';
export { handleCommandFailed } from './command-failed';
export { handleClientQuery } from './client-query';
