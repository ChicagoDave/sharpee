/**
 * tree-runner.test.ts — ADR-302 D10/D17: running the harness runs every path,
 * and a child's state is re-executed rather than restored.
 *
 * Covers **AC-1** (two transcripts naming one parent both run from that
 * parent's end state, and neither executes the other's commands) and **AC-5**
 * as amended by D17 (every root-to-leaf path runs; a leaf costs exactly its
 * ancestry — asserted on the executed command count, never on wall-clock,
 * which would only show that something was faster).
 *
 * The engine here is a stub, but it is a stub of the *engine*, not of the walk:
 * `runTree`, `runTranscript`, tree assembly and the boot/replay choreography
 * are all the real ones. The stub records every command with the state token it
 * ran against, so "which state did this child start from?" is answerable, and
 * counts boots so replay is observable rather than inferred.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTranscriptFile } from '../src/parser.js';
import { assembleTree } from '../src/tree.js';
import { runTree, reseedFor } from '../src/tree-runner.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-tree-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Write a transcript file and parse it, as a real run would. */
function write(stem: string, header: string, commands: string[]) {
  const body = commands.map((c) => `> ${c}\n[OK: contains "ok"]\n`).join('\n');
  const file = path.join(dir, `${stem}.transcript`);
  fs.writeFileSync(file, `title: ${stem}\n${header}---\n\n${body}`, 'utf-8');
  return parseTranscriptFile(file);
}

/**
 * A stub harness: a game factory plus the recorders every boot writes into.
 *
 * Each boot is a genuinely fresh game whose state token starts at `fresh`, so a
 * replayed prefix is distinguishable from a continued one, and `boots` counts
 * how many games the walk asked for. `hookRegistrations` exists to hold D17's
 * central claim — that the tree registers no save/restore hooks at all, which
 * is what stopped it clobbering the harness's restart hook (issue #227).
 */
function stubHarness() {
  const executed: Array<{ command: string; from: string }> = [];
  const reseeds: Array<'all' | readonly string[]> = [];
  const counters = { boots: 0, hookRegistrations: 0 };

  const newGame = () => {
    let token = 'fresh';
    return {
      executeCommand: async (command: string) => {
        executed.push({ command, from: token });
        // Executing moves the world on, so the token names the state reached.
        token = `${token}+${command}`;
        return 'ok';
      },
      world: {},
      engine: {
        registerSaveRestoreHooks() {
          counters.hookRegistrations += 1;
        },
        getMasterSeed: () => 42,
        // The full session-instrument surface the real runner drives, so the
        // walk exercises `configureRandomInstruments` rather than routing
        // around it.
        getRandomService: () => ({
          reseedStreams(points: 'all' | readonly string[]) {
            reseeds.push(points);
          },
          loadForces() {},
          clearForces() {},
          getForceReport: () => [],
          setPointSeedOverrides() {},
        }),
        setRandomTraceEnabled() {},
      },
    };
  };

  return {
    executed,
    reseeds,
    counters,
    factory: async () => {
      counters.boots += 1;
      return newGame();
    },
  };
}

const commandsOf = (harness: ReturnType<typeof stubHarness>) =>
  harness.executed.map((e) => e.command);

