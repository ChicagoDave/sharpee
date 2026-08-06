/**
 * tree-runner.ts — running a story's transcript tree (ADR-302 D10, D13).
 *
 * **Running the harness runs every path.** There is no `--chain` flag and no
 * chained-versus-unchained mode, because the tree already states every
 * relationship such a flag used to imply. "The tests passed" means every
 * authored path passed, including every variation — which is the condition
 * that stops alternate-path gaps accumulating.
 *
 * **A child's state is re-executed, never restored** (D17). The walk takes no
 * save, restores no save, and registers no save/restore hooks: reaching a
 * divergent sibling means booting a fresh game and replaying that fork point's
 * ancestry into it. This costs Fernhill 551 commands where restoring cost 519
 * (+6.2%, measured 2026-08-05) and it buys back the engine's hook object, which
 * `registerSaveRestoreHooks` assigns wholesale — the harness's restart
 * confirmation and the tree's save hooks cannot both live there, and the tree
 * silently won (issue #227).
 *
 * **A chain still runs continuously.** The walk is depth-first and a node's
 * FIRST child simply continues the live engine, which is already at exactly the
 * state that child needs. Only siblings after the first pay a replay. A linear
 * tree therefore replays nothing and reproduces one continuous run, which is
 * what D3 means by a chain being the linear case.
 *
 * **A child that asks may reseed.** A plain child continues its parent's RNG
 * streams exactly. A child that declares its own seed instruments is asking for
 * different luck from the same state, and the points it names are reseeded
 * before its first command (ADR-302 D8's amendment). Replay applies each
 * ancestor's declared reseed at that ancestor's own boundary, so a replayed
 * prefix is bit-identical to the one its siblings saw and a child's own
 * instruments never leak backwards into it.
 *
 * Sequential only. D10 establishes that the tree *permits* parallelism and
 * commits to nothing about it; correctness is pinned first.
 *
 * Public interface: `runTree`, `TreeRunResult`, `NodeRunOutcome`, `GameFactory`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-302 — Transcript Branches — D3, D10, D13, D17
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
   * A transcript ending in death or victory leaves the ENGINE stopped, and a
   * first child continues that same live engine (D17) — so without this its
   * first command meets "Engine is not running". A rebooted sibling never
   * needs it; the first child is the one case that does.
   */
  reviveEngine?(): void;
  engine?: {
    getRandomService?(): { reseedStreams(points: 'all' | readonly string[]): void } | undefined;
  };
}

/**
 * Boots a fresh game for a root (D17).
 *
 * Called once per root and once per fork — every sibling after the first gets
 * its own game with its fork point's ancestry replayed into it. The factory is
 * handed the ROOT of the ancestry being replayed, since `entry:` and the pinned
 * seed are the root's to declare and a child inherits them through the
 * effective header rather than by reloading (D8).
 */
export type GameFactory = (root: TreeNode) => Promise<TreeGameEngine>;

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

/**
 * Watches a tree execute, as it executes.
 *
 * The returned `TreeRunResult` cannot serve this purpose even after the fact: a
 * replayed execution is deliberately absent from `outcomes`, because every node
 * must be reported exactly once for D13's "one broken spine node, one failure"
 * to hold. That is right for the report and wrong for a live view, which wants
 * to see the replays happen — they are 34 of Fernhill's 552 commands, and the
 * cost D17 chose to pay openly rather than hide.
 *
 * So the observer sees EVERY execution, marked, and the summary stays a
 * projection over `outcomes`. Two views of one run, neither derived from the
 * other's compromises.
 */
export interface TreeObserver {
  /** A node is about to execute. `replayed` = it runs to build a sibling's state. */
  onNodeStart?(info: { node: TreeNode; replayed: boolean; commandCount: number }): void;
  /** That execution finished. Fires for replays too. */
  onNodeEnd?(info: { node: TreeNode; replayed: boolean; result: TranscriptResult }): void;
  /**
   * A node that never ran because an ancestor failed (D13). `origin` is the
   * failing NODE rather than its stem, so a consumer can name it in whatever
   * identity domain it already uses — the wire joins on file paths, and a stem
   * would force a second lookup table.
   */
  onNodeUnreached?(info: { node: TreeNode; origin: TreeNode }): void;
}

/** Runner options plus the tree-shaped observation the flat runner has no concept of. */
export type TreeRunnerOptions = RunnerOptions & { treeObserver?: TreeObserver };

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
   * Total commands executed across the run, replays included. The measurable
   * form of AC-5 as amended by D17 — "a leaf costs exactly its ancestry" —
   * asserted on rather than wall-clock, which would only show that something
   * was faster.
   */
  readonly executedCommands: number;
  /**
   * Commands the story's authors actually wrote, counting each node once.
   * `executedCommands - authoredCommands` is the replay share, which D17 owns
   * as a cost rather than hiding: it is the number that grows if a story puts a
   * long spine above many children.
   */
  readonly authoredCommands: number;
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
 * Run every root-to-leaf path of a story's tree (ADR-302 D10, D17).
 *
 * A defective tree runs nothing: assembly reports every structural problem
 * together and this returns them untouched (D11). Otherwise the walk is
 * depth-first, one `runTranscript` per node. A node's first child continues the
 * live engine — which stands at exactly the state that child needs — and every
 * sibling after it gets a fresh game with the fork point's ancestry replayed
 * into it (D17). Nothing is saved and nothing is restored.
 *
 * When a node fails, its whole subtree reports as `unreached` rather than
 * running against a state the failure invalidated — one broken spine node
 * produces one failure, not one per descendant (D13).
 *
 * @param tree the assembled tree
 * @param game a `GameFactory`, or a single game positioned at a fresh start —
 *   the latter only for a tree that never forks, since a fork needs a boot
 * @param options runner options, forwarded per node with the node's own
 *   effective config
 * @throws when a fork needs a boot and no factory was supplied, and when a
 *   replayed ancestor disagrees with the run it already passed
 */
