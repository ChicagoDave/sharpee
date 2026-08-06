/**
 * test.test.ts — `sharpee test` behavior (REAL-PATH): a temp Chord author
 * project (root `.story` + tests/transcripts/) runs through the real
 * chord compile → story-loader → bootstrap → transcript-tester chain — no
 * stubs of any owned dependency. Exit codes follow transcript-tester's
 * convention (0 pass / 1 fail / 2 usage / 3 load error).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runTestCommand } from './test.js';
import { findStoryFile, loadAuthorGame } from '../standalone/author-game.js';

const STORY = `story
  title: Mini
  authors: T
  id: mini
  story-version: 0.0.1

create the Den
  a room

  A small square den.

create the brass lamp
  in the Den

  It gleams dully.

create the player
  starts in the Den

  You.
`;

const PASSING_TRANSCRIPT = `title: Mini smoke
---

> look
[OK: contains "A small square den"]

> examine the brass lamp
[OK: contains "gleams dully"]
`;

const FAILING_TRANSCRIPT = `title: Mini failing
---

> look
[OK: contains "text that the story never prints"]
`;

let projectDir: string;

beforeAll(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'devkit-test-cmd-'));
  writeFileSync(join(projectDir, 'mini.story'), STORY);
  mkdirSync(join(projectDir, 'tests', 'transcripts'), { recursive: true });
  writeFileSync(join(projectDir, 'tests', 'transcripts', 'smoke.transcript'), PASSING_TRANSCRIPT);
});

afterAll(() => rmSync(projectDir, { recursive: true, force: true }));

/** Silence the runner's console reporting; return captured text. */
function muted<T>(fn: () => Promise<T>): Promise<{ code: T; out: string; err: string }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  return fn()
    .then((code) => ({
      code,
      out: log.mock.calls.map((c) => c.join(' ')).join('\n'),
      err: error.mock.calls.map((c) => c.join(' ')).join('\n'),
    }))
    .finally(() => {
      log.mockRestore();
      error.mockRestore();
    });
}

describe('sharpee test (author project, Chord source)', () => {
  it('runs the project transcripts against the REAL compiled story and passes (exit 0)', async () => {
    const { code, out } = await muted(() => runTestCommand([projectDir]));
    expect(code).toBe(0);
    expect(out).toContain('1 transcript(s)');
  });

  it('a failing expectation exits 1 — the assertion is grounded in real output', async () => {
    const failing = join(projectDir, 'failing.transcript');
    writeFileSync(failing, FAILING_TRANSCRIPT);
    try {
      const { code } = await muted(() => runTestCommand([projectDir, failing]));
      expect(code).toBe(1);
    } finally {
      rmSync(failing);
    }
  });

  it('a .story gate error exits 3 with the diagnostic on stderr', async () => {
    const broken = mkdtempSync(join(tmpdir(), 'devkit-test-broken-'));
    try {
      writeFileSync(join(broken, 'broken.story'), STORY.replace('starts in the Den', 'starts in the Attic'));
      mkdirSync(join(broken, 'tests'), { recursive: true });
      writeFileSync(join(broken, 'tests', 'smoke.transcript'), PASSING_TRANSCRIPT);
      const { code, err } = await muted(() => runTestCommand([broken]));
      expect(code).toBe(3);
      expect(err).toContain('analysis.unknown-entity');
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }
  });

  it('no transcripts found exits 2', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'devkit-test-empty-'));
    try {
      writeFileSync(join(empty, 'mini.story'), STORY);
      const { code } = await muted(() => runTestCommand([empty]));
      expect(code).toBe(2);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('unknown flags exit 2 with usage', async () => {
    const { code, err } = await muted(() => runTestCommand(['--frobnicate']));
    expect(code).toBe(2);
    expect(err).toContain('usage:');
  });
});

