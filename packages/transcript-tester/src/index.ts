/**
 * @sharpee/transcript-tester
 *
 * Transcript-based testing for Sharpee interactive fiction stories.
 *
 * Usage:
 *   npx transcript-test <story-path> [transcripts...]
 *
 * See ADR-073 for format specification.
 */

// Types
export * from './types.js';

// Parser
export { parseTranscript, parseTranscriptFile, validateTranscript } from './parser.js';

// Golden recordings (ADR-294 D7)
export { serializeGolden, parseGolden, parseGoldenFile, GoldenFormatError } from './golden.js';

// Runner
export { runTranscript, goldenPathFor, divergencePathFor } from './runner.js';

// Watch mode (ADR-294 D14)
export { classifyChange, BlessPolicy, runCycle, startWatch } from './watch.js';
export type { ChangeTarget, WatchRunIO, WatchConfig } from './watch.js';

// Reporter
export { reportTranscript, reportTestRun, getExitCode } from './reporter.js';

// Aggregation + `test --json` NDJSON record builders (ADR-277 D1)
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