describe('runTree — every path, ancestry re-executed (ADR-302 D10, D17)', () => {
  it('AC-5 — a fork replays the prefix for every sibling after the first', async () => {
    // Two leaves off one spine. The first continues the live engine; the
    // second boots and replays, because the first one's run moved it on.
    const tree = assembleTree([
      write('root', '', ['look', 'north']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);
    expect(tree.defects).toEqual([]);

    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);

    // Children run in stem order (alpha before beta) — deterministic without
    // anyone declaring an order.
    expect(commandsOf(harness)).toEqual([
      'look',
      'north',
      'take lamp',
      'look',
      'north',
      'drop lamp',
    ]);
    // Two leaves, ancestry 3 commands each.
    expect(run.executedCommands).toBe(6);
    // …of which 4 are authored; the other 2 are the replay, named as such.
    expect(run.authoredCommands).toBe(4);
    expect(harness.counters.boots).toBe(2);
  });

  it('AC-5 — the run costs the sum of its leaves\' ancestries, and no more', async () => {
    //        root(1) ── mid(1) ── leaf1(1)
    //           │         └────── leaf2(1)
    //           └────── other(1)
    // Leaves: leaf1 (3), leaf2 (3), other (2) → 8.
    const tree = assembleTree([
      write('root', '', ['a']),
      write('mid', 'continues: root\n', ['b']),
      write('leaf1', 'continues: mid\n', ['c']),
      write('leaf2', 'continues: mid\n', ['d']),
      write('other', 'continues: root\n', ['e']),
    ]);
    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);

    expect(run.outcomes.filter((o) => o.status === 'ran').map((o) => o.stem)).toEqual([
      'root',
      'mid',
      'leaf1',
      'leaf2',
      'other',
    ]);
    expect(run.executedCommands).toBe(8);
    // Five nodes of one command each, counted once however often they replay.
    expect(run.authoredCommands).toBe(5);
  });

  it('D17 — the walk registers no save/restore hooks at all (issue #227)', async () => {
    // The whole decision in one assertion. Registering hooks here assigned the
    // engine's hook object wholesale, dropping the harness's own
    // onRestartRequested and leaving `restart` acking without rebooting for
    // every node that had a parent.
    const tree = assembleTree([
      write('root', '', ['look', 'north']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);
    const harness = stubHarness();
    await runTree(tree, harness.factory as never);

    expect(harness.counters.hookRegistrations).toBe(0);
  });

  it('AC-1 — both children run from the parent\'s end state', async () => {
    const tree = assembleTree([
      write('root', '', ['look', 'north']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);

    const harness = stubHarness();
    await runTree(tree, harness.factory as never);

    const startedFrom = (command: string) =>
      harness.executed.find((e) => e.command === command)!.from;

    // The parent ended at fresh+look+north; both children begin there — beta
    // does NOT begin where alpha's run left the engine. That the second one
    // arrives there by replay rather than restore is invisible from here,
    // which is the point.
    expect(startedFrom('take lamp')).toBe('fresh+look+north');
    expect(startedFrom('drop lamp')).toBe('fresh+look+north');
  });

  it('AC-1 — neither child executes the other\'s commands', async () => {
    const tree = assembleTree([
      write('root', '', ['look']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);
    const harness = stubHarness();
    await runTree(tree, harness.factory as never);

    expect(commandsOf(harness).filter((c) => c === 'take lamp')).toHaveLength(1);
    expect(commandsOf(harness).filter((c) => c === 'drop lamp')).toHaveLength(1);
  });

  it('a linear tree is a chain — one continuous run, and nothing replays', async () => {
    // D3: a chain is the linear case of the same mechanism, and D17 leaves it
    // untouched — every node is a first child, so the engine sees one
    // continuous sequence and boots exactly once.
    const tree = assembleTree([
      write('one', '', ['a']),
      write('two', 'continues: one\n', ['b']),
      write('three', 'continues: two\n', ['c']),
    ]);
    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);

    expect(harness.executed.map((e) => e.from)).toEqual(['fresh', 'fresh+a', 'fresh+a+b']);
    expect(harness.counters.boots).toBe(1);
    expect(run.executedCommands).toBe(run.authoredCommands);
  });

  it('runs multiple roots independently, each from its own boot', async () => {
    const tree = assembleTree([write('one', '', ['a']), write('two', '', ['b'])]);
    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);
    expect(run.outcomes.map((o) => o.stem)).toEqual(['one', 'two']);
    expect(harness.counters.boots).toBe(2);
    expect(harness.executed.map((e) => e.from)).toEqual(['fresh', 'fresh']);
  });

  it('a fork without a game factory is a named error, never a silent wrong state', async () => {
    // A caller may pass one engine for a chain. A fork needs a boot, and
    // continuing from the previous sibling's end state instead would produce a
    // scatter of unrelated assertion failures with nothing pointing at the
    // cause — the exact failure mode issue #226 cost two diagnoses.
    const tree = assembleTree([
      write('root', '', ['a']),
      write('alpha', 'continues: root\n', ['b']),
      write('beta', 'continues: root\n', ['c']),
    ]);
    const harness = stubHarness();
    const single = await harness.factory();

    await expect(runTree(tree, single as never)).rejects.toThrow(/needs a fresh game/);
  });

  it('a replay that disagrees with the run it already passed stops the walk', async () => {
    // Non-determinism invalidates every result after it, so it is not folded in
    // as one more assertion failure.
    const tree = assembleTree([
      write('root', '', ['a']),
      write('alpha', 'continues: root\n', ['b']),
      write('beta', 'continues: root\n', ['c']),
    ]);

    let boots = 0;
    const flakyFactory = async () => {
      boots += 1;
      const answer = boots === 1 ? 'ok' : 'different';
      return {
        executeCommand: async () => answer,
        world: {},
        engine: { getRandomService: () => undefined, setRandomTraceEnabled() {} },
      };
    };

    await expect(runTree(tree, flakyFactory as never)).rejects.toThrow(/not reproducible/);
  });

  it('a defective tree executes nothing (D11)', async () => {
    const tree = assembleTree([
      write('loop-a', 'continues: loop-b\n', ['a']),
      write('loop-b', 'continues: loop-a\n', ['b']),
    ]);
    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);

    expect(run.defects.length).toBeGreaterThan(0);
    expect(run.executedCommands).toBe(0);
    expect(harness.executed).toEqual([]);
    expect(run.outcomes).toEqual([]);
    expect(harness.counters.boots).toBe(0);
  });

  it('a failed node blocks its subtree, naming the origin once (D13)', async () => {
    const tree = assembleTree([
      write('root', '', ['a']),
      // A transcript whose assertion cannot hold: the stub always says 'ok'.
      (() => {
        const file = path.join(dir, 'broken.transcript');
        fs.writeFileSync(
          file,
          'title: broken\ncontinues: root\n---\n\n> b\n[OK: contains "impossible"]\n',
          'utf-8',
        );
        return parseTranscriptFile(file);
      })(),
      write('under-broken', 'continues: broken\n', ['c']),
      write('sibling', 'continues: root\n', ['d']),
    ]);

    const harness = stubHarness();
    const run = await runTree(tree, harness.factory as never);

    const byStem = new Map(run.outcomes.map((o) => [o.stem, o]));
    expect(byStem.get('broken')!.status).toBe('ran');
    expect(byStem.get('broken')!.result!.status).not.toBe('passed');
    expect(byStem.get('under-broken')!.status).toBe('unreached');
    expect(byStem.get('under-broken')!.blockedBy).toBe('broken');
    // The healthy sibling still runs — one failure does not abandon the tree.
    expect(byStem.get('sibling')!.status).toBe('ran');
    expect(commandsOf(harness)).not.toContain('c');
    // …and it runs from a replay of the spine, not from the failure's leftovers.
    expect(harness.executed.find((e) => e.command === 'd')!.from).toBe('fresh+a');
  });
});

describe('reseedFor — which streams a child re-rolls (ADR-302 D8 amendment)', () => {
  const node = (transcripts: ReturnType<typeof write>[], stem: string) =>
    assembleTree(transcripts).byStem.get(stem)!;

  it('a child declaring nothing does not reseed — plain restore keeps continuity', () => {
    const n = node([write('root', 'seed: 42\n', ['a']), write('kid', 'continues: root\n', ['b'])], 'kid');
    expect(reseedFor(n)).toBeNull();
  });

  it('a child declaring its own seed reseeds everything', () => {
    const n = node(
      [write('root', 'seed: 42\n', ['a']), write('kid', 'continues: root\nseed: 7\n', ['b'])],
      'kid',
    );
    expect(reseedFor(n)).toBe('all');
  });

  it('a child declaring point-seed reseeds only the points it names', () => {
    const n = node(
      [
        write('root', 'seed: 42\n', ['a']),
        write('kid', 'continues: root\npoint-seed: troll.blow=7\n', ['b']),
      ],
      'kid',
    );
    expect(reseedFor(n)).toEqual(['troll.blow']);
  });

  it('keys on what the child DECLARED, not on what it inherited', () => {
    // Inheriting a seed means continuing the parent's game; reseeding there
    // would break the continuity a linear chain depends on.
    const n = node(
      [write('root', 'seed: 42\n', ['a']), write('kid', 'continues: root\n', ['b'])],
      'kid',
    );
    expect(reseedFor(n)).toBeNull();
  });

  it('a root never reseeds — it starts fresh, with nothing restored to drop', () => {
    expect(reseedFor(node([write('root', 'seed: 42\n', ['a'])], 'root'))).toBeNull();
  });

  it('the walk applies the reseed the child asked for, and only that', async () => {
    const tree = assembleTree([
      write('root', 'seed: 42\n', ['a']),
      write('plain', 'continues: root\n', ['b']),
      write('rerolled', 'continues: root\npoint-seed: troll.blow=7\n', ['c']),
    ]);
    const harness = stubHarness();
    await runTree(tree, harness.factory as never);

    // One reseed, for the one child that asked — the replayed root declares
    // nothing, so replay adds none of its own.
    expect(harness.reseeds).toEqual([['troll.blow']]);
  });
});
