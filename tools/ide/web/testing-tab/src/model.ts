/**
 * model.ts — the fold from a run-event stream to a renderable tree.
 *
 * Purpose: every view in the Testing tab reads this one model, and the model is
 *   built by applying run events in arrival order. It is deliberately pure — no
 *   DOM, no host bridge, no timers — so the whole state machine that turns
 *   `transcript-start` / `command-result` / `transcript-end` into a tree with
 *   statuses, replay counts and tallies is testable without a browser.
 *
 *   Two wire semantics it exists to honour. **Executions are not nodes**: a tree
 *   run re-executes an ancestor to rebuild a sibling's state (ADR-302 D17), so
 *   the same `file` legitimately opens more than once; those executions carry
 *   `replayed: true`, count toward the replayed command tally, and must never be
 *   read as the node running twice. **Unreached is not failed** (ADR-302 D13): a
 *   blocked node arrives as its own start/end pair with zero commands and a
 *   `blockedBy`, so one broken node yields one failure plus a count, never a
 *   wall of red.
 *
 * Public interface: RunModel, TestNode, Turn, PhaseState, createModel,
 *   applyEvent, ancestry, subtreeFailureCount, stemOf.
 * Owner context: tools/ide — the Testing tab's web bundle. Consumes
 *   `@sharpee/ide-protocol`'s run-event types directly (DEVARCH 8b): there is no
 *   mirror of the wire here, only a projection of it.
 */

import type {
  BudgetUse,
  CommandResultEvent,
  CoverageEvent,
  PhaseEvent,
  RunEndEvent,
  RunEvent,
  RunMode,
  TranscriptEndEvent,
  TranscriptStartEvent,
  WorldEntityRef,
  WorldSnapshot,
} from '@sharpee/ide-protocol/run-events';

/** One executed command, kept for the preview and the document view. */
export interface Turn {
  /** 1-based source line of the `> command` in its `.transcript`. */
  line: number;
  input: string;
  passed: boolean;
  expectedFailure: boolean;
  skipped: boolean;
  error?: string;
  /** What the story printed. Present on failures by default (see the wire doc). */
  actualOutput?: string;
  /**
   * The engine turn the command executed as (R4). Engine knowledge: meta
   * commands share a number, a refused action consumes one. Absent when the
   * wire did not carry it.
   */
  turn?: number;
  /**
   * The story ended during this command (R9). Engine knowledge too — the
   * `game.ended` announcement, mapped to the wire by the runner. What lets
   * {@link storyEnd} mark a file terminal when its LAST command ends the
   * story cleanly, with no dead tail behind it to observe. Absent when the
   * story did not end this turn or the stream predates the field.
   */
  ending?: CommandResultEvent['ending'];
  /**
   * The first failed assertion's message, verbatim from the runner
   * (`Output does not contain "…"`). Present exactly when an assertion —
   * rather than a runtime throw, which rides `error` — failed the command.
   */
  failure?: string;
  /**
   * The world after this command (R3), under `--capture-world`. What the
   * command CHANGED is derived by {@link worldDelta} against the previous
   * turn's snapshot (or the node's entry snapshot for the first turn).
   */
  world?: WorldSnapshot;
}

/**
 * A node's lifecycle. `pending` is local to this model — a node that a parent
 * announced but which has not started; the wire has no event for it.
 * `skipped` is the wire's empty-transcript outcome (phase-6 F1): no commands,
 * nothing ran, children unaffected — never a failure.
 */
export type NodeStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'unreached' | 'skipped';

/** One transcript in the tree, identified by its absolute path. */
export interface TestNode {
  /** Absolute path — the wire's one identity domain for nodes (`file`, `parent`, `blockedBy`). */
  file: string;
  /** Basename without `.transcript`, the name every view shows. */
  stem: string;
  parent: string | null;
  children: TestNode[];
  status: NodeStatus;
  /** Commands this transcript will run, from `transcript-start`. */
  commandCount?: number;
  /** Executions of this node that existed only to rebuild a descendant's state. */
  replays: number;
  /** Authored turns, in execution order. Replayed executions never append here. */
  turns: Turn[];
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  /** Milliseconds, from `transcript-end`. */
  duration: number;
  /** Absolute path of the node whose failure blocked this one (`unreached` only). */
  blockedBy: string | null;
  /** Why the transcript never ran (`error` only). */
  errorMessage?: string;
  /** 0-based position in the run's execution order, from the authored start. */
  index: number;
  /**
   * The world this node ENTERS — its ancestry replayed, its first command not
   * yet run (R5's inherited-state header). From the authored execution's
   * `transcript-start`, under `--capture-world`.
   */
  entryWorld?: WorldSnapshot;
}

