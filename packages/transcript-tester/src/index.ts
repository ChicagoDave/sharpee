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
export * from './types';

// Parser
export { parseTranscript, parseTranscriptFile, validateTranscript } from './parser';

// Runner
export { runTranscript } from './runner';

// Reporter
export { reportTranscript, reportTestRun, getExitCode } from './reporter';

// Story Loader
export { loadStory, createTestableGame, findTranscripts } from './story-loader';
export type { TestableGame } from './story-loader';