describe('sharpee test --tree (ADR-302 tree run)', () => {
  let treeDir: string;

  beforeAll(() => {
    // A separate project: the flat suite above scans the same tests/ subtree,
    // and a `continues:` file there would change what THAT suite runs.
    treeDir = mkdtempSync(join(tmpdir(), 'devkit-test-tree-'));
    writeFileSync(join(treeDir, 'mini.story'), STORY);
    mkdirSync(join(treeDir, 'tests', 'transcripts'), { recursive: true });
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'spine.transcript'),
      `title: Spine\nseed: 42\n\n---\n\n> look\n[OK: contains "A small square den"]\n`,
    );
    // Two children off one parent: the prefix runs once for the first and is
    // REPLAYED for the second (D17), which is what the tally must show.
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'lamp.transcript'),
      `title: Lamp\ncontinues: spine\n\n---\n\n> examine the brass lamp\n[OK: contains "gleams dully"]\n`,
    );
    writeFileSync(
      join(treeDir, 'tests', 'transcripts', 'den.transcript'),
      `title: Den again\ncontinues: spine\n\n---\n\n> look\n[OK: contains "A small square den"]\n`,
    );
  });

  afterAll(() => rmSync(treeDir, { recursive: true, force: true }));

  it('runs every root-to-leaf path against the REAL compiled story and passes (exit 0)', async () => {
    const { code, out } = await muted(() => runTestCommand([treeDir, '--tree']));

    expect(code).toBe(0);
    // 3 nodes ran, and the second child replayed the parent's one command
    // rather than the parent running twice — the D17 arithmetic, asserted.
    expect(out).toContain('3 passed');
    expect(out).toMatch(/4 commands \(3 authored \+ 1 replayed\)/);
  });

  it('reports a dangling parent as a tree defect and executes nothing (exit 2)', async () => {
    const orphanDir = mkdtempSync(join(tmpdir(), 'devkit-test-orphan-'));
    try {
      writeFileSync(join(orphanDir, 'mini.story'), STORY);
      mkdirSync(join(orphanDir, 'tests', 'transcripts'), { recursive: true });
      writeFileSync(
        join(orphanDir, 'tests', 'transcripts', 'orphan.transcript'),
        `title: Orphan\ncontinues: nonexistent\n\n---\n\n> look\n[OK: contains "den"]\n`,
      );

      const { code, err } = await muted(() => runTestCommand([orphanDir, '--tree']));

      expect(code).toBe(2);
      expect(err).toContain('nonexistent');
    } finally {
      rmSync(orphanDir, { recursive: true, force: true });
    }
  });

  it('rejects --tree with --chain rather than silently picking one (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([treeDir, '--tree', '--chain']));

    expect(code).toBe(2);
    expect(err).toContain('mutually exclusive');
  });

  it('refuses --tree with --json while the record stream carries no parentage (exit 2)', async () => {
    const { code, err } = await muted(() => runTestCommand([treeDir, '--tree', '--json']));

    expect(code).toBe(2);
    expect(err).toContain('does not yet carry tree records');
  });
});

describe('author-game story resolution', () => {
  it('finds the single root .story; two is a named error, never a guess', () => {
    expect(findStoryFile(projectDir)).toBe(join(projectDir, 'mini.story'));
    const second = join(projectDir, 'other.story');
    writeFileSync(second, STORY);
    try {
      expect(() => findStoryFile(projectDir)).toThrow(/2 \.story files/);
    } finally {
      rmSync(second);
    }
  });

  it('loadAuthorGame assembles a playable game from the .story (REAL executeCommand)', async () => {
    const game = await loadAuthorGame(projectDir);
    const output = await game.executeCommand('examine the brass lamp');
    expect(output).toContain('gleams dully');
  });

  it('loadAuthorGame threads the seed to the engine AND the chord evaluator (ADR-293 D1)', async () => {
    // The engine half: the session's master seed is the injected one.
    const game = await loadAuthorGame(projectDir, { seed: 4242 });
    expect(
      (game.engine as { getMasterSeed?: () => number }).getMasterSeed?.(),
    ).toBe(4242);

    // The chord half: two same-seed sessions produce identical outputs for
    // the same commands — a clock-seeded evaluator stream would diverge on
    // chance-gated prose. (Asserted on real executeCommand output, not on
    // internals, so the pin survives loader refactors.)
    const twin = await loadAuthorGame(projectDir, { seed: 4242 });
    for (const cmd of ['wait', 'wait', 'wait', 'look']) {
      expect(await twin.executeCommand(cmd)).toBe(await game.executeCommand(cmd));
    }
  });
});