/** A `phase` pair in flight or finished — the time before the first command. */
export interface PhaseState {
  name: PhaseEvent['name'];
  status: PhaseEvent['status'];
  detail?: string;
  /** Elapsed at `started`. */
  startedAt: number;
  /** Elapsed at `finished`; undefined while running. */
  finishedAt?: number;
}

/** The whole surface's state. Views read it; only `applyEvent` writes it. */
export interface RunModel {
  mode: RunMode | null;
  transcriptCount?: number;
  /** Every node seen, keyed by absolute path. */
  nodes: Map<string, TestNode>;
  /** Nodes with no `parent`, in first-seen order. */
  roots: TestNode[];
  phases: PhaseState[];
  /** The node currently executing an authored run, or null. */
  running: TestNode | null;
  /** Commands from authored executions — the number the reporter calls "authored". */
  authoredCommands: number;
  /** Commands from replayed executions (ADR-302 D17). */
  replayedCommands: number;
  progress: { scope: string; done: number; total?: number; budgets?: BudgetUse[] } | null;
  coverage: CoverageEvent | null;
  /** Set by `run-end`; null while the run is in flight. */
  summary: RunEndEvent | null;
  /** True between `run-start` and `run-end`. */
  inFlight: boolean;
  /**
   * The execution currently open. The wire pairs `transcript-start` with the
   * next `transcript-end` **positionally**, never by `file`, because a file
   * recurs within one run. Held on the model rather than in module scope so two
   * models never share a cursor.
   */
  open: OpenExecution | null;
}

/** One in-flight execution: which node, and whether it is a replay. */
interface OpenExecution {
  node: TestNode;
  replayed: boolean;
}

/** Basename without the `.transcript` extension — the name every view shows. */
export function stemOf(file: string): string {
  const base = file.split('/').pop() ?? file;
  return base.replace(/\.transcript$/, '');
}

/** A model with nothing applied to it yet. */
export function createModel(): RunModel {
  return {
    mode: null,
    nodes: new Map(),
    roots: [],
    phases: [],
    running: null,
    authoredCommands: 0,
    replayedCommands: 0,
    progress: null,
    coverage: null,
    summary: null,
    inFlight: false,
    open: null,
  };
}

/**
 * The node for `file`, created on first sight.
 *
 * Parentage is attached only when a `parent` arrives, and only once: the wire
 * announces a node's parent on every one of its executions, including replays,
 * and re-linking would duplicate it under its parent.
 */
function nodeFor(model: RunModel, file: string, parent?: string): TestNode {
  let node = model.nodes.get(file);
  if (!node) {
    node = {
      file,
      stem: stemOf(file),
      parent: parent ?? null,
      children: [],
      status: 'pending',
      replays: 0,
      turns: [],
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
      blockedBy: null,
      index: model.nodes.size,
    };
    model.nodes.set(file, node);
    if (!parent) model.roots.push(node);
  }
  if (parent && node.parent === null) node.parent = parent;
  if (node.parent) {
    const owner = model.nodes.get(node.parent);
    // The parent may not have been seen yet (it is announced by its own start).
    // Link on the first occasion both ends exist; `includes` keeps it once.
    if (owner && !owner.children.includes(node)) {
      owner.children.push(node);
      const orphaned = model.roots.indexOf(node);
      if (orphaned >= 0) model.roots.splice(orphaned, 1);
    }
  }
  return node;
}

function applyTranscriptStart(model: RunModel, event: TranscriptStartEvent): void {
  const node = nodeFor(model, event.file, event.parent);
  node.commandCount = event.commandCount;
  model.open = { node, replayed: event.replayed === true };
  if (event.replayed) {
    // A replay rebuilds a descendant's state. It is not this node running: its
    // status, turns and tallies stay exactly as its authored execution left them.
    node.replays += 1;
    return;
  }
  node.index = event.index;
  node.status = 'running';
  node.turns = [];
  node.passed = 0;
  node.failed = 0;
  node.expectedFailures = 0;
  node.skipped = 0;
  // R5: where this file starts from, captured as the authored execution
  // entered it. Left in place when the stream carries none, so an older
  // producer does not blank a header a newer run already filled.
  if (event.world !== undefined) node.entryWorld = event.world;
  model.running = node;
}