export async function runTree(
  tree: TranscriptTree,
  game: TreeGameEngine | GameFactory,
  options: TreeRunnerOptions = {}
): Promise<TreeRunResult> {
  const outcomes: NodeRunOutcome[] = [];
  let executedCommands = 0;
  let authoredCommands = 0;

  if (tree.defects.length > 0) {
    return { outcomes, defects: [...tree.defects], executedCommands, authoredCommands: 0 };
  }

  // A root IS a fresh game (D1), and so is every fork. A caller may still pass
  // one engine for a tree that never forks — a chain needs exactly one boot,
  // and it is the shape the stub-driven tests use.
  const isFactory = typeof game === 'function';
  let engine: TreeGameEngine = isFactory ? (undefined as never) : (game as TreeGameEngine);

  const boot = async (root: TreeNode): Promise<void> => {
    if (!isFactory) {
      throw new Error(
        `Tree fork at "${root.stem}" needs a fresh game and no game factory was supplied ` +
          `(ADR-302 D17). Pass a factory, or run a tree that does not fork.`
      );
    }
    engine = await (game as GameFactory)(root);
  };

  /** Mark a failed node's whole subtree unreached, naming the origin. */
  const markUnreached = (origin: TreeNode, node: TreeNode): void => {
    for (const child of node.children) {
      outcomes.push({ stem: child.stem, status: 'unreached', blockedBy: origin.stem });
      options.treeObserver?.onNodeUnreached?.({ node: child, origin });
      markUnreached(origin, child);
    }
  };

  /**
   * Execute one node's commands against the live engine.
   *
   * `replay` distinguishes the two reasons a node executes: because it is its
   * own test, or because a descendant needs the state it produces. A replay
   * adds no outcome — every node is reported exactly once, which is what keeps
   * D13's "one broken spine node, one failure" true.
   */
  const execute = async (node: TreeNode, replay: boolean): Promise<boolean> => {
    const config = effectiveConfig(node);
    applyReseed(engine, node);
    options.treeObserver?.onNodeStart?.({
      node,
      replayed: replay,
      commandCount: (node.transcript.items ?? []).filter((item) => item.type === 'command').length,
    });
    const result = await runTranscript(node.transcript, engine as never, {
      ...options,
      // The tree announces its own nodes, with the parentage and replay marking
      // the flat runner has no concept of. Forwarding `onTranscriptStart` too
      // would announce every execution twice, in two different shapes.
      observer: options.observer && { onCommandResult: options.observer.onCommandResult },
      // D8: the node runs at its RESOLVED header, not its declared one.
      assembledChannels: options.assembledChannels ?? config.channels,
    });
    options.treeObserver?.onNodeEnd?.({ node, replayed: replay, result });
    const ran = result.commands?.length ?? 0;
    executedCommands += ran;
    if (!replay) {
      authoredCommands += ran;
      outcomes.push({ stem: node.stem, status: 'ran', result });
      return result.status === 'passed';
    }
    // A replayed ancestor already passed as its own test. Disagreeing now means
    // the run is not reproducible, which invalidates every result after it —
    // so it stops the walk instead of being folded in as one more failure.
    if (result.status !== 'passed') {
      throw new Error(
        `Replay of "${node.stem}" disagreed with the run it already passed — the tree is ` +
          `not reproducible at this seed (ADR-302 D17).`
      );
    }
    return true;
  };

  const walk = async (node: TreeNode): Promise<void> => {
    if (!(await execute(node, false))) {
      markUnreached(node, node);
      return;
    }

    for (let i = 0; i < node.children.length; i += 1) {
      if (i > 0) {
        // A fork. The previous sibling's whole subtree has moved the engine on,
        // so this one starts from a boot and replays the path back to here.
        await boot(node.ancestry[0]);
        for (const ancestor of node.ancestry) await execute(ancestor, true);
      } else {
        // The first child continues the live engine, which is already at this
        // node's end state. A parent that ended in death or victory left it
        // stopped, so revive before handing it over.
        engine.reviveEngine?.();
      }
      await walk(node.children[i]);
    }
  };

  for (const root of tree.roots) {
    if (isFactory) await boot(root);
    await walk(root);
  }

  return { outcomes, defects: [], executedCommands, authoredCommands };
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

/*
 * `captureSave` / `applySave` lived here until D17 (2026-08-05). They took the
 * parent's save and restored it before each child, and their removal is the
 * whole of that decision: `registerSaveRestoreHooks` assigns the engine's hook
 * object wholesale, so registering save hooks here dropped the harness's own
 * `onRestartRequested` and left `restart` acking without ever rebooting for any
 * node with a parent (issue #226's sibling, filed as #227). Replay costs
 * Fernhill 6.2% and owes the save format nothing.
 */
