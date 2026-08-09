/**
 * tree-report.test.ts — ADR-302 D13: unreached is not failed.
 *
 * Covers **AC-7** — a tree with one broken interior node reports exactly ONE
 * failure and N unreached, with the originating node named.
 *
 * The whole run is real: real transcripts on disk, real parse, real assembly,
 * real `runTree` against a stub engine, then the real summary over its result.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseTranscriptFile } from '../src/parser.js';
import { assembleTree } from '../src/tree.js';
import { runTree } from '../src/tree-runner.js';
import { summarizeTreeRun, formatTreeRun } from '../src/tree-report.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-report-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A transcript whose assertions all hold against the stub. */
function ok(stem: string, header: string, commands: string[]) {
  const body = commands.map((c) => `> ${c}\n[OK: contains "ok"]\n`).join('\n');
  const file = path.join(dir, `${stem}.transcript`);
  fs.writeFileSync(file, `title: ${stem}\n${header}---\n\n${body}`, 'utf-8');
  return parseTranscriptFile(file);
}

/** A transcript whose assertion cannot hold — the stub only ever says "ok". */
function broken(stem: string, header: string) {
  const file = path.join(dir, `${stem}.transcript`);
  fs.writeFileSync(
    file,
    `title: ${stem}\n${header}---\n\n> x\n[OK: contains "impossible"]\n`,
    'utf-8',
  );
  return parseTranscriptFile(file);
}

/**
 * A fresh game per boot (D17): the walk asks for one per root and one per fork,
 * so this is a factory rather than a single engine.
 */
async function stubGame() {
  return {
    executeCommand: async () => 'ok',
    world: {},
    engine: {
      getMasterSeed: () => 42,
      getRandomService: () => ({
        reseedStreams() {},
        loadForces() {},
        clearForces() {},
        getForceReport: () => [],
        setPointSeedOverrides() {},
      }),
      setRandomTraceEnabled() {},
    },
  };
}

describe('tree run reporting (ADR-302 D13, AC-7)', () => {
  it('AC-7 — one broken interior node: exactly one failure, N unreached, origin named', async () => {
    // A spine break with four things hanging off it. Reporting those as
    // failures would bury the one thing that actually broke under a wall of
    // red proportional to how much of the story depends on it.
    const tree = assembleTree([
      ok('root', '', ['a']),
      broken('spine', 'continues: root\n'),
      ok('test1', 'continues: spine\n', ['b']),
      ok('test2', 'continues: spine\n', ['c']),
      ok('deep', 'continues: test1\n', ['d']),
      ok('deeper', 'continues: deep\n', ['e']),
    ]);
    expect(tree.defects).toEqual([]);

    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary.failed).toBe(1);
    expect(summary.unreached).toBe(4);
    expect(summary.blocked).toHaveLength(1);
    expect(summary.blocked[0].origin).toBe('spine');
    expect(summary.blocked[0].unreached.sort()).toEqual([
      'deep',
      'deeper',
      'test1',
      'test2',
    ]);
    expect(summary.ok).toBe(false);
  });

  it('the origin carries the failure\'s own message', async () => {
    const tree = assembleTree([ok('root', '', ['a']), broken('spine', 'continues: root\n')]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));
    expect(summary.blocked[0].error).toBeDefined();
  });

  it('a healthy sibling of a broken node still runs and still passes', async () => {
    const tree = assembleTree([
      ok('root', '', ['a']),
      broken('bad', 'continues: root\n'),
      ok('good', 'continues: root\n', ['b']),
    ]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary.failed).toBe(1);
    expect(summary.passed).toBe(2); // root + good
    expect(summary.unreached).toBe(0);
  });

  it('two independent breaks report as two origins, each with its own blast radius', async () => {
    const tree = assembleTree([
      ok('root', '', ['a']),
      broken('bad1', 'continues: root\n'),
      ok('under1', 'continues: bad1\n', ['b']),
      broken('bad2', 'continues: root\n'),
      ok('under2a', 'continues: bad2\n', ['c']),
      ok('under2b', 'continues: bad2\n', ['d']),
    ]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary.failed).toBe(2);
    expect(summary.unreached).toBe(3);
    const byOrigin = new Map(summary.blocked.map((g) => [g.origin, g.unreached.length]));
    expect(byOrigin.get('bad1')).toBe(1);
    expect(byOrigin.get('bad2')).toBe(2);
  });

  it('a leaf failure blocks nothing', async () => {
    const tree = assembleTree([ok('root', '', ['a']), broken('leaf', 'continues: root\n')]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary.failed).toBe(1);
    expect(summary.unreached).toBe(0);
    expect(summary.blocked[0].unreached).toEqual([]);
  });

  it('a clean run is ok, with nothing blocked', async () => {
    const tree = assembleTree([
      ok('root', '', ['a']),
      ok('alpha', 'continues: root\n', ['b']),
      ok('beta', 'continues: root\n', ['c']),
    ]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary).toMatchObject({ passed: 3, failed: 0, unreached: 0, ok: true });
    expect(summary.blocked).toEqual([]);
  });

  it('a malformed tree is not ok, and reports no run counts', async () => {
    const tree = assembleTree([
      ok('loop-a', 'continues: loop-b\n', ['a']),
      ok('loop-b', 'continues: loop-a\n', ['b']),
    ]);
    const summary = summarizeTreeRun(await runTree(tree, stubGame as never));

    expect(summary.ok).toBe(false);
    expect(summary.defects.length).toBeGreaterThan(0);
    expect(summary.passed).toBe(0);
    expect(summary.failed).toBe(0);
  });
});

describe('formatTreeRun', () => {
  it('names the origin and its blocked count on one line', async () => {
    const tree = assembleTree([
      ok('root', '', ['a']),
      broken('spine', 'continues: root\n'),
      ok('test1', 'continues: spine\n', ['b']),
      ok('test2', 'continues: spine\n', ['c']),
    ]);
    const lines = formatTreeRun(await runTree(tree, stubGame as never));
    const text = lines.join('\n');

    expect(text).toMatch(/✗ spine/);
    expect(text).toMatch(/blocked 2: test1, test2/);
    // The tally distinguishes the two, rather than folding unreached into failed.
    expect(text).toMatch(/1 passed, 1 failed, 2 unreached/);
  });

  it('renders defects alone for a malformed tree, with no run counts beside them', async () => {
    // "0 passed" beside a structural error invites reading it as a result.
    const tree = assembleTree([
      ok('loop-a', 'continues: loop-b\n', ['a']),
      ok('loop-b', 'continues: loop-a\n', ['b']),
    ]);
    const lines = formatTreeRun(await runTree(tree, stubGame as never));

    expect(lines[0]).toMatch(/Tree is malformed/);
    expect(lines.join('\n')).not.toMatch(/passed/);
  });

  it('a green run reports only its tally', async () => {
    const tree = assembleTree([ok('root', '', ['a']), ok('kid', 'continues: root\n', ['b'])]);
    const lines = formatTreeRun(await runTree(tree, stubGame as never));
    expect(lines).toEqual(['2 passed']);
  });
});

describe('skipped nodes in the report (phase-6 F1, ruling 2026-08-08)', () => {
  it('an empty node counts as skipped — never as a failure — and the run stays ok', async () => {
    const tree = assembleTree([ok('root', '', ['a']), ok('hollow', 'continues: root\n', [])]);
    const run = await runTree(tree, stubGame as never);
    const summary = summarizeTreeRun(run);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.ok).toBe(true);
    expect(formatTreeRun(run)).toEqual(['1 passed, 1 skipped (no commands yet)']);
  });
});