function applyCommandResult(model: RunModel, event: CommandResultEvent): void {
  if (!model.open) return; // a command with no open start is not ours to place
  if (model.open.replayed) {
    model.replayedCommands += 1;
    return;
  }
  model.authoredCommands += 1;
  model.open.node.turns.push({
    line: event.line,
    input: event.input,
    passed: event.passed,
    expectedFailure: event.expectedFailure,
    skipped: event.skipped,
    error: event.error,
    actualOutput: event.actualOutput,
    turn: event.turn,
    ending: event.ending,
    failure: event.failure,
    world: event.world,
  });
}

function applyTranscriptEnd(model: RunModel, event: TranscriptEndEvent): void {
  const node = nodeFor(model, event.file);
  const replayed = model.open?.replayed === true;
  model.open = null;

  if (event.status === 'unreached') {
    // Never ran, and never red: one ancestor's failure is the failure.
    node.status = 'unreached';
    node.blockedBy = event.blockedBy ?? null;
    node.duration = event.duration;
    return;
  }
  if (replayed) return; // a replay's end says nothing about the node's own result

  node.status = event.status;
  node.passed = event.passed;
  node.failed = event.failed;
  node.expectedFailures = event.expectedFailures;
  node.skipped = event.skipped;
  node.duration = event.duration;
  node.errorMessage = event.errorMessage;
  if (model.running === node) model.running = null;
}

function applyPhase(model: RunModel, event: PhaseEvent): void {
  const open = model.phases.find((p) => p.name === event.name && p.finishedAt === undefined);
  if (event.status === 'started' || !open) {
    model.phases.push({
      name: event.name,
      status: event.status,
      detail: event.detail,
      startedAt: event.elapsedMs,
      finishedAt: event.status === 'finished' ? event.elapsedMs : undefined,
    });
    return;
  }
  open.status = 'finished';
  open.finishedAt = event.elapsedMs;
  if (event.detail) open.detail = event.detail;
}

/**
 * Folds one run event into the model, in arrival order.
 *
 * Unknown event types are ignored rather than rejected — the wire's stated
 * contract for additive variants (a future `finding`). Returns the model for
 * convenience; the fold is in-place.
 */
export function applyEvent(model: RunModel, event: RunEvent): RunModel {
  switch (event.type) {
    case 'run-start':
      model.mode = event.mode;
      model.transcriptCount = event.transcriptCount;
      model.inFlight = true;
      model.summary = null;
      break;
    case 'phase':
      applyPhase(model, event);
      break;
    case 'transcript-start':
      applyTranscriptStart(model, event);
      break;
    case 'command-result':
      applyCommandResult(model, event);
      break;
    case 'transcript-end':
      applyTranscriptEnd(model, event);
      break;
    case 'progress':
      model.progress = {
        scope: event.scope,
        done: event.done,
        total: event.total,
        budgets: event.budgets,
      };
      break;
    case 'coverage':
      model.coverage = event;
      break;
    case 'run-end':
      model.summary = event;
      model.running = null;
      model.inFlight = false;
      model.open = null;
      break;
    default:
      break;
  }
  return model;
}

/** Root-to-node path. The Column view's selected path, and every breadcrumb. */
export function ancestry(model: RunModel, node: TestNode): TestNode[] {
  const path: TestNode[] = [];
  let cursor: TestNode | undefined = node;
  const guard = new Set<string>();
  while (cursor && !guard.has(cursor.file)) {
    guard.add(cursor.file);
    path.unshift(cursor);
    cursor = cursor.parent ? model.nodes.get(cursor.parent) : undefined;
  }
  return path;
}

/**
 * Failures anywhere beneath `node`, excluding `node` itself.
 *
 * Required, not decorative (ADR-301 D2): Miller columns show only the selected
 * path, so a failure in an unexplored branch is otherwise invisible. `error`
 * counts — a transcript that could not run is a failure of the suite. `unreached`
 * does not: it is the *consequence* being counted, and counting it would restore
 * exactly the wall of red D13 exists to prevent.
 */
export function subtreeFailureCount(node: TestNode): number {
  return node.children.reduce(
    (total, child) =>
      total + (child.status === 'failed' || child.status === 'error' ? 1 : 0) + subtreeFailureCount(child),
    0,
  );
}

/**
 * The runner's marker for a command that executed after the story ended.
 *
 * `CommandResultEvent.error` carries EXACTLY this string for such a command —
 * branch-tester's runner normalizes the stopped-engine capture to it in one
 * place (`runner.ts`, the `'Error: Engine is not running'` → `error` fold) —
 * so the match here is exact, never a prose heuristic. If the runner ever
 * renames it, the real-path suite's terminal-marking test goes red rather than
 * the marking silently vanishing.
 */
export const STORY_OVER_ERROR = 'Engine is not running';

