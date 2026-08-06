/**
 * @sharpee/ide-protocol
 *
 * Shared wire types for the Sharpee IDE project-introspection manifest. The single
 * source of truth for the contract between the platform's introspection emitters
 * (the `--introspect` CLI and the Play-panel bridge) and the IDE that renders the
 * Sharpee-aware project tree. Types only — no runtime dependencies — so both the
 * Node emitter and the browser bridge import it cleanly (DEVARCH 8b).
 *
 * @packageDocumentation
 * @see ADR-184: IDE project introspection via runtime world model
 */

export type {
  ProjectManifest,
  EntityNode,
  EntityCategory,
  SourceRef,
  TraitSummary,
} from './types.js';

export { SCHEMA_VERSION } from './types.js';

export {
  isProjectManifest,
  isEntityNode,
  isEntityCategory,
  isSourceRef,
} from './guards.js';

// Chord Story IR schema (ADR-210 Interface Contract 1) — source of truth
// is @sharpee/chord; published here beside the manifest types.
export * from './story-ir.js';

// `compose --json` wire contract (ADR-258 D5): the versioned gates+IR payload.
export type { ComposeDiagnosticRecord, ComposeJsonPayload } from './compose-diagnostics.js';
export {
  COMPOSE_JSON_SCHEMA_VERSION,
  isComposeDiagnosticRecord,
  isComposeJsonPayload,
} from './compose-diagnostics.js';

// The run-event stream: events emitted AS a run happens, so the IDE's Testing
// tab fills live. Supersedes the `test-results.js` records below.
export type {
  RunEventEnvelope,
  RunMode,
  RunStartEvent,
  PhaseEvent,
  TranscriptStartEvent,
  CommandResultEvent,
  TranscriptEndEvent,
  BudgetUse,
  ProgressEvent,
  CoveragePoint,
  CoverageEvent,
  RunEndEvent,
  RunEvent,
} from './run-events.js';
export {
  RUN_EVENT_SCHEMA_VERSION,
  isRunStartEvent,
  isPhaseEvent,
  isTranscriptStartEvent,
  isCommandResultEvent,
  isTranscriptEndEvent,
  isProgressEvent,
  isCoverageEvent,
  isRunEndEvent,
  isRunEvent,
} from './run-events.js';

// DEPRECATED — `test --json` NDJSON wire contract (ADR-277 D1), the versioned
// record stream superseded by the events above. Still exported because
// transcript-tester, branch-tester and devkit import these until Phase 2.
export type {
  RunStartRecord,
  TranscriptStartRecord,
  CommandResultRecord,
  TranscriptEndRecord,
  CoverageRecord,
  RunEndRecord,
  TestResultRecord,
} from './test-results.js';
export {
  TEST_RESULTS_SCHEMA_VERSION,
  isRunStartRecord,
  isTranscriptStartRecord,
  isCommandResultRecord,
  isTranscriptEndRecord,
  isCoverageRecord,
  isRunEndRecord,
  isTestResultRecord,
} from './test-results.js';
