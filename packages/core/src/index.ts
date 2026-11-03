/**
 * @sharpee/core — the foundation every other Sharpee package builds on.
 *
 * This file is the package's whole public surface: `package.json` exposes one
 * entry, and every name a consumer may import from `@sharpee/core` is written
 * out here by name. A name that is not listed is internal to the package, and
 * adding one is a visible act in this file. Nothing here is `export *`: a
 * directory added under `src/` is not public until a line below says so.
 * `tests/surface.test.ts` holds that shape.
 *
 * The list is grouped by module. Type-only names use `export type`; a name
 * that consumers use as a value (a class, function, const, or enum) is a
 * plain export. `Result` is both a type and a const and is exported plain.
 *
 * Sub-barrels (`events/index.ts`, `types/index.ts`, `query/index.ts`, and the
 * rest) remain as intra-package conveniences; they are not reachable from
 * outside.
 *
 * References: ADR-391 (D1 — the root barrel names the contract; D4 — the
 * event-data registry is reached by declaration merging, so `EventDataRegistry`
 * is listed and its entries are not).
 */

// ─── Entities ────────────────────────────────────────────────────────────────

export type {
  EntityId,
  IEntity,
  IEntityCreationParams
} from './types/entity.js';

export { Result } from './types/result.js';

// ─── Save, restore, and session state ────────────────────────────────────────

export type {
  IEngineState,
  IQuitContext,
  IRestartContext,
  IRestoreIdentity,
  IRestoreReconciliation,
  IRestoreResult,
  ISaveData,
  ISaveMetadata,
  ISaveRestoreHooks,
  ISaveResult,
  ISerializedEvent,
  ISerializedParserState,
  ISerializedTurn
} from './types/save-data.js';

// ─── IFID ────────────────────────────────────────────────────────────────────

export { generateIfid, normalizeIfid, validateIfid } from './ifid/ifid.js';

// ─── Events: the envelope and its sources ────────────────────────────────────

export type { ISemanticEvent, Presence } from './events/types.js';

export type { IGenericEventSource } from './events/event-source.js';
export { createEventSource as createGenericEventSource } from './events/event-source.js';

export { createSemanticEventSource } from './events/semantic-event-source.js';
export type { ISemanticEventSource } from './events/semantic-event-source.js';

export { createEvent } from './events/event-system.js';
export { createTypedEvent } from './events/event-factory.js';
export { getUntypedEventData } from './events/event-helpers.js';

/** Extended by declaration merging from `media` and `stdlib`; its entries are reached by event-type key. */
export type { EventDataRegistry } from './events/event-registry.js';

// ─── Events: system ──────────────────────────────────────────────────────────

export { Subsystems, createSystemEvent } from './events/system-event.js';
export type { ISystemEvent } from './events/system-event.js';

// ─── Events: platform (save, restore, restart, quit, undo, again) ────────────

export {
  PlatformEventType,
  createAgainFailedEvent,
  createAgainRequestedEvent,
  createQuitCancelledEvent,
  createQuitConfirmedEvent,
  createQuitRequestedEvent,
  createRestartCompletedEvent,
  createRestartRequestedEvent,
  createRestoreCompletedEvent,
  createRestoreRequestedEvent,
  createSaveCompletedEvent,
  createSaveReconciledEvent,
  createSaveRequestedEvent,
  createUndoCompletedEvent,
  createUndoRequestedEvent,
  isPlatformRequestEvent
} from './events/platform-events.js';
export type {
  IAgainContext,
  IPlatformEvent,
  IRestoreContext,
  ISaveContext
} from './events/platform-events.js';

// ─── Events: game lifecycle ──────────────────────────────────────────────────

export {
  GameEventType,
  createGameAbortedEvent,
  createGameEndedEvent,
  createGameEndingEvent,
  createGameInitializedEvent,
  createGameInitializingEvent,
  createGameLostEvent,
  createGameQuitEvent,
  createGameResumedEvent,
  createGameStartedEvent,
  createGameStartingEvent,
  createGameWonEvent,
  createPcSwitchedEvent,
  createStoryLoadedEvent,
  createStoryLoadingEvent
} from './events/game-events.js';
export type { GameLifecycleStartedData } from './events/game-events.js';

// ─── Queries ─────────────────────────────────────────────────────────────────

export { QuerySource, QueryType } from './query/types.js';
export type {
  IPendingQuery,
  IQueryHandler,
  IQueryResponse,
  QueryValidator
} from './query/types.js';
export { QueryManager, createQueryManager } from './query/query-manager.js';

// ─── Random: seeds, streams, choice points, forces, traces ───────────────────

export { createSeededRandom } from './random/seeded-random.js';
export type { SeededRandom } from './random/seeded-random.js';
export type { RandomService } from './random/random-service.js';
export { SEED_DERIVATION_VERSION, deriveStreamSeed } from './random/seed-derivation.js';
export { definePoint, getPoint, getRegisteredPoints } from './random/choice-point.js';
export type { ChoicePoint } from './random/choice-point.js';
export {
  DuplicateForceKeyError,
  RandomForceLoadError,
  UndeclaredForceClassError,
  UnknownForcePointError,
  forceKey
} from './random/force.js';
export type {
  RandomForceMode,
  RandomForceSpec,
  RandomForceStatus
} from './random/force.js';
export type { IRandomTraceData, RandomTraceSink } from './random/trace.js';
