/**
 * tree-runner.ts — running a story's transcript tree (ADR-302 D10, D13).
 *
 * **Running the harness runs every path.** There is no `--chain` flag and no
 * chained-versus-unchained mode, because the tree already states every
 * relationship such a flag used to imply. "The tests passed" means every
 * authored path passed, including every variation — which is the condition
 * that stops alternate-path gaps accumulating.
 *
 * **A shared prefix executes once.** The walk is depth-first over the tree
 * rather than a loop over paths: each node's commands run exactly once, and a
 * divergent tail resumes from a save of the state its parent produced. Running
 * paths independently would replay every prefix per leaf — on Fernhill that is
 * merely wasteful, and on a Dungeo-shaped spine it would be a 952-command
 * replay per leaf.
 *
 * **A child restores; a child that asks may also reseed.** ADR-293 D7's
 * restore is deliberately continuous, so a plain child continues its parent's
 * RNG streams exactly — which is what makes a linear tree reproduce a single
 * continuous run (D3). A child that declares its own seed instruments is
 * asking for different luck from the same state, and the points it names are
 * reseeded before its first command (ADR-302 D8's amendment).
 *
 * Sequential only. D10 establishes that the tree *permits* parallelism and
 * commits to nothing about it; correctness is pinned first.
 *
 * Public interface: `runTree`, `TreeRunResult`, `NodeRunOutcome`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-302 — Transcript Branches — D3, D10, D13
 */

import { RunnerOptions, TranscriptResult } from './types.js';
import { runTranscript } from './runner.js';
import {
  TranscriptTree,
  TreeNode,
  TreeDefect,
  effectiveConfig,
} from './tree.js';

/**
 * The engine surface the tree walk drives. Structural so the harness never
 * imports the engine class — the same treatment `runner.ts` gives it.
 */
interface TreeGameEngine {
  executeCommand(input: string): Promise<string> | string;
  /**
   * Resume the engine after a game-over stopped it.
   *
   * A branch whose transcript ends in death or victory leaves the ENGINE
   * stopped, and restoring a save rewinds the world without restarting it —
   * so the next sibling's first command met "Engine is not running". The
   * harness owns reviving, exactly as v1's RETRY restore path does.
   */
  reviveEngine?(): void;
  engine?: {
    registerSaveRestoreHooks(hooks: {
      onSaveRequested(data: unknown): Promise<void>;
      onRestoreRequested(): Promise<unknown | null>;
    }): void;
    save(): Promise<boolean>;
    restore(): Promise<boolean>;
    getRandomService?(): { reseedStreams(points: 'all' | readonly string[]): void } | undefined;
  };
}

/** What happened to one node in a tree run. */
export interface NodeRunOutcome {
  readonly stem: string;
  /**
   * `ran` — the node's transcript executed, and `result` says how it went.
   * `unreached` — an ancestor failed, so this node never executed (D13). Its
   * `result` is absent and `blockedBy` names the originating failure.
   */
  readonly status: 'ran' | 'unreached';
  readonly result?: TranscriptResult;
  /** Stem of the ancestor whose failure blocked this node. */
  readonly blockedBy?: string;
}

/** The outcome of running one story's tree. */
export interface TreeRunResult {
  /** Per-node outcomes in execution order. */
  readonly outcomes: NodeRunOutcome[];
  /**
   * Structural defects from assembly. Non-empty means **nothing ran** — a
   * malformed tree fails whole, before execution (D11).
   */
  readonly defects: TreeDefect[];
  /**
   * Total commands executed across the run. The measurable form of "a shared
   * prefix executes exactly once" (AC-5) — asserted on rather than wall-clock,
   * which would only show that something was faster.
   */
  readonly executedCommands: number;
}

/**
 * Which choice-point streams a node reseeds before its first command
 * (ADR-302 D8 amendment).
 *
 * Keyed on what the node **declared**, never on its effective (inherited)
 * config: inheriting a parent's seed means continuing that parent's game, and
 * reseeding there would break the continuity a linear chain depends on.
 * Declaring one is an instruction.
 *
 * - a declared `seed:`/`seeds:` → `'all'`, the blunt instrument: the whole
 *   firing schedule re-derives from that seed.
 * - a declared `point-seed:` → just the points it names, the narrow one.
 * - neither → `null`, a plain restore.
 *
 * A root never reseeds: it starts a fresh game, so there is no continuity to
 * break and nothing restored to drop.
 */
export function reseedFor(node: TreeNode): 'all' | string[] | null {
  if (node.parent === null) return null;
  const declared = new Set(node.transcript.declaredConfigKeys ?? []);
  if (declared.has('seed') || declared.has('seeds')) return 'all';
  if (declared.has('point-seed')) {
    const points = (node.transcript.config?.pointSeeds ?? []).map((entry) => entry.point);
    return points.length > 0 ? points : null;
  }
  return null;
}