/**
 * Where the story ended inside this node's last run, if the run showed it.
 *
 * R9, evidence-based both ways. The primary evidence is the wire saying so: a
 * turn carrying `ending` is the one the engine announced `game.ended` on,
 * which covers the file whose LAST command ends the story cleanly — no dead
 * tail exists to observe there. Streams that predate the field fall back to
 * the dead tail itself: after an ending, every further command errors as
 * {@link STORY_OVER_ERROR}, so the ender is the turn before the first such
 * error. A clean ending on an old stream stays honestly unmarked (R10 — the
 * editor never claims what it cannot substantiate).
 */
export interface StoryEnd {
  /**
   * The turn that ended the story — the last one the engine ran. Null when
   * the story was already over before this file's first command: the ending
   * lives somewhere in its ancestry, not here.
   */
  endsAt: Turn | null;
  /** The turns that executed after the ending. Every one of them errored. */
  dead: Turn[];
}

/** This node's story ending, or null when its last run never showed one. */
export function storyEnd(node: TestNode): StoryEnd | null {
  const ender = node.turns.findIndex((turn) => turn.ending !== undefined);
  if (ender >= 0) return { endsAt: node.turns[ender], dead: node.turns.slice(ender + 1) };
  const first = node.turns.findIndex((turn) => turn.error === STORY_OVER_ERROR);
  if (first < 0) return null;
  return { endsAt: first > 0 ? node.turns[first - 1] : null, dead: node.turns.slice(first) };
}

/**
 * The transcripts `node` could legitimately continue from.
 *
 * Excluded, each by construction rather than by refusal-after-the-fact:
 * the node itself and everything beneath it (reparenting under your own
 * descendant is a cycle), and any node whose last run reached the story's
 * ending (its children replay through the ending and die — the same fact that
 * disables branching from it). The exclusions are only as good as the tree
 * the run proved: before a tree run, parentage is unknown and descendants
 * cannot be excluded — a cycle that slips past this list is the runner's own
 * named error on the next run, not a silent wrong write.
 */
export function reparentCandidates(model: RunModel, node: TestNode): TestNode[] {
  const excluded = new Set<TestNode>([node]);
  const mark = (parent: TestNode): void => {
    for (const child of parent.children) {
      excluded.add(child);
      mark(child);
    }
  };
  mark(node);
  return [...model.nodes.values()].filter(
    (candidate) => !excluded.has(candidate) && storyEnd(candidate) === null,
  );
}

/**
 * What one command changed in the world (R3), derived from the snapshot
 * before it and the snapshot after it.
 */
export interface WorldDelta {
  /** The location the player arrived in — present only when it changed. */
  movedTo?: WorldEntityRef;
  /** Now carried, and not carried before. */
  took: WorldEntityRef[];
  /** Carried before, and no longer. */
  dropped: WorldEntityRef[];
}

/**
 * Diffs two consecutive world snapshots into the changes a turn card offers
 * as `[STATE:]` assertions (R3). Null when either side is missing — a change
 * cannot be claimed against an unknown before — or when nothing changed.
 * Identity is the TOKEN, the same key the emitted assertion will resolve by.
 */
export function worldDelta(
  before: WorldSnapshot | undefined,
  after: WorldSnapshot | undefined,
): WorldDelta | null {
  if (!before || !after) return null;
  const movedTo =
    after.location && before.location?.token !== after.location.token ? after.location : undefined;
  const carried = new Set(before.inventory.map((item) => item.token));
  const carriedNow = new Set(after.inventory.map((item) => item.token));
  const took = after.inventory.filter((item) => !carried.has(item.token));
  const dropped = before.inventory.filter((item) => !carriedNow.has(item.token));
  if (!movedTo && took.length === 0 && dropped.length === 0) return null;
  return { ...(movedTo !== undefined ? { movedTo } : {}), took, dropped };
}

/**
 * The snapshot a turn's delta reads AGAINST: the previous turn's, or the
 * node's entry snapshot for the first turn — the same chain R5's header
 * starts.
 */
export function worldBefore(node: TestNode, index: number): WorldSnapshot | undefined {
  return index > 0 ? node.turns[index - 1].world : node.entryWorld;
}

/**
 * Transcripts anywhere beneath `node` — every file that `continues:` from it,
 * directly or through another.
 *
 * This is the blast radius of a turn-count edit (R4): a parent's command count
 * is a hidden input to every descendant's turn numbers, so adding or removing
 * a command here shifts each of theirs. Known only after a tree run has
 * announced parentage — before one, discovered nodes sit as roots and the
 * count is honestly zero.
 */
export function descendantCount(node: TestNode): number {
  return node.children.reduce((total, child) => total + 1 + descendantCount(child), 0);
}
