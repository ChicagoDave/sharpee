/**
 * tree-bless.test.ts — goldens as a tree operation (ADR-294 D1 × ADR-302 D8).
 *
 * A tree child declares no seed — it runs at its root's (`effectiveConfig`).
 * The golden tier used to judge a node by its DECLARED config, which refused
 * every child golden as unpinned; the tree runner now hands `runTranscript`
 * the node's resolved config, so blessing and replaying children works, and
 * a child's recording is a chain-member one: valid through the tree, refused
 * standalone (D7).
 *
 * Derived from the Behavior Statement: global `bless` records every authored
 * execution; `blessFiles` records only the named nodes; replays never record;
 * a child golden replays green through the tree and is refused flat.
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
import { runTranscript } from '../src/runner.js';
import { parseGoldenFile } from '../src/golden.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-bless-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Write a golden-shaped transcript (bare commands, no assertions). */
function golden(stem: string, header: string, commands: string[]) {
  const body = commands.map((c) => `> ${c}\n`).join('\n');
  const file = path.join(dir, `${stem}.transcript`);
  fs.writeFileSync(file, `title: ${stem}\n${header}---\n\n${body}`, 'utf-8');
  return parseTranscriptFile(file);
}

/** Write an assertion-tier transcript. */
function asserted(stem: string, header: string, commands: string[]) {
  const body = commands.map((c) => `> ${c}\n[OK: contains "ok"]\n`).join('\n');
  const file = path.join(dir, `${stem}.transcript`);
  fs.writeFileSync(file, `title: ${stem}\n${header}---\n\n${body}`, 'utf-8');
  return parseTranscriptFile(file);
}

const goldenPathOf = (stem: string) => path.join(dir, `${stem}.golden`);

/** Deterministic stub engine — same commands, same outputs, every boot. */
function stubGame() {
  return {
    executeCommand: async (command: string) => `ok: ${command}`,
    world: {},
    engine: {
      registerSaveRestoreHooks() {},
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
const factory = async () => stubGame();

describe('blessing a tree (ADR-294 D1 × ADR-302 D8)', () => {
  it('global bless records parent AND child, the child at the root session seed', async () => {
    const tree = assembleTree(
      [golden('root', 'seed: 42\n', ['look']), golden('leaf', 'continues: root\n', ['north'])],
      't',
    );
    const run = await runTree(tree, factory, { bless: true, storyName: 't' });

    expect(run.outcomes.map((o) => o.result?.status)).toEqual(['passed', 'passed']);
    expect(fs.existsSync(goldenPathOf('root'))).toBe(true);
    expect(fs.existsSync(goldenPathOf('leaf'))).toBe(true);
    // The child declared no seed; its recording carries the SESSION's — the
    // root's pin — which is what makes it replayable through the tree and a
    // chain-member standalone (D7).
    const recording = parseGoldenFile(goldenPathOf('leaf'));
    expect(recording.provenance.seed).toBe(42);
  });

  it('a blessed tree replays green end-to-end, children included', async () => {
    const tree = assembleTree(
      [golden('root', 'seed: 42\n', ['look']), golden('leaf', 'continues: root\n', ['north'])],
      't',
    );
    await runTree(tree, factory, { bless: true, storyName: 't' });

    // Files re-parsed as a fresh run would see them.
    const replayTree = assembleTree(
      [
        parseTranscriptFile(path.join(dir, 'root.transcript')),
        parseTranscriptFile(path.join(dir, 'leaf.transcript')),
      ],
      't',
    );
    const replay = await runTree(replayTree, factory, { storyName: 't' });

    expect(replay.outcomes.map((o) => o.result?.status)).toEqual(['passed', 'passed']);
    expect(replay.outcomes.map((o) => o.result?.tier)).toEqual(['golden', 'golden']);
  });

  it('blessFiles records ONLY the named node; the rest of the tree runs normally', async () => {
    const leaf = golden('leaf', 'continues: root\n', ['north']);
    const tree = assembleTree(
      [asserted('root', 'seed: 42\n', ['look']), leaf, asserted('other', 'continues: root\n', ['east'])],
      't',
    );
    const run = await runTree(tree, factory, {
      blessFiles: [leaf.filePath],
      storyName: 't',
    });

    expect(run.outcomes.every((o) => o.result?.status === 'passed')).toBe(true);
    expect(fs.existsSync(goldenPathOf('leaf'))).toBe(true);
    expect(fs.existsSync(goldenPathOf('root'))).toBe(false);
    expect(fs.existsSync(goldenPathOf('other'))).toBe(false);
    // The untouched nodes ran as what they are — assertion tier.
    const tiers = new Map(run.outcomes.map((o) => [o.stem, o.result?.tier]));
    expect(tiers.get('root')).toBe('assertion');
    expect(tiers.get('leaf')).toBe('golden');
    expect(tiers.get('other')).toBe('assertion');
  });

  it('a fork replays the blessed ancestor as a verification, and never re-records it', async () => {
    // root forks: alpha runs first (continuing the live engine), beta forces a
    // boot + replay of root. With global bless, root's authored execution
    // recorded a golden — so its REPLAY runs in replay mode against it, which
    // is reproducibility checked rather than a second recording.
    const tree = assembleTree(
      [
        golden('root', 'seed: 42\n', ['look']),
        golden('alpha', 'continues: root\n', ['take lamp']),
        golden('beta', 'continues: root\n', ['drop lamp']),
      ],
      't',
    );
    const run = await runTree(tree, factory, { bless: true, storyName: 't' });

    expect(run.outcomes.map((o) => o.result?.status)).toEqual(['passed', 'passed', 'passed']);
    expect(run.executedCommands).toBe(4); // 3 authored + root replayed once
    expect(fs.existsSync(goldenPathOf('alpha'))).toBe(true);
    expect(fs.existsSync(goldenPathOf('beta'))).toBe(true);
  });

  it('a child recording is a chain member: replaying it standalone is refused (D7)', async () => {
    const tree = assembleTree(
      [golden('root', 'seed: 42\n', ['look']), golden('leaf', 'continues: root\n', ['north'])],
      't',
    );
    await runTree(tree, factory, { bless: true, storyName: 't' });

    // Flat replay, no resolvedConfig: the transcript pins no seed of its own,
    // so the runner cannot know which session this recording belongs to.
    const standalone = await runTranscript(
      parseTranscriptFile(path.join(dir, 'leaf.transcript')),
      stubGame() as never,
      { storyName: 't' },
    );
    expect(standalone.status).toBe('error');
    expect(standalone.errorMessage).toContain('chain-member');
  });

  it('an unseeded root still refuses record mode with the D3 pin error', async () => {
    const tree = assembleTree([golden('root', '', ['look'])], 't');
    const run = await runTree(tree, factory, { bless: true, storyName: 't' });

    expect(run.outcomes[0].result?.status).toBe('error');
    expect(run.outcomes[0].result?.errorMessage).toContain('must pin a seed');
  });
});
