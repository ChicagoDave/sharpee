/**
 * @sharpee/branch-tester — tree-native transcript testing (ADR-302).
 *
 * A transcript names its parent with `continues:`, so a story's tests form a
 * TREE rather than a directory of independent files plus a filename-ordered
 * chain. Running the harness runs every root-to-leaf path; a shared prefix
 * executes once and each divergent tail resumes from the state it produced.
 * There is no `--chain` flag, because there is nothing else a run could mean.
 *
 * Why this is a full COPY of the v1 harness rather than a fork or a shared
 * substrate (ADR-302 D15): the two diverge on grammar and runtime semantics,
 * and v1 is frozen so Dungeo's 117 unit transcripts and the Family Zoo
 * tutorial keep working unchanged (D9/D12). Shared code would make that freeze
 * a fiction — every change here would be a change there. The split is
 * permanent and by story, not a migration with an end date.
 *
 * Usage: as a LIBRARY. The `branch-test` bin is retired — an author runs
 * `sharpee test --tree` (devkit), and the in-repo path is the bundle's `--test`
 * over transcripts under branch-stories/.
 */

// Types
export * from './types.js';

// Parser
export { parseTranscript, parseTranscriptFile, validateTranscript } from './parser.js';

// Tree assembly — v2's entry point is the tree, not the file (ADR-302 D11)
export {
  assembleTree,
  rootToLeafPaths,
  effectiveHeader,
  effectiveConfig,
  stemOf,
  type TranscriptTree,
  type TreeNode,
  type TreeDefect,
} from './tree.js';

// Tree running — every path, shared prefixes once (ADR-302 D10)
export {
  runTree,
  reseedFor,
  type TreeRunResult,
  type NodeRunOutcome,
} from './tree-runner.js';

// The one `GameFactory` builder — a root's resolved seed is re-pinned at every
// fork below it (ADR-302 D17). One implementation for cli.ts, devkit, the bundle.
export {
  createRootGameFactory,
  type RootBootSpec,
  type RootGameFactoryOptions,
} from './game-factory.js';

// Tree reporting — unreached is not failed (ADR-302 D13)
export {
  summarizeTreeRun,
  formatTreeRun,
  type TreeRunSummary,
  type BlockedGroup,
} from './tree-report.js';

// Rename as a harness operation — validate then write (ADR-302 D14)
export {
  planRename,
  applyRename,
  renameTranscript,
  type RenamePlan,
  type RenameEdit,
} from './rename.js';

// Channel assertions over structured values (ADR-300 D13, D14)
export {
  resolveChannelPath,
  checkChannelAssertion,
  channelsReferencedBy,
  type PathResolution,
} from './channel-assert.js';

// Canonical `.transcript` writer — the matched pair to the parser (ADR-300 D11/D17)
export { serializeTranscript, serializeAssertionTag } from './serializer.js';

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
