/**
 * tree-runner.test.ts — ADR-302 D10: running the harness runs every path, and
 * a shared prefix runs once.
 *
 * Covers **AC-1** (two transcripts naming one parent both run from that
 * parent's end state, and neither executes the other's commands) and **AC-5**
 * (every root-to-leaf path runs; a shared prefix's commands execute exactly
 * once — asserted on the executed command count, never on wall-clock, which
 * would only show that something was faster).
 *
 * The engine here is a stub, but it is a stub of the *engine*, not of the walk:
 * `runTree`, `runTranscript`, tree assembly and the save/restore choreography
 * are all the real ones. The stub records commands and models save/restore as
 * a state token so "which state did this child start from?" is answerable.
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
 * Stub engine that records every command with the save-state it was executed
 * against, so a child's starting state is observable rather than inferred.
 */
function stubEngine() {
  const executed: Array<{ command: string; from: string }> = [];
  const reseeds: Array<'all' | readonly string[]> = [];
  let token = 'fresh';
  let counter = 0;
  let onRestore: () => Promise<unknown | null> = async () => null;
  let onSave: (data: unknown) => Promise<void> = async () => {};

  const engine = {
    executed,
    reseeds,
    executeCommand: async (command: string) => {
      executed.push({ command, from: token });
      // Executing moves the world on, so a later save captures a new state.
      token = `${token}+${command}`;
      return 'ok';
    },
    world: {},
    engine: {
      registerSaveRestoreHooks(hooks: {
        onSaveRequested(data: unknown): Promise<void>;
        onRestoreRequested(): Promise<unknown | null>;
      }) {
        onSave = hooks.onSaveRequested;
        onRestore = hooks.onRestoreRequested;
      },
      async save() {
        counter += 1;
        await onSave({ version: '3.0.0', token, id: counter });
        return true;
      },
      async restore() {
        const data = (await onRestore()) as { token?: string } | null;
        if (!data) return false;
        token = data.token ?? token;
        return true;
      },
      getMasterSeed: () => 42,
      // The full session-instrument surface the real runner drives, so the
      // walk exercises `configureRandomInstruments` rather than routing around
      // it.
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
  return engine;
}

const commandsOf = (engine: ReturnType<typeof stubEngine>) =>
  engine.executed.map((e) => e.command);

describe('runTree — every path, shared prefixes once (ADR-302 D10)', () => {
  it('AC-5 — a shared prefix executes exactly once across a fork', () => {
    // Two leaves off one spine. Run as paths, the spine would execute twice.
    const transcripts = [
      write('root', '', ['look', 'north']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ];
    const tree = assembleTree(transcripts);
    expect(tree.defects).toEqual([]);

    const engine = stubEngine();
    return runTree(tree, engine as never).then((run) => {
      // Children run in stem order (alpha before beta) — deterministic
      // without anyone declaring an order.
      expect(commandsOf(engine)).toEqual(['look', 'north', 'take lamp', 'drop lamp']);
      // 2 prefix + 1 + 1, not 2 + 2 + 1 + 1.
      expect(run.executedCommands).toBe(4);
      expect(engine.executed.filter((e) => e.command === 'look')).toHaveLength(1);
      expect(engine.executed.filter((e) => e.command === 'north')).toHaveLength(1);
    });
  });

  it('AC-1 — both children run from the parent\'s end state', async () => {
    const tree = assembleTree([
      write('root', '', ['look', 'north']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);

    const engine = stubEngine();
    await runTree(tree, engine as never);

    const startedFrom = (command: string) =>
      engine.executed.find((e) => e.command === command)!.from;

    // The parent ended at fresh+look+north; both children begin there — beta
    // does NOT begin where alpha's run left the engine.
    expect(startedFrom('take lamp')).toBe('fresh+look+north');
    expect(startedFrom('drop lamp')).toBe('fresh+look+north');
  });

  it('AC-1 — neither child executes the other\'s commands', async () => {
    const tree = assembleTree([
      write('root', '', ['look']),
      write('alpha', 'continues: root\n', ['take lamp']),
      write('beta', 'continues: root\n', ['drop lamp']),
    ]);
    const engine = stubEngine();
    await runTree(tree, engine as never);

    expect(commandsOf(engine).filter((c) => c === 'take lamp')).toHaveLength(1);
    expect(commandsOf(engine).filter((c) => c === 'drop lamp')).toHaveLength(1);
  });

  it('runs every root-to-leaf path, including a deep one', async () => {
    const tree = assembleTree([
      write('root', '', ['a']),
      write('mid', 'continues: root\n', ['b']),
      write('leaf1', 'continues: mid\n', ['c']),
      write('leaf2', 'continues: mid\n', ['d']),
      write('other', 'continues: root\n', ['e']),
    ]);
    const engine = stubEngine();
    const run = await runTree(tree, engine as never);

    expect(run.outcomes.filter((o) => o.status === 'ran').map((o) => o.stem)).toEqual([
      'root',
      'mid',
      'leaf1',
      'leaf2',
      'other',
    ]);
    // Each node's commands ran exactly once: 5 nodes, 1 command each.
    expect(run.executedCommands).toBe(5);
  });

  it('a linear tree is a chain — one continuous run, no restores between nodes\' commands', async () => {
    // D3: a chain is the linear case of the same mechanism. The engine must
    // see one continuous sequence, or Dungeo's pinned counts would shift.
    const tree = assembleTree([
      write('one', '', ['a']),
      write('two', 'continues: one\n', ['b']),
      write('three', 'continues: two\n', ['c']),
    ]);
    const engine = stubEngine();
    await runTree(tree, engine as never);

    expect(engine.executed.map((e) => e.from)).toEqual([
      'fresh',
      'fresh+a',
      'fresh+a+b',
    ]);
  });

  it('runs multiple roots independently', async () => {
    const tree = assembleTree([write('one', '', ['a']), write('two', '', ['b'])]);
    const engine = stubEngine();
    const run = await runTree(tree, engine as never);
    expect(run.outcomes.map((o) => o.stem)).toEqual(['one', 'two']);
  });

  it('a defective tree executes nothing (D11)', async () => {
    const tree = assembleTree([
      write('loop-a', 'continues: loop-b\n', ['a']),
      write('loop-b', 'continues: loop-a\n', ['b']),
    ]);
    const engine = stubEngine();
    const run = await runTree(tree, engine as never);

    expect(run.defects.length).toBeGreaterThan(0);
    expect(run.executedCommands).toBe(0);
    expect(engine.executed).toEqual([]);
    expect(run.outcomes).toEqual([]);
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

    const engine = stubEngine();
    const run = await runTree(tree, engine as never);

    const byStem = new Map(run.outcomes.map((o) => [o.stem, o]));
    expect(byStem.get('broken')!.status).toBe('ran');
    expect(byStem.get('broken')!.result!.status).not.toBe('passed');
    expect(byStem.get('under-broken')!.status).toBe('unreached');
    expect(byStem.get('under-broken')!.blockedBy).toBe('broken');
    // The healthy sibling still runs — one failure does not abandon the tree.
    expect(byStem.get('sibling')!.status).toBe('ran');
    expect(commandsOf(engine)).not.toContain('c');
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
    const engine = stubEngine();
    await runTree(tree, engine as never);

    // One reseed, for the one child that asked.
    expect(engine.reseeds).toEqual([['troll.blow']]);
  });
});
