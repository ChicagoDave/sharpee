/**
 * @sharpee/transcript-tester
 *
 * Transcript-based testing for Sharpee interactive fiction stories.
 *
 * Usage: as a LIBRARY. The `transcript-test` bin is retired — an author runs
 * `sharpee test` (devkit), which imports this package, and the in-repo path is
 * the bundle's `--test`.
 *
 * See ADR-073 for format specification.
 */

// Types
export * from './types.js';

// Parser
export { parseTranscript, parseTranscriptFile, validateTranscript } from './parser.js';

// Canonical `.transcript` writer — the matched pair to the parser (ADR-300 D11/D17)
export { serializeTranscript } from './serializer.js';

// Golden recordings (ADR-294 D7)
export { serializeGolden, parseGolden, parseGoldenFile, GoldenFormatError } from './golden.js';

// Runner
export { runTranscript, goldenPathFor, divergencePathFor } from './runner.js';

// The assertion core (ADR-340 D1): the claim language's one evaluator and
// the per-command execution both testing runtimes share. `assertion-core`
// is also a package subpath, browser-safe, for the IDE's testing surface.
export {
  checkAssertion,
  checkEventAssertion,
  checkStateAssertion,
  evaluateStateExpression,
  findEntity,
  getEntityProperty,
  resolveValue,
  collectStrings,
  captureEntityTraits,
  normalizeOutput,
  synthesizePolicyAssertions,
  proseTextLinesOf,
  type WorldModel,
} from './assertion-core.js';
export {
  resolveChannelPath,
  checkChannelAssertion,
  channelsReferencedBy,
  type PathResolution,
} from './channel-assert.js';
export {
  runCommand,
  executeDirective,
  configureRandomInstruments,
  unfiredForceError,
  forcesFailResult,
  directiveFailResult,
  errorResult,
  endingFrom,
  worldEntityRef,
  captureWorldSnapshot,
  type GameEngine,
  type PlatformRandomService,
} from './command-core.js';

// Watch mode (ADR-294 D14)
export { classifyChange, BlessPolicy, runCycle, startWatch } from './watch.js';
export type { ChangeTarget, WatchRunIO, WatchConfig } from './watch.js';

// Reporter
export {
  reportTranscript,
  reportTranscriptStart,
  reportCommandResult,
  reportTranscriptEnd,
  reportTestRun,
  getExitCode,
  type ReporterOptions,
} from './reporter.js';

// The run-event stream (ADR-277 D1 as amended 2026-08-06): events emitted as
// the run happens, so a consumer sees a transcript start before it runs.
export {
  RunEventStream,
  ndjsonEventLine,
  type RunEventWriter,
  type StreamableCommandResult,
  type StreamableRunResult,
  type StreamableTranscriptResult,
} from './run-event-stream.js';

// Aggregation + the DEPRECATED `test --json` record builders (ADR-277 D1). The
// builders are superseded by RunEventStream above; `aggregateTestRun` is not.
export {
  aggregateTestRun,
  runStartRecord,
  transcriptRecords,
  coverageRecord,
  runEndRecord,
  ndjsonLine,
} from './aggregate.js';

// Outcome-class coverage (ADR-293 D15)
export {
  CoverageTracker,
  formatCoverageSummary,
  formatCoverageBreakdown,
} from './coverage.js';
export type { CoverageReport } from './coverage.js';

// First-firing outcome search (ADR-293 D12)
export { searchOutcome } from './search.js';
export type { SearchTarget, SearchResult } from './search.js';

// Trait Formatter
export { formatEntityTraitLines, formatTraitProse } from './trait-formatter.js';

// Story Loader
export { loadStory, createTestableGame, findTranscripts } from './story-loader.js';
export type { TestableGame } from './story-loader.js';
