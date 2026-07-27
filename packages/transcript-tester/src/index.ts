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

// Runner
export { runTranscript } from './runner.js';

// Reporter
export { reportTranscript, reportTestRun, getExitCode } from './reporter.js';

// Aggregation + `test --json` NDJSON record builders (ADR-277 D1)
export {
  aggregateTestRun,
  runStartRecord,
  transcriptRecords,
  runEndRecord,
  ndjsonLine,
} from './aggregate.js';

// Trait Formatter
export { formatEntityTraitLines, formatTraitProse } from './trait-formatter.js';

// Story Loader
export { loadStory, createTestableGame, findTranscripts } from './story-loader.js';
export type { TestableGame } from './story-loader.js';
