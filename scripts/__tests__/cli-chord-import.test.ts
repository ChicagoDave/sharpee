/**
 * Tests for Chord `import` resolution in the bundle CLI (GH #352).
 *
 * `@sharpee/chord` is filesystem-free, so `import "<name>"` needs the host
 * to supply a resolver. Devkit's compose/test/play always did; the bundle's
 * `loadChordStory` compiled with none, so every imported story — including
 * the documented secret-letter command — failed the load-time gate with
 * `analysis.import-unresolved`. The bundle now shares devkit's resolver.
 *
 * Exercised end-to-end via `spawnSync` against the real compiled bundle: a
 * two-file story (a `.story` importing a `.chord` fragment that declares a
 * room) plays through `--exec` and `--test`, and a missing fragment still
 * fails by name.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');

const STORY = `story
  title: Import Probe
  authors:
    Tests
  id: import-probe
  story-version: 1.0.0

create the Den
  a room
  north to the Garden

  A small square den.

create Alex
  a person
  playable
  starts in the Den

  You.

before the game starts
  change the player to Alex
end before

import "garden"
`;

const FRAGMENT = `## The garden, declared in its own fragment.

create the Garden
  a room

  Roses everywhere, imported.
`;

const TRANSCRIPT = `title: Import probe
seed: 7
---

> north
[OK: contains "imported"]
`;

let dir: string;
let storyFile: string;
let transcriptFile: string;

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [BUNDLE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cli-chord-import-'));
  storyFile = join(dir, 'import-probe.story');
  transcriptFile = join(dir, 'import-probe.transcript');
  writeFileSync(storyFile, STORY, 'utf-8');
  writeFileSync(join(dir, 'garden.chord'), FRAGMENT, 'utf-8');
  writeFileSync(transcriptFile, TRANSCRIPT, 'utf-8');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('chord imports through the bundle CLI', () => {
  it('--exec resolves a fragment beside the .story and plays into the imported room', () => {
    const run = runCli(['--exec', 'north', '--story', storyFile, '--seed', '7']);
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('Roses everywhere, imported.');
    expect(run.stdout + run.stderr).not.toContain('import-unresolved');
  });

  it('--test runs a transcript against the imported story', () => {
    const run = runCli(['--test', transcriptFile, '--story', storyFile]);
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('1 passed');
  });

  it('a missing fragment still fails the load-time gate by name', () => {
    const missingDir = mkdtempSync(join(tmpdir(), 'cli-chord-import-missing-'));
    try {
      const missing = join(missingDir, 'import-probe.story');
      writeFileSync(missing, STORY, 'utf-8');
      const run = runCli(['--exec', 'look', '--story', missing, '--seed', '7']);
      expect(run.status).not.toBe(0);
      expect(run.stdout + run.stderr).toContain('import');
      expect(run.stdout + run.stderr).toContain('garden');
    } finally {
      rmSync(missingDir, { recursive: true, force: true });
    }
  });
});
