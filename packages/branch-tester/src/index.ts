/**
 * @sharpee/branch-tester — the tree-document testing runtime (ADR-307).
 *
 * The Testing tab holds one test tree per story; this package owns that tree's
 * wire format (`<story-id>.tests.json`), the walker that replays it against a
 * real engine, and the shared assertion machinery (channel claims, policy
 * synthesis) the walker and the IDE surface both consume.
 *
 * The v2 transcript grammar this package originally carried (ADR-300/302 —
 * `continues:` trees of `.transcript` files, parser/serializer/rename, the
 * v1 tree runner) was retired by ADR-307's cutover: the tree IS the model and
 * JSON is its only serialization. Sharpee's own hand-authored text transcript
 * world (`@sharpee/transcript-tester` — walkthroughs, unit transcripts,
 * Dungeo) is a separate package and stays text.
 *
 * Usage: as a LIBRARY. An author runs `sharpee test` (devkit), which
 * discovers the tree document and drives `runTreeDocument`.
 */

// Types
export * from './types.js';

// The Testing tree's wire format — one JSON document per story (ADR-307)
export {
  TREE_DOCUMENT_VERSION,
  treeDocumentFileNameFor,
  emptyTreeDocument,
  serializeTreeDocument,
  deserializeTreeDocument,
  channelIdsReferencedBy,
  type TreeDocument,
  type TreeCard,
  type TreeCardType,
  type TreeBranch,
  type TreeAssertions,
  type TreeChannelAssertion,
  type TreeDocumentReadResult,
} from './tree-document.js';

// The tree-document walker — the greenfield ADR-307 runtime (D4/D5/D6):
// lines not files, derived labels, seams never block, execution errors do
export {
  runTreeDocument,
  flattenTreeLines,
  formatTreeDocumentRun,
  type TreeLine,
  type TreeLineDefect,
  type TreeLineOutcome,
  type TreeLineObserver,
  type TreeDocumentRunResult,
  type TreeDocumentRunOptions,
  type TreeWalkerGame,
  type TreeGameLoader,
} from './tree-walker.js';

// Channel assertions over structured values (ADR-300 D13, D14)
export {
  resolveChannelPath,
  checkChannelAssertion,
  channelsReferencedBy,
  type PathResolution,
} from './channel-assert.js';

// The auto-assertion synthesis engine (ADR-294 D2, ADR-307 record-time synthesis)
export {
  DEFAULT_AUTO_ASSERTION_POLICY,
  describeAssertion,
  streamableCommandResult,
  synthesizePolicyAssertions,
  proseTextLinesOf,
} from './auto-assertion.js';

// Runner — the shared per-transcript execution engine the walker drives
export { aggregateTestRun, runTranscript } from './runner.js';
