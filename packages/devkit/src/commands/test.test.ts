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

const STORY = `story "Mini" by "T"
  id: mini
  version: 0.0.1

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
});
