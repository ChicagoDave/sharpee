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

// `test --json` NDJSON wire contract (ADR-277 D1): the versioned record stream.
export type {
  RunStartRecord,
  TranscriptStartRecord,
  CommandResultRecord,
  TranscriptEndRecord,
  RunEndRecord,
  TestResultRecord,
} from './test-results.js';
export {
  TEST_RESULTS_SCHEMA_VERSION,
  isRunStartRecord,
  isTranscriptStartRecord,
  isCommandResultRecord,
  isTranscriptEndRecord,
  isRunEndRecord,
  isTestResultRecord,
} from './test-results.js';