/**
 * Run every root-to-leaf path of a story's tree (ADR-302 D10).
 *
 * A defective tree runs nothing: assembly reports every structural problem
 * together and this returns them untouched (D11). Otherwise the walk is
 * depth-first, one `runTranscript` per node against the shared engine, with a
 * save taken at each node that has children and restored before each of them.
 *
 * When a node fails, its whole subtree reports as `unreached` rather than
 * running against a state the failure invalidated — one broken spine node
 * produces one failure, not one per descendant (D13).
 *
 * @param tree the assembled tree
 * @param engine the game, positioned at a fresh start
 * @param options runner options, forwarded per node with the node's own
 *   effective config
 */
export async function runTree(
  tree: TranscriptTree,
  game: TreeGameEngine | (() => Promise<TreeGameEngine>),
  options: RunnerOptions = {}
): Promise<TreeRunResult> {
  const outcomes: NodeRunOutcome[] = [];
  let executedCommands = 0;

  if (tree.defects.length > 0) {
    return { outcomes, defects: [...tree.defects], executedCommands };
  }

  // A root IS a fresh game (D1), so a story with several of them needs a new
  // one per root — the previous root's whole subtree has moved the engine on,
  // and there is no save to restore because a root restores from nothing.
  // A caller passing a single engine gets today's behaviour: fine for one
  // root, and the tests that drive a stub rely on it.
  const isFactory = typeof game === 'function';
  let engine: TreeGameEngine = isFactory ? (undefined as never) : game;

  /** Mark a failed node's whole subtree unreached, naming the origin. */
  const markUnreached = (node: TreeNode, blockedBy: string): void => {
    for (const child of node.children) {
      outcomes.push({ stem: child.stem, status: 'unreached', blockedBy });
      markUnreached(child, blockedBy);
    }
  };

  const runNode = async (node: TreeNode): Promise<void> => {
    const config = effectiveConfig(node);
    const result = await runTranscript(node.transcript, engine as never, {
      ...options,
      // D8: the node runs at its RESOLVED header, not its declared one.
      assembledChannels: options.assembledChannels ?? config.channels,
    });
    executedCommands += result.commands?.length ?? 0;
    outcomes.push({ stem: node.stem, status: 'ran', result });

    if (result.status !== 'passed') {
      markUnreached(node, node.stem);
      return;
    }
    if (node.children.length === 0) return;

    // One save serves every child — the state this node produced. Taken once
    // rather than per child, since the children all start from the same place.
    const save = await captureSave(engine);

    for (const child of node.children) {
      // Restore before EVERY child, including the first: a uniform reset is
      // what makes sibling order not matter, and the previous child's subtree
      // has already moved the engine on.
      if (save !== null) await applySave(engine, save);
      // A previous sibling may have ended in death or victory, which stops the
      // engine. Restoring rewinds the world but not that, so revive before the
      // child's first command.
      engine.reviveEngine?.();
      applyReseed(engine, child);
      await runNode(child);
    }
  };

  for (const root of tree.roots) {
    if (isFactory) engine = await (game as () => Promise<TreeGameEngine>)();
    await runNode(root);
  }

  return { outcomes, defects: [], executedCommands };
}

/**
 * Drop the streams a child asked to reseed (ADR-302 D8 amendment).
 *
 * Silent when the engine exposes no random service — a stub harness or an
 * older engine simply continues, which is the pre-amendment behaviour rather
 * than a failure.
 */
function applyReseed(engine: TreeGameEngine, node: TreeNode): void {
  const points = reseedFor(node);
  if (points === null) return;
  engine.engine?.getRandomService?.()?.reseedStreams(points);
}

/**
 * Capture the engine's save payload in memory. Returns null when the platform
 * engine is unavailable or the save fails — a tree of one node needs no save,
 * and a stub engine that cannot save still runs its transcripts.
 */
async function captureSave(engine: TreeGameEngine): Promise<unknown | null> {
  const platform = engine.engine;
  if (!platform) return null;
  let captured: unknown = null;
  platform.registerSaveRestoreHooks({
    onSaveRequested: async (data) => {
      captured = data;
    },
    onRestoreRequested: async () => null,
  });
  // Deliberately NOT caught. A swallowed save error is the worst failure mode
  // this walk has: with no save, every child runs UNRESTORED — continuing from
  // its sibling's end state — and the result is a scatter of unrelated
  // world-state assertion failures with nothing pointing at the save. That is
  // exactly how a platform exception during save presented while chasing
  // issue #226, and it cost two wrong diagnoses. A tree that cannot save at a
  // fork cannot run that fork; say so.
  const saved = await platform.save();
  return saved ? captured : null;
}

/** Restore a captured save. The engine owns what a save contains. */
async function applySave(engine: TreeGameEngine, save: unknown): Promise<void> {
  const platform = engine.engine;
  if (!platform) return;
  try {
    platform.registerSaveRestoreHooks({
      onSaveRequested: async () => {
        /* not used by a tree restore */
      },
      onRestoreRequested: async () => save,
    });
    await platform.restore();
  } catch {
    /* a failed restore surfaces as the child's own divergence */
  }
}
